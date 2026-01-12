export interface DatosProductoConsolidado {
  id: number;
  nombreProducto: string;
  totalProductos: number;
  stockActual: number;
  stockMinimo: number;
  estado: string;
  unidadMedida: string;
  cantidadesPorPedido?: string;
}
