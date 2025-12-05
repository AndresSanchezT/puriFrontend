import { Component, computed, inject, signal } from '@angular/core';
import { Producto } from '../../../../models/producto.interface';
import { ProductoService } from '../../../../services/producto-service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-consultar-stock',
  imports: [CommonModule],
  templateUrl: './consultar-stock.html',
  styleUrls: ['./consultar-stock.css'],
})
export class ConsultarStock {
  productoService = inject(ProductoService);

  productos = signal<Producto[]>([]);
  loading = signal(false);
  error = signal('');
  searchTerm = signal('');
  filtroStock = signal('todos'); // 'todos', 'disponible', 'bajo', 'agotado'
  showModal = signal(false);
  productoSeleccionado = signal<Producto | null>(null);
  

  productosDisponibles = computed(() => this.productos().filter((p) => p.estado === 'disponible'));
  productosStockBajo = computed(() =>
    this.productos().filter((p) => p.stockActual < p.stockMinimo)
  );
  productosAgotados = computed(() => this.productos().filter((p) => p.stockActual <= 0));

  constructor() {
    this.loadDatos();
  }

  loadDatos() {
    this.productoService.getAllProductos().subscribe({
      next: (res) => {
        this.productos.set(res ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar productos');
        this.loading.set(false);
      },
    });
  }

  readonly datosFiltrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const estadoFiltro = this.filtroStock();
    const productos = this.productos();

    return productos.filter((p) => {
      // 👉 Estado calculado según stock
      const estadoCalculado =
        p.stockActual <= 0 ? 'agotado' : p.stockActual < p.stockMinimo ? 'bajo' : 'disponible';

      const coincideBusqueda =
        !term ||
        p.nombre.toLowerCase().includes(term) ||
        p.codigo.toLowerCase().includes(term) ||
        p.descripcion.toLowerCase().includes(term);

      const coincideEstado = estadoFiltro === 'todos' || estadoCalculado === estadoFiltro;

      return coincideBusqueda && coincideEstado;
    });
  });

  handleVerDetalle(producto: Producto) {
    this.showModal.set(true);
    this.productoSeleccionado.set(producto);
  }

  handleCloseModal() {
    this.showModal.set(false);
    this.productoSeleccionado.set(null);
  }

  getProgressWidth(producto: Producto) {
    const width = (producto.stockActual / (producto.stockMinimo * 2)) * 100;
    return `${Math.min(width, 100)}%`;
  }

  getProgressColor(producto: Producto) {
    return producto.stockActual === 0
      ? '#e74c3c'
      : producto.stockActual <= producto.stockMinimo
      ? '#f39c12'
      : '#27ae60';
  }
}
