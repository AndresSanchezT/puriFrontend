import { Component, computed, effect, inject, signal } from '@angular/core';
import { ClienteService } from '../../../../services/cliente-service';
import { ProductoService } from '../../../../services/producto-service';
import { PedidoService } from '../../../../services/pedido-service';
import { Cliente } from '../../../../models/cliente.interface';
import { Producto } from '../../../../models/producto.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../../../models/usuario.interface';
import { VendedorService } from '../../../../services/vendedor-service';
import { VisitaService } from '../../../../services/visita-service';
import { Visita } from '../../../../models/visita.interface';
import { Carrito, Pedido } from '../../../../models/pedido.interface';

export interface ProductoTemp {
  id_producto: number;
  codigo: string;
  nombre: string;
  precio_unitario: number;
  stock_actual: number;
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
  vendedorService = inject(VendedorService);
  visitaService = inject(VisitaService);
  productoService = inject(ProductoService);
  pedidoService = inject(PedidoService);

  constructor() {
    this.fetchClientes();
    this.fetchProductos();
    this.fetchVendedores();

    // 🔄 efecto para recalcular totales cuando cambia el carrito
    effect(() => {
      this.calcularTotales();
    });
  }

  // Signals principales
  step = signal(1);
  clientes = signal<Cliente[]>([]);
  vendedores = signal<Usuario[]>([]);
  productos = signal<Producto[]>([]);
  clienteSeleccionado = signal<Cliente | null>(null);
  vendedorSeleccionado = signal<number | null>(null);
  visitaGenerada = signal<Visita | null>(null);

  searchCliente = signal('');
  searchProducto = signal('');

  carrito = signal<Carrito[]>([]);
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

  fetchVendedores() {
    this.vendedorService.getAll().subscribe({
      next: (res) => {
        this.vendedores.set(res || []);
      },
      error: () => this.error.set('Error al cargar vendedores'),
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

    const productoExistente = this.carrito().find((i) => i.producto.id === producto.id);

    if (productoExistente) {
      const nuevaCantidad = productoExistente.cantidad + cantidad;
      if (nuevaCantidad > producto.stockActual)
        return this.error.set(`Stock insuficiente. Disponible: ${producto.stockActual}`);

      // ✅ actualiza solo ese producto
      this.carrito.update((carritoActual) =>
        carritoActual.map((item) =>
          item.producto.id === producto.id
            ? {
                ...item,
                cantidad: nuevaCantidad,
                subtotal: parseFloat((nuevaCantidad * item.precio_unitario).toFixed(2)),
              }
            : item
        )
      );
    } else {
      // ✅ agrega un nuevo producto
      this.carrito.update((carritoActual) => [
        ...carritoActual,
        {
          producto: producto,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio_unitario: +producto.precio,
          cantidad,
          stock_disponible: producto.stockActual,
          subtotal: +(cantidad * producto.precio).toFixed(2),
        },
      ]);
    }

    // Limpieza final
    this.productoTemp.set(null);
    this.cantidadTemp.set(1);
    this.searchProducto.set('');
    this.error.set('');
  }

  handleEliminarProducto(idProducto: number) {
    this.carrito.update((lista) => lista.filter((i) => i.producto.id !== idProducto));
  }

  handleCantidadChange(idProducto: number, nuevaCantidad: number) {
    if (nuevaCantidad <= 0) return;
    const item = this.carrito().find((i) => i.producto.id === idProducto);
    if (!item) return;

    if (nuevaCantidad > item.producto.stockActual)
      return this.error.set(`Stock insuficiente. Disponible: ${item.producto.stockActual}`);

    this.carrito.update((lista) =>
      lista.map((i) =>
        i.producto.id === idProducto
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
    // ✅ VALIDACIONES PRIMERO (antes de loading)
    if (!this.vendedorSeleccionado()) {
      return this.error.set('Seleccione un vendedor');
    }
    if (!this.clienteSeleccionado()) {
      return this.error.set('Seleccione un cliente');
    }
    if (this.carrito().length === 0) {
      return this.error.set('Agregue al menos un producto al pedido');
    }

    // Ahora sí activar loading
    this.loading.set(true);
    this.error.set('');

    const now = new Date().toISOString().split('T')[0];
    const vendedor = this.vendedores().find((v) => v.id === this.vendedorSeleccionado());

    const nuevaVisita: Visita = {
      vendedor: vendedor,
      cliente: this.clienteSeleccionado()!,
      fecha: now,
      estado: 'programada',
      observaciones: '',
    };

    this.visitaService.create(nuevaVisita).subscribe({
      next: (visitaCreada: Visita) => {
        this.visitaGenerada.set(visitaCreada);

        // ✅ Buscar el objeto completo del vendedor
        const vendedor = this.vendedores().find((v) => v.id === this.vendedorSeleccionado());

        // ✅ ESTRUCTURA CON OBJETOS COMPLETOS (tal como espera el backend)
        const pedidoData = {
          vendedor: vendedor, // ✅ Objeto completo Usuario
          cliente: this.clienteSeleccionado(), // ✅ Objeto completo Cliente
          visita: visitaCreada, // ✅ Objeto completo Visita
          fechaPedido: now,
          subtotal: this.subtotal(),
          igv: this.igv(),
          total: this.total(),
          estado: 'pendiente',
          observaciones: this.observaciones() || '',
          detallePedidos: this.carrito().map((i) => ({
            producto: i.producto, // ✅ Objeto completo Producto
            cantidad: i.cantidad,
            precioUnitario: i.precio_unitario,
            subtotal: i.subtotal,
          })),
        };

        // ✅ Debug: ver qué se está enviando
        console.log('📦 Datos del pedido:', pedidoData);

        this.pedidoService.create(pedidoData).subscribe({
          next: (res: any) => {
            this.success.set('Pedido y visita registrados exitosamente');
            this.loading.set(false);
            setTimeout(() => {
              this.resetForm();
              this.fetchProductos();
            }, 2000);
          },
          error: (err) => {
            console.error('❌ Error completo:', err);
            this.error.set(err?.error?.message || 'Error al registrar pedido');
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('❌ Error al crear visita:', err);
        this.error.set(err?.error?.message || 'Error al registrar visita');
        this.loading.set(false);
      },
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
