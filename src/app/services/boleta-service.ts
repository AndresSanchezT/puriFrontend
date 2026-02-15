import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Boleta } from '../models/boleta.interface';
import { Observable, of, tap } from 'rxjs';
import { EstadoBoleta } from '../models/responses/response-estado.interface';
import jsPDF from 'jspdf';

// pedido.service.ts - Agregar este método

// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { Boleta } from '../models/boleta.interface'; // Tu interface existente

// ✅ Interface para el DTO que viene del backend (endpoint /datos)
export interface BoletaDTO {
  id: number;
  codigo: string;
  fechaEmision: string; // Ya viene formateada como "dd/MM/yyyy"
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  observaciones?: string;
  cliente: {
    nombreContacto: string;
    direccion?: string;
    telefono?: string;
  };
  detalles: Array<{
    codigoProducto?: string;
    nombreProducto?: string;
    unidadMedida?: string;
    cantidad?: number;
    precioUnitario?: number;
    subtotalDetalle?: number;
  }>;
}

const baseUrl = environment.baseUrl;
export interface BoletaData {
  codigo: string;
  fechaEmision: string;
  subtotal: number;
  igv: number;
  total: number;
  observaciones?: string;
  cliente: {
    nombreContacto: string;
    direccion?: string;
    telefono?: string;
  };
  detalles: DetalleBoletaDTO[];
}

export interface DetalleBoletaDTO {
  codigoProducto?: string;
  nombreProducto?: string;
  unidadMedida?: string;
  cantidad?: number;
  precioUnitario?: number;
  subtotalDetalle?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BoletaService {
  // Datos de la empresa
  private readonly EMPRESA = {
    ruc: '10482635569',
    nombre: 'INVERSIONES PURI',
    eslogan: 'VENTAS AL POR MAYOR Y MENOR DE EMBUTIDOS, BOLSAS, QUESOS Y MÁS.',
    telefono: '987437118',
  };

  http = inject(HttpClient);

  boletaCache = new Map<number, Boleta>();
  boletasCache = new Map<string, Boleta[]>();

  generarBoleta(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${baseUrl}/boletas/${id}/pdf`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  getDatosBoletaParaPDF(boletaId: number): Observable<BoletaDTO> {
    return this.http.get<BoletaDTO>(`${baseUrl}/boletas/${boletaId}/datos`);
  }

  getBoletasDeHoyRegistrados(): Observable<Boleta[]> {
    return this.http.get<Boleta[]>(`${baseUrl}/boletas/hoy`);
  }

  getAll(): Observable<Boleta[]> {
    return this.http
      .get<Boleta[]>(`${baseUrl}/boletas`)
      .pipe(tap((resp) => console.log('respuesta', resp)));
  }

  getById(id: number): Observable<Boleta> {
    if (this.boletaCache.has(id)) {
      return of(this.boletaCache.get(id)!);
    }

    return this.http
      .get<Boleta>(`${baseUrl}/boletas/${id}/datos`)
      .pipe(tap((res) => this.boletaCache.set(id, res)));
  }

  update(id: number, entLike: Partial<Boleta>): Observable<Boleta> {
    return this.http
      .put<Boleta>(`${baseUrl}/boletas/${id}`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  create(entLike: Partial<Boleta>): Observable<Boleta> {
    return this.http
      .post<Boleta>(`${baseUrl}/boletas`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  updateCache(entidad: Boleta) {
    const entidadId = entidad.id;

    this.boletaCache.set(entidadId, entidad);

    this.boletasCache.forEach((res) => {
      res.map((res) => (res.id === entidadId ? entidad : res));
    });

    console.log('Caché actualizado');
  }

  actualizarEstadoBoleta(id: number, motivo: EstadoBoleta): Observable<string> {
    return this.http.put<string>(`${baseUrl}/boletas/${id}/estado`, motivo, {
      responseType: 'text' as 'json',
    });
  }

  delete(id: number) {
    return this.http.delete<void>(`${baseUrl}/boletas/${id}`);
  }

  clearCache() {
    this.boletasCache.clear();
  }

  /**
   * Genera el PDF de la boleta
   */
  async cargarLogoDesdeAssets(): Promise<string> {
    try {
      const response = await fetch('/assets/images/puri_logo.png');
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error cargando logo:', error);
      return ''; // Retorna vacío si falla
    }
  }

  FONT_SCALE = 1.15;
  private fs(size: number, scale: number): number {
    return size * scale;
  }

  generarBoletaPDF(boleta: BoletaData, logoBase64?: string): void {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Configuración

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = 297;
    const mediaHoja = 148.5;
    const margin = 8;

    const fondoBoletaSuperior = mediaHoja - 20;
    const fondoBoletaInferior = pageHeight - 20;

    // ===== BOLETA SUPERIOR (Primera copia) =====
    let yPos = 6; // Margen superior reducido
    yPos = this.dibujarEncabezado(doc, yPos, margin, pageWidth, logoBase64, boleta);
    yPos = this.dibujarDatosCliente(doc, yPos, margin, boleta, pageWidth);
    yPos = this.dibujarTablaProductos(doc, yPos, margin, pageWidth, boleta.detalles);
    this.dibujarTotalesYObservaciones(doc, fondoBoletaSuperior, margin, pageWidth, boleta);

    // ===== LÍNEA PUNTEADA DE CORTE =====
    this.dibujarLineaCorte(doc, mediaHoja, pageWidth);

    // ===== BOLETA INFERIOR (Segunda copia) =====
    yPos = mediaHoja + 6; // Margen superior reducido
    yPos = this.dibujarEncabezado(doc, yPos, margin, pageWidth, logoBase64, boleta);
    yPos = this.dibujarDatosCliente(doc, yPos, margin, boleta, pageWidth);
    yPos = this.dibujarTablaProductos(doc, yPos, margin, pageWidth, boleta.detalles);
    this.dibujarTotalesYObservaciones(doc, fondoBoletaInferior, margin, pageWidth, boleta);

    // Abrir PDF en nueva pestaña
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }

  /**
   * Dibuja una línea punteada de corte entre las dos boletas
   */
  private dibujarLineaCorte(doc: jsPDF, yPos: number, pageWidth: number): void {
    // Dibujar línea punteada manualmente (ya que setLineDash no está disponible)
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);

    // Dibujar guiones de 3mm con espacios de 3mm
    const margen = 10;
    const anchoTotal = pageWidth - margen * 2;
    const longitudGuion = 3;
    const espacioGuion = 3;
    let x = margen;

    while (x < pageWidth - margen) {
      const finGuion = Math.min(x + longitudGuion, pageWidth - margen);
      doc.line(x, yPos, finGuion, yPos);
      x += longitudGuion + espacioGuion;
    }

    // Texto de tijeras (opcional)
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('✂', 5, yPos + 1);
    doc.text('✂', pageWidth - 8, yPos + 1);
  }

  private dibujarEncabezado(
    doc: jsPDF,
    yPos: number,
    margin: number,
    pageWidth: number,
    logoBase64: string | undefined,
    boleta: BoletaData,
  ): number {
    const inicioY = yPos;

    // ===== LOGO (izquierda) - MÁS PEQUEÑO =====
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, yPos, 30, 22); // Reducido de 22 a 18
      } catch (e) {
        console.warn('Error cargando logo:', e);
      }
    }

    // ===== DATOS DE LA EMPRESA (centro-izquierda) =====
    const xEmpresa = margin + 21;
    doc.setFontSize(this.fs(8, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 153);
    doc.text('INVERSIONES', xEmpresa + 55, yPos + 3.5);

    doc.setFontSize(this.fs(20, this.FONT_SCALE));
    doc.text('P U R I', xEmpresa + 53, yPos + 11);

    doc.setFontSize(this.fs(7, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(this.EMPRESA.eslogan, xEmpresa + 8, yPos + 15);
    doc.text(`PEDIDOS AL: ${this.EMPRESA.telefono}`, xEmpresa + 47, yPos + 18);

    // ===== RECUADRO BOLETA (derecha) - MÁS COMPACTO =====
    const rectX = pageWidth - margin - 52; // Reducido de 56 a 52
    const rectY = inicioY;
    const rectWidth = 52;
    const rectHeight = 19; // Reducido de 22 a 19

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.7);
    doc.rect(rectX, rectY, rectWidth, rectHeight);

    doc.setFontSize(this.fs(10, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.text(`R.U.C. ${this.EMPRESA.ruc}`, rectX + rectWidth / 2, rectY + 4.5, { align: 'center' });

    doc.setFontSize(this.fs(10, this.FONT_SCALE));
    doc.text('BOLETA DE VENTA', rectX + rectWidth / 2, rectY + 10.5, { align: 'center' });

    doc.setFontSize(this.fs(10, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.text(`${boleta.codigo}`, rectX + rectWidth / 2, rectY + 16, { align: 'center' });

    return inicioY + 20; // Reducido de 25 a 20
  }

  private dibujarDatosCliente(
    doc: jsPDF,
    yPos: number,
    margin: number,
    boleta: BoletaData,
    pageWidth: number,
  ): number {
    // Recuadro con borde - MÁS COMPACTO
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    const alturaRecuadro = 16; // Reducido de 18 a 16
    const contentWidth = pageWidth - margin * 2;
    doc.rect(margin, yPos, contentWidth, alturaRecuadro);

    doc.setFontSize(this.fs(7.5, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');

    // CLIENTE
    doc.text('CLIENTE:', margin + 2, yPos + 4.5);
    doc.setFont('helvetica', 'normal');
    const nombreCliente = this.truncarTexto(doc, boleta.cliente.nombreContacto.toUpperCase(), 100);
    doc.text(nombreCliente, margin + 18, yPos + 4.5);

    // DIRECCIÓN
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECCIÓN:', margin + 2, yPos + 8.5);
    doc.setFont('helvetica', 'normal');
    const direccion = this.truncarTexto(doc, (boleta.cliente.direccion || '-').toUpperCase(), 100);
    doc.text(direccion, margin + 21, yPos + 8.5);

    // RUC
    doc.setFont('helvetica', 'bold');
    doc.text('RUC:', margin + 2, yPos + 12.5);

    // FECHA (derecha) - Tabla compacta
    const fechaY = yPos + 5;
    const fechaX = pageWidth - margin - 60;

    const labelWidth = 14;
    const colFecha = 14;
    const filaAltura = 5;
    const totalWidth = colFecha * 3;

    // Label FECHA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(this.fs(8.5, this.FONT_SCALE));
    doc.setTextColor(0, 0, 0);
    doc.text('FECHA:', fechaX, fechaY + 9);

    // ==================
    // FONDO AZUL (HEADER)
    // ==================
    doc.setFillColor(0, 51, 153); // azul
    doc.rect(fechaX + labelWidth, fechaY, totalWidth, filaAltura, 'F');

    // ==================
    // MARCO Y LÍNEAS
    // ==================
    doc.setDrawColor(0);
    doc.rect(fechaX + labelWidth, fechaY, totalWidth, filaAltura * 2);

    // Líneas verticales
    doc.line(
      fechaX + labelWidth + colFecha,
      fechaY,
      fechaX + labelWidth + colFecha,
      fechaY + filaAltura * 2,
    );
    doc.line(
      fechaX + labelWidth + colFecha * 2,
      fechaY,
      fechaX + labelWidth + colFecha * 2,
      fechaY + filaAltura * 2,
    );

    // Línea horizontal
    doc.line(
      fechaX + labelWidth,
      fechaY + filaAltura,
      fechaX + labelWidth + totalWidth,
      fechaY + filaAltura,
    );

    // ==================
    // TEXTO HEADER (BLANCO)
    // ==================
    doc.setFontSize(this.fs(8, this.FONT_SCALE));
    doc.setTextColor(255, 255, 255);

    doc.text('DIA', fechaX + labelWidth + colFecha * 0.5, fechaY + 3.5, { align: 'center' });
    doc.text('MES', fechaX + labelWidth + colFecha * 1.5, fechaY + 3.5, { align: 'center' });
    doc.text('AÑO', fechaX + labelWidth + colFecha * 2.5, fechaY + 3.5, { align: 'center' });

    const [dia, mes, anio] = boleta.fechaEmision.split('/');

    // ==================
    // VALORES (NEGRO)
    // ==================
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(this.fs(9.5, this.FONT_SCALE));
    doc.setTextColor(0, 0, 0);

    doc.text(dia, fechaX + labelWidth + colFecha * 0.5, fechaY + 9, { align: 'center' });
    doc.text(mes, fechaX + labelWidth + colFecha * 1.5, fechaY + 9, { align: 'center' });
    doc.text(anio, fechaX + labelWidth + colFecha * 2.5, fechaY + 9, { align: 'center' });

    return yPos + 17;
  }

  private dibujarTablaProductos(
    doc: jsPDF,
    yPos: number,
    margin: number,
    pageWidth: number,
    detalles: DetalleBoletaDTO[],
  ): number {
    const tableWidth = pageWidth - margin * 2;

    // Anchos de columnas
    const colWidths = {
      cant: 12,
      um: 12,
      descripcion: 110,
      pUnit: 30,
      importe: 30,
    };

    // ===== ENCABEZADO DE TABLA =====
    doc.setFillColor(0, 51, 153);
    doc.rect(margin, yPos, tableWidth, 5.5, 'F');

    doc.setFontSize(this.fs(7.5, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    let xPos = margin + 1;
    doc.text('CANT.', xPos + colWidths.cant / 2, yPos + 3.8, { align: 'center' });
    xPos += colWidths.cant;
    doc.text('U.M', xPos + colWidths.um / 2, yPos + 3.8, { align: 'center' });
    xPos += colWidths.um;
    doc.text('DESCRIPCIÓN', xPos + 50, yPos + 3.8);
    xPos += colWidths.descripcion;
    doc.text('P. UNIT.', xPos + colWidths.pUnit / 2, yPos + 3.8, { align: 'center' });
    xPos += colWidths.pUnit;
    doc.text('IMPORTE', xPos + colWidths.importe / 2, yPos + 3.8, { align: 'center' });

    yPos += 5.5;

    // ===== FILAS DE PRODUCTOS (máximo 17) =====
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(this.fs(8, this.FONT_SCALE));

    const FILAS_FIJAS = 17;
    const alturaFila = 4.7;
    const detallesConVacios = [...detalles];

    while (detallesConVacios.length < FILAS_FIJAS) {
      detallesConVacios.push({});
    }

    // Fondo alternado
    detallesConVacios.slice(0, FILAS_FIJAS).forEach((detalle, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 248, 252);
        doc.rect(margin, yPos, tableWidth, alturaFila, 'F');
      }

      xPos = margin + 1;
      const yText = yPos + 3.2;

      // CANTIDAD
      if (detalle.cantidad !== undefined && detalle.cantidad !== null) {
        let cantidadTexto: string;

        const esMedidaEspecial =
          detalle.unidadMedida && ['MLD', 'KGR', 'KG'].includes(detalle.unidadMedida.toUpperCase());

        if (esMedidaEspecial) {
          cantidadTexto = this.convertirAFraccion(detalle.cantidad);
        } else {
          cantidadTexto = String(detalle.cantidad);
        }

        doc.text(cantidadTexto, xPos + colWidths.cant / 2, yText, { align: 'center' });
      }

      xPos += colWidths.cant;

      // UNIDAD MEDIDA
      if (detalle.unidadMedida) {
        doc.text(detalle.unidadMedida, xPos + colWidths.um / 2, yText, { align: 'center' });
      }

      xPos += colWidths.um;

      // DESCRIPCIÓN
      if (detalle.nombreProducto) {
        const maxWidth = colWidths.descripcion - 6;
        const texto = this.truncarTexto(doc, detalle.nombreProducto.toUpperCase(), maxWidth);
        doc.text(texto, xPos + 3, yText);
      }

      xPos += colWidths.descripcion;

      // PRECIO UNITARIO
      if (detalle.precioUnitario !== undefined && detalle.precioUnitario !== null) {
        doc.text(
          this.formatearNumero(detalle.precioUnitario, 2),
          xPos + colWidths.pUnit - 3,
          yText,
          { align: 'right' },
        );
      }

      xPos += colWidths.pUnit;

      // ===== IMPORTE/SUBTOTAL (MODIFICADO) =====
      if (detalle.precioUnitario !== undefined && detalle.precioUnitario !== null) {
        // Verificar si es SALCHICHA HUACHANA y si es múltiplo de 5
        const esSalchichaHuachana =
          detalle.nombreProducto &&
          detalle.nombreProducto.toUpperCase().includes('SALCHICHA HUACHANA');

        const esQuesoMantecoso =
          detalle.nombreProducto &&
          detalle.nombreProducto.toUpperCase().includes('QUESO MANTECOSO');

        const esMultiploDeCinco =
          detalle.cantidad !== undefined && detalle.cantidad !== null && detalle.cantidad % 5 === 0;

        // Mostrar subtotal si:
        // 1. Es SALCHICHA HUACHANA Y es múltiplo de 5, O
        // 2. Es QUESO MANTECOSO (siempre mostrar), O
        // 3. El subtotal existe normalmente
        if (
          (esSalchichaHuachana && esMultiploDeCinco) ||
          esQuesoMantecoso ||
          (detalle.subtotalDetalle !== undefined && detalle.subtotalDetalle !== null)
        ) {
          // Calcular el subtotal para casos especiales o si no existe
          const subtotalMostrar =
            esSalchichaHuachana || esQuesoMantecoso
              ? detalle.cantidad! * detalle.precioUnitario
              : (detalle.subtotalDetalle ?? detalle.cantidad! * detalle.precioUnitario);

          doc.text(this.formatearNumero(subtotalMostrar, 2), xPos + colWidths.importe - 6, yText, {
            align: 'right',
          });
        }
      }
      yPos += alturaFila;
    });

    // Línea final de tabla
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    return yPos + 1.5;
  }

  private dibujarTotalesYObservaciones(
    doc: jsPDF,
    yPos: number,
    margin: number,
    pageWidth: number,
    boleta: BoletaData,
  ): void {
    // Recuadro con borde - DOBLE DE ALTO
    const contentWidth = pageWidth - margin * 2;
    const alturaRecuadro = 12; // Aumentado de 6 a 12 (doble)

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, contentWidth, alturaRecuadro);

    const labelWidth = 26;
    const obsX = margin + labelWidth;
    const xLabel = pageWidth - margin - 60;
    const obsMaxWidth = xLabel - obsX - 2;

    // ===== OBSERVACIONES (izquierda) =====
    doc.setFontSize(this.fs(7, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACION:', margin + 2, yPos + 5);

    // Texto de observaciones - ahora con más espacio para 2 líneas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(this.fs(8, this.FONT_SCALE));
    doc.setTextColor(255, 0, 0);

    const observacionTexto = boleta.observaciones ? boleta.observaciones.toUpperCase() : '-';
    const observacionSplit = doc.splitTextToSize(observacionTexto, obsMaxWidth);

    // Mostrar hasta 2 líneas de observaciones
    if (observacionSplit.length > 0) {
      doc.text(observacionSplit[0], obsX, yPos + 5);
    }
    if (observacionSplit.length > 1) {
      doc.text(observacionSplit[1], obsX, yPos + 9);
    }

    // ===== MONTO TOTAL (derecha) - MÁS GRANDE =====
    doc.setTextColor(0, 0, 0);
    const xValue = pageWidth - margin - 4;

    doc.setFontSize(this.fs(9, this.FONT_SCALE));
    doc.setFont('helvetica', 'bold');
    doc.text('MONTO TOTAL S/.', xLabel, yPos + 8);

    // Verificar si hay productos KGR/MLD que NO sean QUESO MANTECOSO
    const tieneProductoKGRoMLD = boleta.detalles.some(
      (d) =>
        d.unidadMedida &&
        ['KGR', 'MLD', 'KG'].includes(d.unidadMedida.toUpperCase()) &&
        !(d.nombreProducto && d.nombreProducto.toUpperCase().includes('QUESO MANTECOSO')),
    );

    if (!tieneProductoKGRoMLD) {
      doc.setFontSize(this.fs(14, this.FONT_SCALE));
      doc.setFont('helvetica', 'bold');
      const totalTexto = this.formatearNumero(boleta.total, 2);
      doc.text(totalTexto, xValue, yPos + 8, { align: 'right' });
    }

    // ===== PIE DE PÁGINA =====
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('¡GRACIAS POR SU COMPRA!', pageWidth / 2, yPos + 17, {
      align: 'center',
    });
  }

  // ===== UTILIDADES =====

  private formatearNumero(numero: number, decimales: number = 0): string {
    return numero.toFixed(decimales);
  }

  private convertirAFraccion(numero: number): string {
    const parteEntera = Math.floor(numero);
    const parteDecimal = numero - parteEntera;

    // Si no hay parte decimal, devolver solo el entero
    if (parteDecimal === 0) {
      return String(parteEntera);
    }

    // Caracteres Unicode para fracciones
    let simboloFraccion = '';

    if (Math.abs(parteDecimal - 0.5) < 0.01) {
      simboloFraccion = '½'; // U+00BD
    } else if (Math.abs(parteDecimal - 0.25) < 0.01) {
      simboloFraccion = '¼'; // U+00BC
    } else if (Math.abs(parteDecimal - 0.75) < 0.01) {
      simboloFraccion = '¾'; // U+00BE
    } else if (Math.abs(parteDecimal - 0.33) < 0.02) {
      simboloFraccion = '⅓'; // U+2153
    } else if (Math.abs(parteDecimal - 0.67) < 0.02) {
      simboloFraccion = '⅔'; // U+2154
    } else {
      // Si no es una fracción común, mostrar el decimal
      return String(numero);
    }

    // Construir el resultado
    if (parteEntera === 0) {
      return simboloFraccion; // Solo "½"
    } else {
      return `${parteEntera}${simboloFraccion}`; // "3½" (sin espacio)
    }
  }

  private truncarTexto(doc: jsPDF, texto: string, maxWidth: number): string {
    let resultado = texto;
    while (doc.getTextWidth(resultado) > maxWidth && resultado.length > 0) {
      resultado = resultado.slice(0, -1);
    }
    if (resultado.length < texto.length) {
      resultado += '...';
    }
    return resultado;
  }

  async generarBoletasMultiplesPDF(boletasIds: number[], logoBase64?: string): Promise<void> {
    if (boletasIds.length === 0) {
      throw new Error('No hay boletas para generar');
    }

    const doc = new jsPDF('portrait', 'mm', 'a4');
    let primeraBoleta = true;

    try {
      // Obtener datos de todas las boletas
      const promesasBoletas = boletasIds.map((id) => this.getDatosBoletaParaPDF(id).toPromise());

      const boletas = await Promise.all(promesasBoletas);

      // Generar cada boleta en el PDF
      for (const boleta of boletas) {
        if (!boleta) continue;

        // Agregar nueva página para cada boleta (excepto la primera)
        if (!primeraBoleta) {
          doc.addPage();
        }
        primeraBoleta = false;

        // Generar las dos copias de la boleta en la página actual
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = 297;
        const mediaHoja = 148.5;
        const margin = 8;

        const fondoBoletaSuperior = mediaHoja - 20;
        const fondoBoletaInferior = pageHeight - 20;

        // ===== BOLETA SUPERIOR =====
        let yPos = 6;
        yPos = this.dibujarEncabezado(doc, yPos, margin, pageWidth, logoBase64, boleta);
        yPos = this.dibujarDatosCliente(doc, yPos, margin, boleta, pageWidth);
        yPos = this.dibujarTablaProductos(doc, yPos, margin, pageWidth, boleta.detalles);
        this.dibujarTotalesYObservaciones(doc, fondoBoletaSuperior, margin, pageWidth, boleta);

        // ===== LÍNEA DE CORTE =====
        this.dibujarLineaCorte(doc, mediaHoja, pageWidth);

        // ===== BOLETA INFERIOR =====
        yPos = mediaHoja + 6;
        yPos = this.dibujarEncabezado(doc, yPos, margin, pageWidth, logoBase64, boleta);
        yPos = this.dibujarDatosCliente(doc, yPos, margin, boleta, pageWidth);
        yPos = this.dibujarTablaProductos(doc, yPos, margin, pageWidth, boleta.detalles);
        this.dibujarTotalesYObservaciones(doc, fondoBoletaInferior, margin, pageWidth, boleta);
      }

      // Abrir PDF en nueva pestaña
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } catch (error) {
      console.error('Error generando boletas múltiples:', error);
      throw new Error('No se pudieron generar todas las boletas');
    }
  }
}
