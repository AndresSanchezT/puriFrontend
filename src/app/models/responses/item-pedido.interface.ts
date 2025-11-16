export interface itemPedido {
  productoId: number;
  cantidadSolicitada: number;
  stockActual?: number;
  cantidadFaltante?: number;
}

export interface PedidoValidacionDTO {
  items: itemPedido[];
}