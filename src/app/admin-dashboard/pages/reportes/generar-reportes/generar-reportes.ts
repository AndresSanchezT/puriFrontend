import jsPDF from 'jspdf';
import { Component, computed, inject, signal } from '@angular/core';
import { PedidoService } from '../../../../services/pedido-service';
import { CommonModule } from '@angular/common';
import { forkJoin, tap } from 'rxjs';
import { DatosProductoConsolidado } from '../../../../models/responses/response-consolidado.interface';
import { ProductoFaltante } from '../../../../models/responses/pedido-faltante.interface';
import Swal from 'sweetalert2';
import { Pedido } from '../../../../models/pedido.interface';
import { Usuario } from '../../../../models/usuario.interface';
import { VendedorService } from '../../../../services/vendedor-service';

@Component({
  selector: 'app-generar-reportes',
  imports: [CommonModule],
  templateUrl: './generar-reportes.html',
  styleUrls: ['./generar-reportes.css'],
})
export class GenerarReportes {
  pedidoService = inject(PedidoService);
  vendedorService = inject(VendedorService);

  datosProductoConsolidado = signal<DatosProductoConsolidado[]>([]);
  productosFaltantes = signal<ProductoFaltante[]>([]);

  pedidosAgrupados = new Map<number | 'SIN_REPARTIDOR', Pedido[]>();

  error = signal('');
  tipoReporte = signal('');
  fechaInicio = signal('');
  fechaFin = signal('');
  datos = signal<any[]>([]);
  showModal = signal(false);

  pedidosHoy = signal<Pedido[]>([]);
  pedidosManana = signal<Pedido[]>([]);
  vendedores = signal<Usuario[]>([]);

  loading = signal(false);
  loadingConsolidado = signal(false);

  constructor() {
    this.fetchPedidosHoy();
    this.fetchPedidosManana();
    this.fetchVendedores();
  }

  // ==============================
  // COMBINAR CONSOLIDADO + FALTANTES
  // ==============================
  consolidadoConFaltantes = computed(() => {
    const faltantesMap = new Map(
      this.productosFaltantes().map((f) => [f.nombreProducto.toLowerCase(), f.cantidadFaltante]),
    );

    return this.datosProductoConsolidado().map((p) => ({
      ...p,
      cantidadFaltante: faltantesMap.get(p.nombreProducto.toLowerCase()) ?? 0,
    }));
  });

  private fetchPedidosHoy() {
    this.loading.set(true);
    this.pedidoService.getPedidosTotalesHoy().subscribe({
      next: (res) => {
        this.pedidosHoy.set(res ?? []);
        this.loading.set(false);
        console.log(res);
      },
      error: () => {
        this.error.set('Error al cargar pedidos');
        this.loading.set(false);
      },
    });
  }

  private fetchPedidosManana() {
    this.loading.set(true);
    this.pedidoService.getPedidosTotalesManana().subscribe({
      next: (res) => {
        this.pedidosManana.set(res ?? []);
        this.loading.set(false);
        console.log(res);
      },
      error: () => {
        this.error.set('Error al cargar pedidos');
        this.loading.set(false);
      },
    });
  }

  private fetchVendedores() {
    this.loading.set(true);
    this.vendedorService.getAll().subscribe({
      next: (res) => {
        this.vendedores.set(res ?? []);
        this.loading.set(false);
        console.log(res);
      },
      error: () => {
        this.error.set('Error al cargar vendedores');
        this.loading.set(false);
      },
    });
  }

  // ==============================
  // ABRIR MODAL Y CARGAR DATOS
  // ==============================
  generarConsolidado() {
    this.showModal.set(true);
    this.error.set('');
    this.loadingConsolidado.set(true);

    forkJoin({
      consolidado: this.pedidoService.getDatosConsolidadoDeManana(),
      faltantes: this.pedidoService.getFaltantes(),
    }).subscribe({
      next: ({ consolidado, faltantes }) => {
        this.datosProductoConsolidado.set(consolidado ?? []);
        this.productosFaltantes.set(faltantes ?? []);
        this.loadingConsolidado.set(false);
      },
      error: (err) => {
        this.loadingConsolidado.set(false);
        this.error.set('Error cargando datos del consolidado');
      },
    });
  }

  // ==============================
  // GENERAR REPORTE GENERAL
  // ==============================

  resetearProductosFaltantes() {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción reseteará todos los productos faltantes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.pedidoService.resetearProductosFaltantes().subscribe(() => {
          Swal.fire({
            icon: 'success',
            title: 'Faltantes reseteados',
            text: 'Los productos faltantes fueron eliminados correctamente.',
            confirmButtonText: 'OK',
          });
        });
      }
    });
  }

  exportarAPDF(tipo: 'hoy' | 'manana' = 'hoy') {

  // =========================
  // OBTENER PEDIDOS
  // =========================
  const pedidos = (tipo === 'hoy' ? this.pedidosHoy() : this.pedidosManana()).sort((a, b) => {
    const nombreA = (a.cliente?.nombreContacto ?? '').toLowerCase();
    const nombreB = (b.cliente?.nombreContacto ?? '').toLowerCase();
    return nombreA.localeCompare(nombreB);
  });

  if (!pedidos || pedidos.length === 0) {
    Swal.fire('Sin datos', 'No hay pedidos para generar el PDF', 'warning');
    return;
  }

  // =========================
  // AGRUPAR PEDIDOS POR REPARTIDOR
  // =========================
  const pedidosAgrupados = new Map<number | 'SIN_REPARTIDOR', Pedido[]>();

  pedidos.forEach((pedido) => {
    const key = pedido.idRepartidor ?? 'SIN_REPARTIDOR';

    if (!pedidosAgrupados.has(key)) {
      pedidosAgrupados.set(key, []);
    }

    pedidosAgrupados.get(key)!.push(pedido);
  });

  // =========================
  // CONFIG PDF
  // =========================
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const rowHeight = 8;
  let y = 20;

  // Fecha
  const fecha = new Date();
  if (tipo === 'manana') fecha.setDate(fecha.getDate() + 1);

  const fechaFormateada = fecha.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // =========================
  // CHECK Y X
  // =========================
  const dibujarCheck = (x: number, y: number) => {
    doc.setDrawColor(0, 128, 0);
    doc.setLineWidth(0.4);
    doc.line(x, y - 1, x + 1, y);
    doc.line(x + 1, y, x + 3, y - 2.5);
  };

  const dibujarX = (x: number, y: number) => {
    doc.setDrawColor(255, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(x, y - 2, x + 2.5, y);
    doc.line(x + 2.5, y - 2, x, y);
  };

  // =========================
  // COLUMNAS
  // =========================
  const cols = {
    numero: 6,
    cliente: 10,
    repartidor: 55,
    efectivo: 85,
    yapePlin: 110,
    credito1: 135,
    credito2: 157,
    credito3: 179,
    pagado: 200,
  };

  const dibujarLineasVerticales = (yInicio: number, yFin: number) => {
    doc.setLineWidth(0.2);
    doc.setDrawColor(150, 150, 150);
    Object.values(cols).slice(1).forEach(x => {
      doc.line(x - 2, yInicio, x - 2, yFin);
    });
  };

  const headers = [
    { text: '#', x: cols.numero },
    { text: 'CLIENTE', x: cols.cliente },
    { text: 'REP.', x: cols.repartidor },
    { text: 'EFECT.', x: cols.efectivo },
    { text: 'Y/P', x: cols.yapePlin },
    { text: 'CRÉDITOS', x: cols.credito1 + 21 },
    { text: 'PAG.', x: cols.pagado },
  ];

  // =========================
  // ENCABEZADO DE CADA HOJA
  // =========================
  const dibujarEncabezadoPagina = (titulo: string, total: number) => {
    y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('HOJA DE CUADRE BOLETAS', margin, 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, margin, 15);

    doc.text(`Fecha: ${fechaFormateada}`, pageWidth - margin, 10, { align: 'right' });
    doc.text(`Total de boletas: ${total}`, pageWidth - margin, 15, { align: 'right' });

    y = 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    headers.forEach(h => doc.text(h.text, h.x, y));
    doc.line(margin, y + 1, pageWidth - margin, y + 1);
    dibujarLineasVerticales(y - 4, y + 1);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
  };

  // =========================
  // RECORRER GRUPOS
  // =========================
  let primeraPagina = true;

  for (const [key, lista] of pedidosAgrupados.entries()) {


    if (!primeraPagina) doc.addPage();
    primeraPagina = false;

    const titulo =
      key === 'SIN_REPARTIDOR'
        ? 'Pedidos SIN repartidor asignado'
        : `Repartidor: ${this.obtenerNombreVendedor(key as number)}`;

    dibujarEncabezadoPagina(titulo, lista.length);

    let contador = 1;

    lista.forEach((pedido) => {

      if (y > pageHeight - margin - 10) {
        doc.addPage();
        dibujarEncabezadoPagina(titulo, lista.length);
      }

      const yInicio = y - 4;

      const cliente = pedido.cliente?.nombreContacto ?? '-';
      const repartidor = this.obtenerNombreVendedor(pedido.idRepartidor);

      const efectivo = Number(pedido.efectivo ?? 0);
      const yape = Number(pedido.yape ?? 0);
      const plin = Number(pedido.plin ?? 0);
      const credito = Number(pedido.credito ?? 0);

      let yapePlin = '';
      if (yape > 0 && plin > 0) yapePlin = `${yape}Y-${plin}P`;
      else if (yape > 0) yapePlin = `${yape}Y`;
      else if (plin > 0) yapePlin = `${plin}P`;

      doc.text(contador.toString(), cols.numero, y);
      doc.text(cliente, cols.cliente, y, { maxWidth: 40 });
      doc.text(repartidor, cols.repartidor, y, { maxWidth: 25 });
      doc.text(efectivo > 0 ? efectivo.toFixed(2) : '', cols.efectivo, y);
      doc.text(yapePlin, cols.yapePlin, y);

      credito === 0 ? dibujarCheck(cols.pagado, y) : dibujarX(cols.pagado, y);

      const yFin = y + 2;
      dibujarLineasVerticales(yInicio, yFin);
      doc.line(margin, yFin, pageWidth - margin, yFin);

      y += rowHeight;

      contador++;
    });
  }

  // =========================
  // ABRIR PDF
  // =========================
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

  getTituloReporte() {
    const titulos: Record<string, string> = {
      'ventas-periodo': 'Ventas por Periodo',
      'ventas-vendedor': 'Ventas por Vendedor',
      'productos-vendidos': 'Productos Más Vendidos',
      clientes: 'Reporte de Clientes',
      boletas: 'Boletas Emitidas',
    };
    return titulos[this.tipoReporte()] || 'Reporte';
  }

  private obtenerNombreVendedor(idRepartidor: number | null | undefined): string {
    if (!idRepartidor) return '-';

    const vendedor = this.vendedores().find((v) => v.id === idRepartidor);
    return vendedor?.nombre ?? '-';
  }

  generarPDFListaProductos() {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const productos = this.datosProductoConsolidado();

    if (productos.length === 0) {
      alert('No hay productos para imprimir');
      return;
    }

    // Configuración optimizada para 50 productos
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const lineHeight = 5;
    const encabezadoY = 21;
    const startY = 26;
    let yPosition = startY;

    // Función para dibujar encabezado
    const dibujarEncabezado = () => {
      const xInicio = margin;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      // ✅ Sin columna #
      doc.text('TOTAL', xInicio, encabezadoY);
      doc.text('NOMBRE DEL PRODUCTO', xInicio + 14, encabezadoY);
      doc.text('CANTIDADES', xInicio + 68, encabezadoY);

      // Línea debajo del encabezado
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(xInicio, encabezadoY + 1, pageWidth - margin, encabezadoY + 1);
    };

    // Encabezado principal
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSOLIDADO DE PRODUCTOS', pageWidth / 2, 8, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Añadir un día a la fecha
    const fechaActual = new Date();
    fechaActual.setDate(fechaActual.getDate() + 1);

    const fecha = fechaActual.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Fecha: ${fecha}`, pageWidth / 2, 13, { align: 'center' });
    doc.text(`Total productos: ${productos.length}`, pageWidth / 2, 17, { align: 'center' });

    // Dibujar encabezado de columnas en la primera página
    dibujarEncabezado();

    // Función para dibujar casillas con cantidades
    const dibujarCasillas = (x: number, y: number, cantidades: number[]) => {
      const casillaTamano = 4.5;
      const espaciado = 0.15;
      const maxCasillas = 30; // ✅ Aumentado a 30
      let xActual = x;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      const cantidadesLimitadas = cantidades.slice(0, maxCasillas);

      cantidadesLimitadas.forEach((cantidad) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(xActual, y - 3, casillaTamano, 3.5);

        const textoAncho = doc.getTextWidth(cantidad.toString());
        const xTexto = xActual + (casillaTamano - textoAncho) / 2;
        doc.text(cantidad.toString(), xTexto, y - 0.5);

        xActual += casillaTamano + espaciado;
      });
    };

    // Dibujar productos
    productos.forEach((producto, index) => {
      const xInicio = margin;

      // Verificar si necesita nueva página
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = startY;
        dibujarEncabezado();
      }

      // ✅ SIN número de línea

      // Total en cuadro negro
      const totalTexto = producto.totalProductos.toString();
      const totalAncho = doc.getTextWidth(totalTexto);
      const cuadroAncho = Math.max(totalAncho + 2, 6);
      const cuadroAltura = 3.5;

      doc.setFillColor(0, 0, 0);
      doc.rect(xInicio, yPosition - 3, cuadroAncho, cuadroAltura, 'F'); // ✅ Empieza en xInicio

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const xTextoTotal = xInicio + (cuadroAncho - totalAncho) / 2;
      doc.text(totalTexto, xTextoTotal, yPosition - 0.5);

      doc.setTextColor(0, 0, 0);

      // Nombre del producto
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const maxNombreWidth = 60; // ✅ Aumentado un poco
      let nombreProducto = producto.nombreProducto;

      while (doc.getTextWidth(nombreProducto) > maxNombreWidth && nombreProducto.length > 0) {
        nombreProducto = nombreProducto.slice(0, -1);
      }
      if (nombreProducto.length < producto.nombreProducto.length) {
        nombreProducto += '...';
      }

      doc.text(nombreProducto, xInicio + cuadroAncho + 1, yPosition); // ✅ Ajustado

      // Verificar si es KGR o MLD y tiene cantidades individuales
      const esKgrOMld = ['KGR', 'MLD', 'KG'].includes(producto.unidadMedida?.toUpperCase());

      if (esKgrOMld && producto.cantidadesPorPedido) {
        const cantidades = producto.cantidadesPorPedido
          .split(',')
          .map((c) => parseFloat(c.trim()))
          .filter((c) => !isNaN(c));

        if (cantidades.length > 0) {
          dibujarCasillas(xInicio + 68, yPosition, cantidades); // ✅ Movido más a la izquierda
        }
      }

      // Línea separadora
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(xInicio, yPosition + 1, pageWidth - margin, yPosition + 1);

      yPosition += lineHeight;
    });

    // Abrir PDF en nueva pestaña
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }
}
