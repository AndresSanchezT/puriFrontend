export interface itemPedido {
  productoId: number;
  nombre?:string;
  cantidadSolicitada: number;
  stockActual?: number;
  cantidadFaltante?: number;
}

export interface PedidoValidacionDTO {
  items: itemPedido[];
}
