import { VisitaService } from './../../../../services/visita-service';
import { Component, computed, inject, signal } from '@angular/core';
import { Visita } from '../../../../models/visita.interface';
import { Cliente } from '../../../../models/cliente.interface';
import { Usuario } from '../../../../models/usuario.interface';
import { ClienteService } from '../../../../services/cliente-service';
import { VendedorService } from '../../../../services/vendedor-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-visitas',
  imports: [FormsModule, CommonModule],
  templateUrl: './lista-visitas.html',
  styleUrls: ['./lista-visitas.css'],
})
export class ListaVisitas {
  private readonly visitaService = inject(VisitaService);
  private readonly clienteService = inject(ClienteService);
  private readonly vendedorService = inject(VendedorService);

  readonly visitas = signal<Visita[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly searchTerm = signal('');
  readonly filtroEstado = signal<'todos' | string>('todos');
  readonly showModal = signal(false);

  constructor() {
    this.cargarDatosIniciales();
  }

  /** Carga inicial de todos los datos necesarios */
  private cargarDatosIniciales() {
    this.fetchPedidos();
    this.fetchClientes();
  }

  /** Carga de pedidos desde el backend */
  private fetchPedidos() {
    this.loading.set(true);
    this.visitaService.getAll().subscribe({
      next: (res) => {
        this.visitas.set(res ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar pedidos');
        this.loading.set(false);
      },
    });
  }

  /** Carga de clientes */
  private fetchClientes() {
    this.clienteService.getAll().subscribe({
      next: (res) => this.clientes.set(res ?? []),
      error: () => this.error.set('Error al cargar clientes'),
    });
  }

  readonly visitasProgramadas = computed(
    () => this.visitas().filter((p) => p.estado === 'programada').length
  );

  readonly visitasRealizadas = computed(
    () => this.visitas().filter((p) => p.estado === 'realizada').length
  );

  readonly visitasCanceladas = computed(
    () => this.visitas().filter((p) => p.estado === 'cancelada').length
  );

  /** Computed: pedidos filtrados por búsqueda y estado */
  readonly datosFiltrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const estado = this.filtroEstado();
    const visitas = this.visitas();

    return visitas.filter((p) => {
      const coincideBusqueda =
        !term ||
        p.cliente?.nombreNegocio.toLowerCase().includes(term) ||
        p.cliente?.nombreContacto.toLowerCase().includes(term);

      const coincideEstado = estado === 'todos' || p.estado === estado;
      return coincideBusqueda && coincideEstado;
    });
  });

  /** Ver detalle del pedido en modal */
  handleVerDetalle(id: number) {
    const pedido = this.visitas().find((p) => p.id === id) ?? null;
    this.showModal.set(true);
  }

  /** Cambia el estado de un pedido */
  handleCambiarEstado(pedidoId: number, nuevoEstado: string) {
    if (!confirm(`¿Cambiar estado del pedido a "${nuevoEstado}"?`)) return;

    const pedido = this.visitas().find((p) => p.id === pedidoId);
    if (!pedido) return;

    const actualizado: Visita = { ...pedido, estado: nuevoEstado };

    this.visitaService.update(pedidoId, actualizado).subscribe({
      next: () => {
        this.visitas.update((arr) => arr.map((p) => (p.id === pedidoId ? actualizado : p)));
        this.success.set('Estado actualizado correctamente');
      },
      error: () => this.error.set('Error al actualizar el estado'),
    });
  }

  /** Cierra el modal */
  handleCloseModal() {
    this.showModal.set(false);
  }
}
