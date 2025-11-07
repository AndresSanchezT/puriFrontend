export interface Cliente {
  id: number
  nombreContacto: string,
  nombreNegocio: string,
  direccion: string,
  referencia: string,
  estado: string,
  telefono: string,
  fechaRegistro: string,
  fechaActualizacion: string,
  latitud?: number,
  longitud?: number,
  tieneCredito: boolean
}
