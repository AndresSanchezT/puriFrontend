import { Component, computed, Inject, signal } from '@angular/core';
import { VendedorService } from '../../../../services/vendedor-service';
import { Usuario } from '../../../../models/usuario.interface';

@Component({
  selector: 'app-lista-vendedores',
  imports: [],
  templateUrl: './lista-vendedores.html',
  styleUrls: ['./lista-vendedores.css'],
})
export class ListaVendedores {
  service = Inject(VendedorService);

  vendedores = signal<Usuario[]>([]);
  estadisticas = signal([]);
  loading = signal(false);
  hasError = signal('');
  success = signal('');
  searchTerm = signal('');
  showModal = signal(false);
  modalMode = signal('create');
  selectedVendedor = signal<Usuario | null>(null);

  dataForm = signal<Partial<Usuario>>({
    nombre: '',
    correo: '',
    contrasena: '',
    telefono: '',
    fechaCreacion: '', // o Date si lo prefieres
    fechaActualizacion: '', // o Date si lo prefieres
    rol: 'VENDEDOR',
    visitas: [],
    pedidos: [],
  });

  constructor() {}

  private loadData() {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data: Usuario[]) => {
        this.vendedores.set(data);
        this.loading.set(false);
      },
      error: (err: ErrorEvent) => {
        this.hasError.set('Error cargando vendedores');
        this.loading.set(false);
      },
    });
  }


  // Se actualiza automáticamente cada vez que escribes
    datosFiltrados = computed(() => {
      const term = this.searchTerm().toLowerCase();

      if (!term) return this.vendedores(); // Si está vacío, muestra todos
      return this.vendedores().filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          p.correo.toLowerCase().includes(term)
      );
    });

    handleDelete(id: number) {
      if (!confirm('¿Está seguro de eliminar este vendedor?')) return;

      this.loading.set(true);

      // Primero elimina
      this.service.delete(id).subscribe({
        next: () => {
          this.success.set('Vendedor eliminado exitosamente');

          // Luego recarga
          this.loadData();

          // Limpiar mensaje
          setTimeout(() => this.success.set(''), 3000);
        },
        error: (err: ErrorEvent) => {
          this.hasError.set(err?.message || 'Error al eliminar Vendedor');
          this.loading.set(false);
        },
      });
    }

    // clientesActivos = computed(() => this.clientes().filter((res) => res.estado === 'activo').length);

    // clientesConDeuda = computed(
    //   () => this.clientes().filter((res) => res.tieneCredito === true).length
    // );

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
        fechaCreacion: isCreate ? now : this.dataForm().fechaCreacion, // preservamos la fecha original
        ...(isCreate ? {} : { fechaActualizacion: now }), // solo agregamos fechaActualizacion si es edición
      };

      const request = isCreate
        ? this.service.create(data)
        : this.service.update(this.selectedVendedor()?.id!, data);

      request.subscribe({
        next: () => {
          this.success.set(
            isCreate ? 'Vendedor creado exitosamente' : 'Vendedor actualizado exitosamente'
          );

          // 🔥 Limpiar el caché antes de recargar
          this.service.clearCache();

          this.loadData();
          this.autoCloseModal();
        },
        error: (err: ErrorEvent) => {
          this.hasError.set(err?.error?.message || 'Error al guardar vendedor');
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
    handleOpenModal = (mode: string, ent?: Usuario) => {
      this.modalMode.set(mode);
      if (mode === 'edit' && ent) {
        this.selectedVendedor.set(ent);
        this.dataForm.set({
          nombre: ent.nombre,
          correo: ent.correo,
          estado: ent.estado
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
      this.selectedVendedor.set(null);
    };

    private resetForm() {
      this.selectedVendedor.set(null);
      this.dataForm.set({
        nombre: '',
        correo: '',
        estado:'activo',
        contrasena: ''
      });
    }

    private clearMessages() {
      this.hasError.set('');
      this.success.set('');
    }



}
