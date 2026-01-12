import jsPDF from 'jspdf';
import { Component, computed, inject, signal } from '@angular/core';
import { PedidoService } from '../../../../services/pedido-service';
import { CommonModule } from '@angular/common';
import { forkJoin, tap } from 'rxjs';
import { DatosProductoConsolidado } from '../../../../models/responses/response-consolidado.interface';
import { ProductoFaltante } from '../../../../models/responses/pedido-faltante.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-generar-reportes',
  imports: [CommonModule],
  templateUrl: './generar-reportes.html',
  styleUrls: ['./generar-reportes.css'],
})
export class GenerarReportes {
  pedidoService = inject(PedidoService);

  datosProductoConsolidado = signal<DatosProductoConsolidado[]>([]);
  productosFaltantes = signal<ProductoFaltante[]>([]);

  error = signal('');
  tipoReporte = signal('');
  fechaInicio = signal('');
  fechaFin = signal('');
  datos = signal<any[]>([]);
  showModal = signal(false);

  loading = signal(false);
  loadingConsolidado = signal(false);

  constructor() {}

  // ==============================
  // COMBINAR CONSOLIDADO + FALTANTES
  // ==============================
  consolidadoConFaltantes = computed(() => {
    const faltantesMap = new Map(
      this.productosFaltantes().map((f) => [f.nombreProducto.toLowerCase(), f.cantidadFaltante])
    );

    return this.datosProductoConsolidado().map((p) => ({
      ...p,
      cantidadFaltante: faltantesMap.get(p.nombreProducto.toLowerCase()) ?? 0,
    }));
  });

  // ==============================
  // ABRIR MODAL Y CARGAR DATOS
  // ==============================
  generarConsolidado() {
    this.showModal.set(true);
    this.error.set('');
    this.loadingConsolidado.set(true);

    forkJoin({
      consolidado: this.pedidoService.getDatosConsolidado(),
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
  generarReporte() {
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.datos.set([{ ejemplo: 'dato' }]);
    }, 1000);
  }

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
  exportarAExcel() {
    console.log('Exportando a Excel...');
  }

  exportarAPDF() {
    console.log('Exportando a PDF...');
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
    const margin = 10; // Reducido de 15 a 10
    const lineHeight = 5; // Reducido de 9 a 5
    const startY = 20; // Reducido de 40 a 20
    let yPosition = startY;

    // Encabezado más compacto
    doc.setFontSize(14); // Reducido de 18 a 14
    doc.setFont('helvetica', 'bold');
    doc.text('CONSOLIDADO DE PRODUCTOS', pageWidth / 2, 8, { align: 'center' });

    doc.setFontSize(10); // Reducido de 10 a 8
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Fecha: ${fecha}`, pageWidth / 2, 13, { align: 'center' });
    doc.text(`Total productos: ${productos.length}`, pageWidth / 2, 17, { align: 'center' });

    // Función para dibujar casillas con cantidades
    const dibujarCasillas = (x: number, y: number, cantidades: number[]) => {
      const casillaTamano = 5;
      const espaciado = 0.2;
      const maxCasillas = 28;
      let xActual = x;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      const cantidadesLimitadas = cantidades.slice(0, maxCasillas);

      cantidadesLimitadas.forEach((cantidad) => {
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.2);
        doc.rect(xActual, y - 3, casillaTamano, 3.5); // Altura reducida

        const textoAncho = doc.getTextWidth(cantidad.toString());
        const xTexto = xActual + (casillaTamano - textoAncho) / 2;
        doc.text(cantidad.toString(), xTexto, y - 0.5);

        xActual += casillaTamano + espaciado;
      });
    };

    // Dibujar productos
    productos.forEach((producto, index) => {
      // Verificar si necesita nueva página - más espacio disponible
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = startY;
      }

      const xInicio = margin;

      // Número de línea
      doc.setFontSize(10); // Reducido de 10 a 8
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, xInicio, yPosition);

      // Nombre del producto
      doc.setFontSize(10); // Reducido de 10 a 8
      doc.setFont('helvetica', 'normal');
      const maxNombreWidth = 50;
      let nombreProducto = producto.nombreProducto;

      while (doc.getTextWidth(nombreProducto) > maxNombreWidth && nombreProducto.length > 0) {
        nombreProducto = nombreProducto.slice(0, -1);
      }
      if (nombreProducto.length < producto.nombreProducto.length) {
        nombreProducto += '...';
      }

      doc.text(nombreProducto, xInicio + 5, yPosition);

      // Verificar si es KGR o MLD y tiene cantidades individuales
      const esKgrOMld = ['KGR', 'MLD', 'KG'].includes(producto.unidadMedida?.toUpperCase());

      if (esKgrOMld && producto.cantidadesPorPedido) {
        const cantidades = producto.cantidadesPorPedido
          .split(',')
          .map((c) => parseFloat(c.trim()))
          .filter((c) => !isNaN(c));

        if (cantidades.length > 0) {
          dibujarCasillas(xInicio + 58, yPosition, cantidades);
        }
      }

      // Total siempre en la misma posición
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10); // Reducido de 10 a 8
      const totalTexto = producto.totalProductos.toString();
      const totalAncho = doc.getTextWidth(totalTexto);
      doc.text(totalTexto, pageWidth - margin - totalAncho, yPosition);

      // Línea separadora más delgada
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.05);
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
