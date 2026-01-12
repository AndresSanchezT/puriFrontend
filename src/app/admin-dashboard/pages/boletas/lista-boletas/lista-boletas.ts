import { Component, computed, inject, signal } from '@angular/core';
import { BoletaService } from '../../../../services/boleta-service';
import { Boleta } from '../../../../models/boleta.interface';
import { EstadoBoleta } from '../../../../models/responses/response-estado.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-boletas',
  imports: [CommonModule],
  templateUrl: './lista-boletas.html',
  styleUrls: ['./lista-boletas.css'],
})
export class ListaBoletas {
  boletaService = inject(BoletaService);
  boletas = signal<Boleta[]>([]);
  loading = signal(false);
  error = signal('');
  succes = signal('');
  searchTerm = signal('');
  filtroEstado = signal('todos');
  showModal = signal(false);
  modalType = signal('');
  boletaSeleccionada = signal<Boleta | null>(null);
  motivoAnulacion = signal('');
  processing = signal(false);
  cargandoPDF = signal(false);

  constructor() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading.set(true);
    this.boletaService.getAll().subscribe({
      next: (data) => {
        this.boletas.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error cargando boletas');
        this.loading.set(false);
      },
    });
  }

  readonly datosFiltrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const estado = this.filtroEstado();
    const boletas = this.boletas();

    return boletas.filter((b) => {
      const coincideBusqueda =
        !term ||
        b.pedido.cliente?.nombreContacto?.toLowerCase().includes(term) ||
        b.pedido.id?.toString().includes(term) ||
        b.codigo.toLowerCase().includes(term);

      const coincideEstado = estado === 'todos' || b.estado === estado;
      return coincideBusqueda && coincideEstado;
    });
  });

  boletasRegistradas = computed(() => this.boletas().filter((b) => b.estado === 'EMITIDA').length);
  boletasEmitidas = computed(() => this.boletas().filter((b) => b.estado === 'PAGADO').length);
  boletasAnuladas = computed(() => this.boletas().filter((b) => b.estado === 'ANULADO').length);

  handleOpenModal(boleta: Boleta, type: string) {
    this.boletaSeleccionada.set(boleta);
    this.modalType.set(type);
    this.showModal.set(true);
    this.motivoAnulacion.set('');
    this.error.set('');
  }

  handleActualizarEstado(id: number, info: EstadoBoleta) {
    this.processing.set(true);
    this.error.set('');

    this.boletaService.actualizarEstadoBoleta(id, info).subscribe({
      next: (msg) => {
        this.succes.set(msg);
        this.processing.set(false);

        // 🔹 Cerrar modal
        this.showModal.set(false);

        // 🔹 Actualizar la boleta dentro del signal
        this.boletas.update((lista) =>
          lista.map((b) =>
            b.id === id ? { ...b, estado: info.nuevoEstado, motivoAnulacion: info.informacion } : b
          )
        );
      },
      error: (err) => {
        this.error.set(err || 'No se puedo actualizar el estado');
        this.processing.set(false);
      },
    });
  }
  genererBoleta(id: number) {
    this.processing.set(true);
    this.boletaService.generarBoleta(id).subscribe({
      next: (response) => {
        const blob = response.body!;
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.processing.set(false);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (error) => {
        console.error('Error al generar boleta:', error);
        this.processing.set(false);
      },
    });
  }

  // Alternativa: Previsualizar PDF en modal
  // previsualizarBoleta(boletaId: number): void {
  //   this.cargandoPDF = true;

  //   this.boletaService.generarBoleta(boletaId).subscribe({
  //     next: (blob: Blob) => {
  //       const url = window.URL.createObjectURL(blob);
  //       // Aquí puedes abrir un modal con un iframe
  //       // this.abrirModalPDF(url);
  //       this.cargandoPDF = false;
  //     },
  //     error: (error) => {
  //       console.error('Error al generar boleta:', error);
  //       this.cargandoPDF = false;
  //     },
  //   });
  // }
}
