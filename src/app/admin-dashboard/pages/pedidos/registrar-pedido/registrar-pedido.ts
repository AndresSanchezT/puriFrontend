import { Component, computed, effect, inject, signal } from '@angular/core';
import { ClienteService } from '../../../../services/cliente-service';
import { ProductoService } from '../../../../services/producto-service';
import { PedidoService } from '../../../../services/pedido-service';
import { Cliente } from '../../../../models/cliente.interface';
import { Producto } from '../../../../models/producto.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ProductoTemp {
  id_producto: number;
  codigo: string;
  nombre: string;
  precio_unitario: number;
  stock_actual: number;
}

export interface CarritoItem {
  id_producto: number;
  codigo: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
  subtotal: number;
}

// export interface SearchProducto {
//   termino: string;
//   resultados: ProductoTemp[];
// }


@Component({
  selector: 'app-registrar-pedido',
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-pedido.html',
})
export class RegistrarPedido {
  clienteService = inject(ClienteService);
  productoService = inject(ProductoService);
  pedidoService = inject(PedidoService);
  

  constructor() {
    this.fetchClientes();
    this.fetchProductos();

    // 🔄 efecto para recalcular totales cuando cambia el carrito
    effect(() => {
      this.calcularTotales();
    });
  }

  // Signals principales
  step = signal(1);
  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  clienteSeleccionado = signal<Cliente | null>(null);

  searchCliente = signal('');
  searchProducto = signal('');

  carrito = signal<any[]>([]);
  productoTemp = signal<Producto | null>(null);
  cantidadTemp = signal(1);

  subtotal = signal(0);
  igv = signal(0);
  total = signal(0);

  observaciones = signal('');
  loading = signal(false);
  error = signal('');
  success = signal('');

  // Computed: filtrados dinámicos
  clientesFiltrados = computed(() =>
    this.clientes().filter(
      (c) =>
        c.nombreNegocio.toLowerCase().includes(this.searchCliente().toLowerCase()) ||
        c.nombreContacto.toLowerCase().includes(this.searchCliente().toLowerCase())
    )
  );

  productosFiltrados = computed(() =>
    this.productos().filter(
      (p) =>
        p.nombre.toLowerCase().includes(this.searchProducto().toLowerCase()) ||
        p.codigo.toLowerCase().includes(this.searchProducto().toLowerCase())
    )
  );

  // ======================
  // Métodos
  // ======================

  fetchClientes() {
    this.clienteService.getAll().subscribe({
      next: (res) => {
        this.clientes.set(res || []);
      },
      error: () => this.error.set('Error al cargar clientes'),
    });
  }

  fetchProductos() {
    this.productoService.getAllProductos().subscribe({
      next: (res) => {
        this.productos.set(res.filter((p) => p.stockActual > 0));
      },
      error: () => this.error.set('Error al cargar productos'),
    });
  }

  handleSelectCliente(cliente: Cliente) {
    this.clienteSeleccionado.set(cliente);
    this.step.set(2);
    this.error.set('');
  }

  handleAgregarProducto() {
    const producto = this.productoTemp();
    const cantidad = this.cantidadTemp();

    if (!producto) return this.error.set('Seleccione un producto');
    if (cantidad <= 0) return this.error.set('La cantidad debe ser mayor a 0');
    if (cantidad > producto.stockActual)
      return this.error.set(`Stock insuficiente. Disponible: ${producto.stockActual}`);

    const carritoActual = [...this.carrito()];
    const productoExistente = carritoActual.find((i) => i.id_producto === producto.id);

    if (productoExistente) {
      const nuevaCantidad = productoExistente.cantidad + cantidad;
      if (nuevaCantidad > producto.stockActual)
        return this.error.set(`Stock insuficiente. Disponible: ${producto.stockActual}`);

      productoExistente.cantidad = nuevaCantidad;
      productoExistente.subtotal = +(nuevaCantidad * productoExistente.precio_unitario).toFixed(2);
    } else {
      carritoActual.push({
        id_producto: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        precio_unitario: +producto.precio,
        cantidad,
        stock_disponible: producto.stockActual,
        subtotal: +(cantidad * producto.precio).toFixed(2),
      });
    }

    this.carrito.set(carritoActual);
    this.productoTemp.set(null);
    this.cantidadTemp.set(1);
    this.searchProducto.set('');
    this.error.set('');
  }

  handleEliminarProducto(idProducto: number) {
    this.carrito.update((lista) => lista.filter((i) => i.id_producto !== idProducto));
  }

  handleCantidadChange(idProducto: number, nuevaCantidad: number) {
    if (nuevaCantidad <= 0) return;
    const item = this.carrito().find((i) => i.id_producto === idProducto);
    if (!item) return;

    if (nuevaCantidad > item.stock_disponible)
      return this.error.set(`Stock insuficiente. Disponible: ${item.stock_disponible}`);

    this.carrito.update((lista) =>
      lista.map((i) =>
        i.id_producto === idProducto
          ? {
              ...i,
              cantidad: nuevaCantidad,
              subtotal: +(nuevaCantidad * i.precio_unitario).toFixed(2),
            }
          : i
      )
    );
  }

  calcularTotales() {
    const subtotal = this.carrito().reduce((sum, i) => sum + i.subtotal, 0);
    const igv = +(subtotal * 0.18).toFixed(2);
    const total = +(subtotal + igv).toFixed(2);

    this.subtotal.set(subtotal);
    this.igv.set(igv);
    this.total.set(total);
  }

  handleConfirmarPedido() {
    if (this.carrito().length === 0) return this.error.set('Debe agregar al menos un producto');

    this.loading.set(true);
    this.error.set('');

    const pedidoData = {
      id_cliente: this.clienteSeleccionado()?.id,
      subtotal: this.subtotal(),
      igv: this.igv(),
      total: this.total(),
      observaciones: this.observaciones(),
      productos: this.carrito().map((i) => ({
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
      })),
    };

    this.pedidoService.create(pedidoData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.success.set('Pedido registrado exitosamente');
          setTimeout(() => {
            this.resetForm();
            this.fetchProductos();
          }, 2000);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al registrar pedido');
      },
      complete: () => this.loading.set(false),
    });
  }

  resetForm() {
    this.step.set(1);
    this.carrito.set([]);
    this.clienteSeleccionado.set(null);
    this.observaciones.set('');
    this.success.set('');
  }
}
