import { Component, computed, inject, signal } from '@angular/core';
import { ClienteService } from '../../../../services/cliente-service';
import { Cliente } from '../../../../models/cliente.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lista-clientes',
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-clientes.html',
})
export class ListaClientes {
  service = inject(ClienteService);

  clientes = signal<Cliente[]>([]);
  showModal = signal(false);
  hasError = signal('');
  success = signal('');
  loading = signal(false);
  modalMode = signal('create');
  clienteSelected = signal<Cliente | null>(null);
  searchTerm = signal('');
  filtroActivos = signal<'todos' | 'conDeuda' | 'activos'>('todos');

  dataForm = signal<Partial<Cliente>>({
    nombreContacto: '',
    nombreNegocio: '',
    direccion: '',
    referencia: '',
    estado: '',
    telefono: '',
    fechaRegistro: '',
    fechaActualizacion: '',
    latitud: 0,
    longitud: 0,
    tieneCredito: false,
  });

  constructor() {
    this.loadDatos(); // Carga inicial
  }

  loadDatos() {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.hasError.set('Error cargando clientes');
        this.loading.set(false);
      },
    });
  }

  //TODO IMPLEMENTAR UBICACION EN GOOGLE MAPS

  // Se actualiza automáticamente cada vez que escribes
  datosFiltrados = computed(() => {
    let lista = this.clientes();
    if (this.filtroActivos() === 'conDeuda') {
      lista = lista.filter((c) => c.tieneCredito);
    }

    if (this.filtroActivos() === 'activos') {
      lista = lista.filter((c) => c.estado === 'inactivo');
    }

    const term = this.searchTerm().toLowerCase();
    if (!term) return lista;

    return lista.filter(
      (p) =>
        p.nombreNegocio.toLowerCase().includes(term) ||
        p.nombreContacto.toLowerCase().includes(term) ||
        p.telefono.includes(term)
    );
  });

  clientesConDeudaList = computed(() => this.clientes().filter((c) => c.tieneCredito === true));

  handleDelete(id: number) {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;

    this.loading.set(true);

    // Primero elimina
    this.service.delete(id).subscribe({
      next: () => {
        this.success.set('Cliente eliminado exitosamente');

        // Luego recarga
        this.loadDatos();

        // Limpiar mensaje
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.hasError.set(err?.message || 'Error al eliminar cliente');
        this.loading.set(false);
      },
    });
  }

  clientesActivos = computed(() => this.clientes().filter((res) => res.estado === 'activo').length);

  clientesConDeuda = computed(
    () => this.clientes().filter((res) => res.tieneCredito === true).length
  );

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
      fechaRegistro: isCreate ? now : this.dataForm().fechaRegistro, // preservamos la fecha original
      ...(isCreate ? {} : { fechaActualizacion: now }), // solo agregamos fechaActualizacion si es edición
    };

    const request = isCreate
      ? this.service.create(data)
      : this.service.update(this.clienteSelected()?.id!, data);

    request.subscribe({
      next: () => {
        this.success.set(
          isCreate ? 'Cliente creado exitosamente' : 'Cliente actualizado exitosamente'
        );

        // 🔥 Limpiar el caché antes de recargar
        this.service.clearCache();

        this.loadDatos();
        this.autoCloseModal();
      },
      error: (err) => {
        this.hasError.set(err?.error?.message || 'Error al guardar cliente');
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
  handleOpenModal = (mode: string, ent?: Cliente) => {
    this.modalMode.set(mode);
    if (mode === 'edit' && ent) {
      this.clienteSelected.set(ent);
      this.dataForm.set({
        nombreContacto: ent.nombreContacto,
        nombreNegocio: ent.nombreNegocio,
        direccion: ent.direccion,
        referencia: ent.referencia,
        estado: ent.estado,
        telefono: ent.telefono,
        latitud: ent.latitud,
        longitud: ent.longitud,
        tieneCredito: ent.tieneCredito,
        fechaRegistro: ent.fechaRegistro,
        fechaActualizacion: ent.fechaActualizacion,
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
    this.clienteSelected.set(null);
  };

  private resetForm() {
    this.clienteSelected.set(null);
    this.dataForm.set({
      nombreContacto: '',
      nombreNegocio: '',
      direccion: '',
      referencia: '',
      estado: 'activo',
      telefono: '',
      latitud: 0,
      longitud: 0,
      tieneCredito: false,
    });
  }

  private clearMessages() {
    this.hasError.set('');
    this.success.set('');
  }
}
