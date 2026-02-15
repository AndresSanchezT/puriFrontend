import { Component, computed, inject, signal } from '@angular/core';
import { BoletaData, BoletaService, DetalleBoletaDTO } from '../../../../services/boleta-service';
import { Boleta } from '../../../../models/boleta.interface';
import { EstadoBoleta } from '../../../../models/responses/response-estado.interface';
import { CommonModule } from '@angular/common';
import { LogoService } from '../../../../services/logo-service';
import { firstValueFrom, forkJoin } from 'rxjs';

@Component({
  selector: 'app-lista-boletas',
  imports: [CommonModule],
  templateUrl: './lista-boletas.html',
  styleUrls: ['./lista-boletas.css'],
})
export class ListaBoletas {
  boletaService = inject(BoletaService);
  logoService = inject(LogoService);
  boletas = signal<Boleta[]>([]);
  boletasDeHoyRegistrados = signal<Boleta[]>([]);
  loading = signal(false);
  error = signal('');
  succes = signal('');
  searchTerm = signal('');
  filtroEstado = signal('todos');
  showModal = signal(false);
  modalType = signal('');
  boletaSeleccionada = signal<Boleta | null>(null);
  motivoAnulacion = signal('');
  processing = signal(false);
  cargandoPDF = signal(false);
  generandoMultiple = signal(false);

  private logoBase64 = '';

  constructor() {
    this.cargarDatos();
  }

  async ngOnInit(): Promise<void> {
    // ✅ Pre-cargar el logo al inicio
    await this.logoService.precargar();
    this.cargarDatos();
  }

  // cargarDatos() {
  //   this.loading.set(true);
  //   this.boletaService.getAll().subscribe({
  //     next: (data) => {
  //       this.boletas.set(data);
  //       this.loading.set(false);
  //     },
  //     error: (err) => {
  //       this.error.set('Error cargando boletas');
  //       this.loading.set(false);
  //     },
  //   });
  // }

  cargarDatos() {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      todas: this.boletaService.getAll(),
      hoyRegistradas: this.boletaService.getBoletasDeHoyRegistrados(),
    }).subscribe({
      next: ({ todas, hoyRegistradas }) => {
        this.boletas.set(todas);
        this.boletasDeHoyRegistrados.set(hoyRegistradas);
      },
      error: () => {
        this.error.set('Error cargando datos de boletas');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  readonly datosFiltrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const estado = this.filtroEstado();
    const boletas = this.boletas();

    return boletas.filter((b) => {
      const coincideBusqueda =
        !term ||
        b.pedido.cliente?.nombreContacto?.toLowerCase().includes(term) ||
        b.pedido.id?.toString().includes(term) ||
        b.codigo.toLowerCase().includes(term);

      const coincideEstado = estado === 'todos' || b.estado === estado;
      return coincideBusqueda && coincideEstado;
    });
  });

  boletasRegistradas = computed(
    () => this.boletas().filter((b) => b.estado === 'REGISTRADA').length,
  );
  boletasEmitidas = computed(() => this.boletas().filter((b) => b.estado === 'PAGADO').length);
  boletasAnuladas = computed(() => this.boletas().filter((b) => b.estado === 'ANULADO').length);

  handleOpenModal(boleta: Boleta, type: string) {
    this.boletaSeleccionada.set(boleta);
    this.modalType.set(type);
    this.showModal.set(true);
    this.motivoAnulacion.set('');
    this.error.set('');
  }

  handleActualizarEstado(id: number, info: EstadoBoleta) {
    this.processing.set(true);
    this.error.set('');

    this.boletaService.actualizarEstadoBoleta(id, info).subscribe({
      next: (msg) => {
        this.succes.set(msg);
        this.processing.set(false);

        // 🔹 Cerrar modal
        this.showModal.set(false);

        // 🔹 Actualizar la boleta dentro del signal
        this.boletas.update((lista) =>
          lista.map((b) =>
            b.id === id ? { ...b, estado: info.nuevoEstado, motivoAnulacion: info.informacion } : b,
          ),
        );
      },
      error: (err) => {
        this.error.set(err || 'No se puedo actualizar el estado');
        this.processing.set(false);
      },
    });
  }
  // genererBoleta(id: number) {
  //   this.processing.set(true);
  //   this.boletaService.generarBoleta(id).subscribe({
  //     next: (response) => {
  //       const blob = response.body!;
  //       const url = window.URL.createObjectURL(blob);
  //       window.open(url, '_blank');
  //       this.processing.set(false);
  //       setTimeout(() => window.URL.revokeObjectURL(url), 100);
  //     },
  //     error: (error) => {
  //       console.error('Error al generar boleta:', error);
  //       this.processing.set(false);
  //     },
  //   });
  // }

  async generarBoletaPDF(boletaId: number): Promise<void> {
    this.cargandoPDF.set(true);
    this.error.set('');

    try {
      // ✅ Obtener logo (desde caché si ya está cargado)
      const logo = await this.logoService.getLogo();

      // Obtener datos de boleta
      this.boletaService.getDatosBoletaParaPDF(boletaId).subscribe({
        next: (dto) => {
          this.boletaService.generarBoletaPDF(dto, logo);
          this.cargandoPDF.set(false);
        },
        error: (err) => {
          this.error.set('Error al cargar los datos de la boleta');
          this.cargandoPDF.set(false);
        },
      });
    } catch (error) {
      this.error.set('Error cargando el logo');
      this.cargandoPDF.set(false);
    }
  }

  /**
   * Genera todas las boletas filtradas en un solo PDF
   */
  async generarTodasLasBoletasPDF(): Promise<void> {
    const boletasFiltradas = this.datosFiltrados();

    if (boletasFiltradas.length === 0) {
      this.error.set('No hay boletas para generar');
      return;
    }

    // Confirmar acción si hay muchas boletas
    if (boletasFiltradas.length > 20) {
      const confirmar = confirm(
        `¿Está seguro de generar ${boletasFiltradas.length} boletas? Esto puede tardar varios segundos.`,
      );
      if (!confirmar) return;
    }

    this.generandoMultiple.set(true);
    this.error.set('');

    try {
      // Obtener logo
      const logo = await this.logoService.getLogo();

      // Obtener IDs de todas las boletas filtradas
      const boletasIds = boletasFiltradas.map((b) => b.id);

      // Generar PDF múltiple
      await this.boletaService.generarBoletasMultiplesPDF(boletasIds, logo);

      this.succes.set(`Se generaron ${boletasFiltradas.length} boletas correctamente`);

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => this.succes.set(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      this.error.set('Error al generar las boletas. Por favor, intente nuevamente.');
    } finally {
      this.generandoMultiple.set(false);
    }
  }

  async generarTodasLasBoletasPDFregistradasHoy(): Promise<void> {
    this.generandoMultiple.set(true);
    this.error.set('');

    try {
      // 1️⃣ Obtener boletas REGISTRADAS de hoy
      const boletasDeHoyRegistrados = this.boletasDeHoyRegistrados();

      if (boletasDeHoyRegistrados.length === 0) {
        this.error.set('No hay boletas registradas dehoy para generar');
        return;
      }

      // 2️⃣ Confirmación
      if (boletasDeHoyRegistrados.length > 20) {
        const confirmar = confirm(
          `¿Está seguro de generar ${boletasDeHoyRegistrados.length} boletas?`,
        );
        if (!confirmar) return;
      }

      // 3️⃣ Obtener logo
      const logo = await this.logoService.getLogo();

      // 4️⃣ Obtener IDs
      const boletasIds = boletasDeHoyRegistrados.map((b) => b.id);

      // 5️⃣ Generar PDF
      await this.boletaService.generarBoletasMultiplesPDF(boletasIds, logo);

      this.succes.set(`Se generaron ${boletasDeHoyRegistrados.length} boletas registradas hoy`);

      setTimeout(() => this.succes.set(''), 3000);
    } catch (error) {
      console.error(error);
      this.error.set('Error al generar boletas registradas de hoy');
    } finally {
      this.generandoMultiple.set(false);
    }
  }

  /**
   * Genera boletas solo de un estado específico
   */
  async generarBoletasPorEstado(estado: string): Promise<void> {
    const boletasPorEstado = this.boletas().filter((b) => b.estado === estado);

    if (boletasPorEstado.length === 0) {
      this.error.set(`No hay boletas ${estado.toLowerCase()} para generar`);
      return;
    }

    this.generandoMultiple.set(true);
    this.error.set('');

    try {
      const logo = await this.logoService.getLogo();
      const boletasIds = boletasPorEstado.map((b) => b.id);

      await this.boletaService.generarBoletasMultiplesPDF(boletasIds, logo);

      this.succes.set(
        `Se generaron ${boletasPorEstado.length} boletas ${estado.toLowerCase()} correctamente`,
      );
      setTimeout(() => this.succes.set(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      this.error.set('Error al generar las boletas. Por favor, intente nuevamente.');
    } finally {
      this.generandoMultiple.set(false);
    }
  }

  /**
   * Carga el logo desde assets y lo convierte a base64
   */
  async cargarLogo(): Promise<void> {
    try {
      const response = await fetch('/assets/logo.png');
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        this.logoBase64 = reader.result as string;
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.warn('Error cargando logo:', error);
    }
  }

  handleEliminarBoleta(idBoleta: number) {
    if (
      confirm('¿Estás seguro de que deseas eliminar esta boleta? Esta acción no se puede deshacer.')
    ) {
      // 🚀 Guardar copia por si hay que revertir
      const boletasBackup = [...this.boletas()];
      const boletasHoyBackup = [...this.boletasDeHoyRegistrados()];

      // ✅ ELIMINAR INMEDIATAMENTE de la UI (actualización optimista)
      this.boletas.update((lista) => lista.filter((b) => b.id !== idBoleta));
      this.boletasDeHoyRegistrados.update((lista) => lista.filter((b) => b.id !== idBoleta));

      // Llamar al servidor en segundo plano
      this.boletaService.delete(idBoleta).subscribe({
        next: () => {
          this.succes.set('Boleta eliminada exitosamente');
          setTimeout(() => this.succes.set(''), 2000);
        },
        error: (err: any) => {
          // ❌ Si falla, REVERTIR los cambios
          this.boletas.set(boletasBackup);
          this.boletasDeHoyRegistrados.set(boletasHoyBackup);

          console.error('Error al eliminar:', err);
          this.error.set(err?.error?.mensaje || 'Error al eliminar la boleta');
          setTimeout(() => this.error.set(''), 5000);
        },
      });
    }
  }
}
