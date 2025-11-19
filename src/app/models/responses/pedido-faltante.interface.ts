export interface ProductoFaltante {
  id: number;
  productoId: number;
  nombreProducto: string;
  stockActual: number;
  cantidadSolicitada: number;
  cantidadFaltante:number;
}
