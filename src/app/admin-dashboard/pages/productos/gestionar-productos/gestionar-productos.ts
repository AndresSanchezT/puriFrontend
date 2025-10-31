import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { ProductoService } from '../../../../services/producto-service';
import { Producto } from '../../../../models/producto.interface';
import { CommonModule } from '@angular/common';

interface ProductRequest {
  page: number;
  limit: number;
}

interface ProductoForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_unitario: number | string;
  stock_actual: number | string;
  stock_minimo: number | string;
  unidad_medida: string;
  estado: string;
}

@Component({
  selector: 'app-gestionar-productos',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestionar-productos.html',
})
export class GestionarProductos {
  activatedRoute = inject(ActivatedRoute);
  productService = inject(ProductoService);

  productos = signal<Producto[]>([]);
  showModal = signal(false);
  hasError = signal('');
  success = signal('');
  loading = signal(false);
  modalMode = signal('create');
  productoSelected = signal<Producto | null>(null);
  dataForm = signal<ProductoForm>({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_unitario: 0,
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: '',
    estado: '',
  });
  searchTerm = signal('');

  constructor() {
    this.loadProductos(); // Carga inicial
  }

  private loadProductos() {
    this.loading.set(true);
    this.productService.getAllProductos().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.hasError.set('Error cargando productos');
        this.loading.set(false);
      },
    });
  }

  // Se actualiza automáticamente cada vez que escribes
  productosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase();

    if (!term) return this.productos(); // Si está vacío, muestra todos
    return this.productos().filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.codigo.toLowerCase().includes(term) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term))
    );
  });

  handleDelete(id: number) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    this.loading.set(true);

    // Primero elimina
    this.productService.delete(id).subscribe({
      next: () => {
        this.success.set('Producto eliminado exitosamente');

        // Luego recarga
        this.loadProductos();

        // Limpiar mensaje
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.hasError.set(err?.message || 'Error al eliminar producto');
        this.loading.set(false);
      },
    });
  }
  productosDisponibles = computed(
    () => this.productos().filter((p) => p.stockActual > p.stockMinimo).length
  );

  productosStockBajo = computed(
    () => this.productos().filter((p) => p.stockActual <= p.stockMinimo && p.stockActual > 0).length
  );

  productosAgotados = computed(() => this.productos().filter((p) => p.stockActual === 0).length);

  updateFormField(field: keyof ReturnType<typeof this.dataForm>, value: any) {
    this.dataForm.update((f) => ({
      ...f,
      [field]: value,
    }));
  }

  handleSubmit() {
    this.clearMessages();
    this.loading.set(true);

    const data = this.dataForm();

    if (this.modalMode() === 'create') {
      // Crear producto
      this.productService.createProduct(data).subscribe({
        next: () => {
          this.success.set('Producto creado exitosamente');
          this.loadProductos();
          this.autoCloseModal();
        },
        error: (err) => {
          this.hasError.set(err?.error?.message || 'Error al crear producto');
          this.loading.set(false);
        },
      });
    } else {
      // Actualizar producto
      const id = this.productoSelected()?.id;
      if (!id) {
        this.hasError.set('No se encontró el producto a actualizar');
        this.loading.set(false);
        return;
      }
      this.productService.updateProduct(id, data).subscribe({
        next: () => {
          this.success.set('Producto actualizado exitosamente');
          this.loadProductos();
          this.autoCloseModal();
        },
        error: (err) => {
          this.hasError.set(err?.error?.message || 'Error al actualizar producto');
          this.loading.set(false);
        },
      });
    }
  }
  private autoCloseModal() {
    setTimeout(() => {
      this.handleCloseModal();
      this.success.set('');
      this.loading.set(false);
    }, 1500);
  }
  handleOpenModal = (mode: string, producto?: Producto) => {
    this.modalMode.set(mode);
    if (mode === 'edit' && producto) {
      this.productoSelected.set(producto);
      this.dataForm.set({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        precio_unitario: producto.precio,
        stock_actual: producto.stockActual,
        stock_minimo: producto.stockMinimo,
        unidad_medida: producto.unidadMedida,
        estado: producto.estado,
      });
    } else {
      this.resetForm();
    }
    this.showModal.set(true);
    this.hasError.set('');
    this.success.set('');
  };

  handleCloseModal = () => {
    this.showModal.set(false);
    this.productoSelected.set(null);
  };

  private resetForm() {
    this.productoSelected.set(null);
    this.dataForm.set({
      codigo: '',
      nombre: '',
      descripcion: '',
      precio_unitario: '',
      stock_actual: '',
      stock_minimo: '',
      unidad_medida: 'UNIDAD',
      estado: 'activo',
    });
  }

  private clearMessages() {
    this.hasError.set('');
    this.success.set('');
  }

  // TODO Añadir paginacion
}
