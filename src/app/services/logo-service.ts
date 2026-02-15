import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LogoService {
  // ✅ Caché del logo
  private logoCache = signal<string>('');
  private cargando = signal<boolean>(false);

  /**
   * Obtiene el logo (desde caché o lo carga)
   */
  async getLogo(): Promise<string> {
    // Si ya está en caché, retornarlo
    if (this.logoCache()) {
      return this.logoCache();
    }

    // Si ya se está cargando, esperar
    if (this.cargando()) {
      return this.esperarCarga();
    }

    // Cargar por primera vez
    return this.cargarLogoDesdeAssets();
  }

  /**
   * Carga el logo desde assets (solo la primera vez)
   */
  private async cargarLogoDesdeAssets(): Promise<string> {
    if (this.logoCache()) {
      return this.logoCache();
    }

    this.cargando.set(true);

    try {
      // ✅ Ruta correcta para Angular 17+
      const response = await fetch('/images/puri_logo.png');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // ✅ Guardar en caché
      this.logoCache.set(base64);
      this.cargando.set(false);

      console.log('✅ Logo cargado y guardado en caché');
      return base64;
    } catch (error) {
      console.error('❌ Error cargando logo:', error);
      this.cargando.set(false);
      return ''; // Retorna vacío si falla
    }
  }

  /**
   * Espera a que termine de cargar (para llamadas concurrentes)
   */
  private async esperarCarga(): Promise<string> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.cargando()) {
          clearInterval(checkInterval);
          resolve(this.logoCache());
        }
      }, 50);
    });
  }

  /**
   * Limpia el caché (útil para testing o actualización)
   */
  limpiarCache(): void {
    this.logoCache.set('');
  }

  /**
   * Pre-carga el logo (llamar en ngOnInit del componente raíz)
   */
  async precargar(): Promise<void> {
    await this.cargarLogoDesdeAssets();
  }
}
