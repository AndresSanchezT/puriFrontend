import { Component, computed, effect, inject, signal } from '@angular/core';
import { ClienteService } from '../../../../services/cliente-service';
import { VisitaService } from '../../../../services/visita-service';
import { Cliente } from '../../../../models/cliente.interface';
import { Visita } from '../../../../models/visita.interface';

@Component({
  selector: 'app-registrar-visita',
  imports: [],
  templateUrl: './registrar-visita.html',
  styleUrls: ['./registrar-visita.css'],
})
export class RegistrarVisita {
  private readonly clienteService = inject(ClienteService);
  private readonly visitaService = inject(VisitaService);

  // --- signals base ---
  readonly clientes = signal<Cliente[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly searchCliente = signal('');

  readonly formData = signal<Visita>({
    cliente: undefined, // o simplemente omitir esta línea
    fecha: '',
    estado: 'programada',
    observaciones: '',
  });

  // --- Efecto para cargar clientes ---
  constructor() {
    effect(() => this.fetchClientes());
  }

  /** Carga los clientes desde el backend */
  private fetchClientes() {
    this.loading.set(true);
    this.clienteService.getAll().subscribe({
      next: (res) => {
        this.clientes.set(res ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar clientes');
        this.loading.set(false);
      },
    });
  }

  /** Computed: clientes filtrados por búsqueda */
  readonly clientesFiltrados = computed(() => {
    const term = this.searchCliente().trim().toLowerCase();
    if (!term) return [];
    return this.clientes()
      .filter(
        (c) =>
          c.nombreNegocio.toLowerCase().includes(term) ||
          c.nombreContacto.toLowerCase().includes(term)
      )
      .slice(0, 5);
  });

  /** Manejador de cambios en inputs */
  handleChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    this.formData.update((f) => ({ ...f, [target.name]: target.value }));
  }

  /** Envío del formulario */
  handleSubmit(event: Event) {
    event.preventDefault();
    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    const form = this.formData();

    if (!form.cliente?.id) {
      this.error.set('Debe seleccionar un cliente');
      this.loading.set(false);
      return;
    }

    if (!form.fecha) {
      this.error.set('Debe ingresar una fecha y hora');
      this.loading.set(false);
      return;
    }

    this.visitaService.create(form).subscribe({
      next: () => {
        this.success.set('Visita registrada exitosamente');
        this.formData.set({
          cliente: undefined,
          fecha: '',
          estado: '',
          observaciones: '',
        });
        this.searchCliente.set('');
        this.loading.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => {
        this.error.set('Error al registrar visita');
        this.loading.set(false);
      },
    });
  }

  /** Seleccionar cliente del dropdown */
  seleccionarCliente(clienteForm: Cliente) {
    this.formData.update((f) => ({ ...f, cliente: clienteForm  }));
    this.searchCliente.set(`${clienteForm.nombreNegocio} - ${clienteForm.nombreContacto}`);
  }

  /** Limpiar formulario */
  handleLimpiar() {
    this.formData.set({
      cliente: undefined,
      fecha: '',
      estado: 'programada',
      observaciones: '',
    });
    this.searchCliente.set('');
  }
}
