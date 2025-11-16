import { Component, inject, signal } from '@angular/core';
import { PedidoService } from '../../../../services/pedido-service';
import { Pedido } from '../../../../models/pedido.interface';
import { CommonModule } from '@angular/common';
import {DatosProductoConsolidado } from '../../../../models/responses/response-consolidado.interface';

@Component({
  selector: 'app-generar-reportes',
  imports: [CommonModule],
  templateUrl: './generar-reportes.html',
  styleUrls: ['./generar-reportes.css'],
})
export class GenerarReportes {
  pedidoService = inject(PedidoService);

  datosProductoConsolidado = signal<DatosProductoConsolidado[]>([]);
  error = signal('');
  tipoReporte = signal('');
  fechaInicio = signal('');
  fechaFin = signal('');
  datos = signal('');
  showModal = signal(false);

  productos = signal([]);

  loading = signal(false);

  constructor() {
    this.cargarDatosPedidos();
  }

  cargarDatosPedidos() {
    this.loading.set(true);
    this.pedidoService.getDatosConsolidado().subscribe({
      next: (res) => {
        this.datosProductoConsolidado.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error cargando datos');
        this.loading.set(false);
      },
    });
  }

  generarReporte() {}

  exportarAExcel() {}

  exportarAPDF() {}

  getTituloReporte() {}

  renderTabla() {}
  generarConsolidado() {
    this.showModal.set(true);
  }
}
