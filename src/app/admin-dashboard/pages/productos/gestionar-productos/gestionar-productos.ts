import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';

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
  precio: number | string;
  stockActual: number | string;
  stockMinimo: number | string;
  unidadMedida: string;
  estado: string;
}

@Component({
  selector: 'app-gestionar-productos',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestionar-productos.html',
  styleUrl: './gestionar-productos.css'
})
export class GestionarProductos {
  productService = inject(ProductoService);

  productos = signal<Producto[]>([]);
  showModal = signal(false);
  hasError = signal('');
  success = signal('');
  loading = signal(false);
  modalMode = signal('create');
  productoSelected = signal<Producto | null>(null);
  dataForm = signal<Partial<Producto>>({
    codigo: '',
    nombre: '',
    precio: 0,
    stockActual: 0,
    stockMinimo: 0,
    unidadMedida: '',
    estado: '',
    descripcion: '',
    fechaCreacion: '',
    fechaActualizacion: '',
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
        (p.descripcion && p.descripcion.toLowerCase().includes(term)),
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
    () => this.productos().filter((p) => p.stockActual > p.stockMinimo).length,
  );

  productosStockBajo = computed(
    () =>
      this.productos().filter((p) => p.stockActual <= p.stockMinimo && p.stockActual > 0).length,
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

    const isCreate = this.modalMode() === 'create';
    const now = new Date().toISOString().split('T')[0];
    const data = {
      ...this.dataForm(),
      ...(isCreate ? { fechaCreacion: now } : { fechaActualizacion: now }),
    };

    const request = isCreate
      ? this.productService.createProduct(data)
      : this.productService.updateProduct(this.productoSelected()?.id!, data);

    request.subscribe({
      next: () => {
        this.success.set(
          isCreate ? 'Producto creado exitosamente' : 'Producto actualizado exitosamente',
        );

        // 🔥 Limpiar el caché antes de recargar
        this.productService.clearCache();

        this.loadProductos();
        this.autoCloseModal();
      },
      error: (err) => {
        this.hasError.set(err?.error?.message || 'Error al guardar producto');
        this.loading.set(false);
      },
    });
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
        precio: producto.precio,
        stockActual: producto.stockActual,
        stockMinimo: producto.stockMinimo,
        unidadMedida: producto.unidadMedida,
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
      precio: 0,
      stockActual: 0,
      stockMinimo: 0,
      unidadMedida: 'UNIDAD',
      estado: 'activo',
    });
  }

  private clearMessages() {
    this.hasError.set('');
    this.success.set('');
  }

  // TODO Añadir paginacion
  // TODO corregir error de que al hacer click fuera del modal de crea se cierra y los datos ingresados se pierden
}
