export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  direccion: string;
  telefono: string;
  latitud?: number;
  longitud?: number;
  tieneCredito: boolean;
}
