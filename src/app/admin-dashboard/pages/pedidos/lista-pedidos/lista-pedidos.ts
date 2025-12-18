// ===========================
// CAMBIOS EN: lista-pedidos.ts
// ===========================

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../../services/pedido-service';
import { ProductoService } from '../../../../services/producto-service'; // ✅ NUEVO
import { ClienteService } from '../../../../services/cliente-service';
import { VendedorService } from '../../../../services/vendedor-service';
import { DetallePedido, Pedido } from '../../../../models/pedido.interface';

import { Producto } from '../../../../models/producto.interface'; // ✅ NUEVO
import { Cliente } from '../../../../models/cliente.interface';
import { Usuario } from '../../../../models/usuario.interface';
import { BoletaService } from '../../../../services/boleta-service';

@Component({
  selector: 'app-lista-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-pedidos.html',
  styleUrls: ['./lista-pedidos.css'],
})
export class ListaPedidos {
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService); // ✅ NUEVO
  private readonly clienteService = inject(ClienteService);
  private readonly vendedorService = inject(VendedorService);
  private readonly boletaService = inject(BoletaService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly vendedores = signal<Usuario[]>([]);
  readonly productos = signal<Producto[]>([]); // ✅ NUEVO
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly searchTerm = signal('');
  readonly filtroEstado = signal<'todos' | string>('todos');
  readonly showModal = signal(false);
  readonly pedidoDetalle = signal<Pedido | null>(null);

  // ✅ NUEVO: Estados para edición
  readonly modoEdicion = signal(false);
  readonly detallesEditados = signal<DetallePedido[]>([]);
  readonly productoSeleccionado = signal<Producto | null>(null);
  readonly cantidadNueva = signal(1);
  readonly precioNuevo = signal(0);

  constructor() {
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales() {
    this.fetchPedidos();
    this.fetchClientes();
    this.fetchVendedores();
    this.fetchProductos(); // ✅ NUEVO
  }

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

  private fetchClientes() {
    this.clienteService.getAll().subscribe({
      next: (res) => this.clientes.set(res ?? []),
      error: () => this.error.set('Error al cargar clientes'),
    });
  }

  // ✅ NUEVO: Cargar productos
  private fetchProductos() {
    this.productoService.getAllProductos().subscribe({
      next: (res) => this.productos.set(res ?? []),
      error: () => this.error.set('Error al cargar productos'),
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

  private fetchVendedores() {
    this.vendedorService.getAll().subscribe({
      next: (res) => this.vendedores.set(res ?? []),
      error: () => this.error.set('Error al cargar vendedores'),
    });
  }

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

  // ✅ NUEVO: Computed para totales editados
  readonly totalesEditados = computed(() => {
    const detalles = this.detallesEditados();
    const subtotal = detalles.reduce((sum, d) => sum + d.cantidad * d.precioUnitario, 0);
    const igv = subtotal * 0.18;
    const total = subtotal;
    return { subtotal, igv, total };
  });

  // ✅ NUEVO: Productos disponibles para agregar (que no estén ya en el pedido)
  readonly productosDisponibles = computed(() => {
    const detalles = this.detallesEditados();
    const idsEnPedido = detalles.map((d) => d.producto.id);
    return this.productos().filter((p) => !idsEnPedido.includes(p.id));
  });

  handleVerDetalle(id: number) {
    const pedido = this.pedidos().find((p) => p.id === id) ?? null;
    this.pedidoDetalle.set(pedido);
    this.showModal.set(true);

    // ✅ NUEVO: Inicializar detalles editados
    if (pedido) {
      this.detallesEditados.set([...pedido.detallePedidos]);
    }
  }

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

  handleCloseModal() {
    this.showModal.set(false);
    this.pedidoDetalle.set(null);
    this.modoEdicion.set(false); // ✅ NUEVO
    this.detallesEditados.set([]); // ✅ NUEVO
  }

  // ===========================
  // ✅ NUEVOS MÉTODOS DE EDICIÓN
  // ===========================

  handleActivarEdicion() {
    this.modoEdicion.set(true);
  }

  handleCancelarEdicion() {
    const pedido = this.pedidoDetalle();
    if (pedido) {
      this.detallesEditados.set([...pedido.detallePedidos]);
    }
    this.modoEdicion.set(false);
    this.productoSeleccionado.set(null);
    this.cantidadNueva.set(1);
    this.precioNuevo.set(0);
  }

  handleCantidadChange(detalleId: number, nuevaCantidad: string) {
    const cantidad = Math.max(1, parseInt(nuevaCantidad) || 1);
    this.detallesEditados.update((detalles) =>
      detalles.map((d) => (d.id === detalleId ? { ...d, cantidad } : d))
    );
  }

  handlePrecioChange(detalleId: number, nuevoPrecio: string) {
    const precio = Math.max(0, parseFloat(nuevoPrecio) || 0);
    this.detallesEditados.update((detalles) =>
      detalles.map((d) => (d.id === detalleId ? { ...d, precioUnitario: precio } : d))
    );
  }

  handleEliminarDetalle(detalleId: number) {
    if (!confirm('¿Eliminar este producto del pedido?')) return;

    this.detallesEditados.update((detalles) => detalles.filter((d) => d.id !== detalleId));
  }

  handleProductoSeleccionado(productoId: string) {
    const producto = this.productos().find((p) => p.id === parseInt(productoId));
    this.productoSeleccionado.set(producto || null);
    this.precioNuevo.set(producto?.precio || 0);
  }

  handleAgregarProducto() {
    const producto = this.productoSeleccionado();
    if (!producto) {
      alert('Selecciona un producto');
      return;
    }

    const nuevoDetalle: DetallePedido = {
      id: Date.now(), // ID temporal
      producto,
      cantidad: this.cantidadNueva(),
      precioUnitario: this.precioNuevo(),
      subtotal: this.cantidadNueva() * this.precioNuevo(),
    };

    this.detallesEditados.update((detalles) => [...detalles, nuevoDetalle]);

    // Reset
    this.productoSeleccionado.set(null);
    this.cantidadNueva.set(1);
    this.precioNuevo.set(0);
  }

  //ULTIS
  onCantidadInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = Number(input.value) || 1;

    this.cantidadNueva.set(Math.max(1, valor));
  }
  onPrecioInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = Number(input.value);

    this.precioNuevo.set(isNaN(valor) ? 0 : Math.max(0, valor));
  }

  handleGuardarCambios() {
    const pedido = this.pedidoDetalle();
    if (!pedido) return;

    const totales = this.totalesEditados();
    const pedidoActualizado: Pedido = {
      ...pedido,
      detallePedidos: this.detallesEditados(),
      subtotal: totales.subtotal,
      igv: totales.igv,
      total: totales.total,
    };

    this.pedidoService.update(pedido.id!, pedidoActualizado).subscribe({
      next: () => {
        this.pedidos.update((arr) => arr.map((p) => (p.id === pedido.id ? pedidoActualizado : p)));
        this.pedidoDetalle.set(pedidoActualizado);
        this.boletaService.clearCache();
        this.modoEdicion.set(false);
        this.success.set('Pedido actualizado correctamente');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => {
        this.error.set('Error al actualizar el pedido');
        setTimeout(() => this.error.set(''), 3000);
      },
    });
  }
}
