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
}
