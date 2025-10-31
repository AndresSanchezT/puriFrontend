export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  estado: string;
  tipo: string;
  descripcion: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}
