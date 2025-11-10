import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../../services/pedido-service';
import { ClienteService } from '../../../../services/cliente-service';
import { VendedorService } from '../../../../services/vendedor-service';
import { Pedido } from '../../../../models/pedido.interface';
import { Cliente } from '../../../../models/cliente.interface';
import { Usuario } from '../../../../models/usuario.interface';

@Component({
  selector: 'app-lista-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-pedidos.html',
  styleUrls: ['./lista-pedidos.css'],
})
export class ListaPedidos {
  private readonly pedidoService = inject(PedidoService);
  private readonly clienteService = inject(ClienteService);
  private readonly vendedorService = inject(VendedorService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly vendedores = signal<Usuario[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly searchTerm = signal('');
  readonly filtroEstado = signal<'todos' | string>('todos');
  readonly showModal = signal(false);
  readonly pedidoDetalle = signal<Pedido | null>(null);

  constructor() {
    this.cargarDatosIniciales();
  }

  /** Carga inicial de todos los datos necesarios */
  private cargarDatosIniciales() {
    this.fetchPedidos();
    this.fetchClientes();
    this.fetchVendedores();
  }

  /** Carga de pedidos desde el backend */
  private fetchPedidos() {
    this.loading.set(true);
    this.pedidoService.getAll().subscribe({
      next: (res) => {
        this.pedidos.set(res ?? []);
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

  readonly totalPedidosRegistrados = computed(() =>
    this.pedidos().reduce((count, p) => count + (p.estado === 'registrado' ? 1 : 0), 0)
  );

  readonly totalPedidosConfirmados = computed(() =>
    this.pedidos().reduce((count, p) => count + (p.estado === 'confirmado' ? 1 : 0), 0)
  );

  readonly totalPedidosEntregados = computed(() =>
    this.pedidos().reduce((count, p) => count + (p.estado === 'entregado' ? 1 : 0), 0)
  );

  /** Carga de vendedores */
  private fetchVendedores() {
    this.vendedorService.getAll().subscribe({
      next: (res) => this.vendedores.set(res ?? []),
      error: () => this.error.set('Error al cargar vendedores'),
    });
  }

  /** Computed: pedidos filtrados por búsqueda y estado */
  readonly datosFiltrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const estado = this.filtroEstado();
    const pedidos = this.pedidos();

    return pedidos.filter((p) => {
      const coincideBusqueda =
        !term ||
        p.cliente?.nombreNegocio.toLowerCase().includes(term) ||
        p.id?.toString().includes(term);

      const coincideEstado = estado === 'todos' || p.estado === estado;
      return coincideBusqueda && coincideEstado;
    });
  });

  /** Ver detalle del pedido en modal */
  handleVerDetalle(id: number) {
    const pedido = this.pedidos().find((p) => p.id === id) ?? null;
    this.pedidoDetalle.set(pedido);
    this.showModal.set(true);
  }

  /** Cambia el estado de un pedido */
  handleCambiarEstado(pedidoId: number, nuevoEstado: string) {
    if (!confirm(`¿Cambiar estado del pedido a "${nuevoEstado}"?`)) return;

    const pedido = this.pedidos().find((p) => p.id === pedidoId);
    if (!pedido) return;

    const actualizado: Pedido = { ...pedido, estado: nuevoEstado };

    this.pedidoService.update(pedidoId, actualizado).subscribe({
      next: () => {
        this.pedidos.update((arr) => arr.map((p) => (p.id === pedidoId ? actualizado : p)));
        this.success.set('Estado actualizado correctamente');
      },
      error: () => this.error.set('Error al actualizar el estado'),
    });
  }

  /** Cierra el modal */
  handleCloseModal() {
    this.showModal.set(false);
    this.pedidoDetalle.set(null);
  }
}
