import { Producto } from "./producto.interface";
import { Pedido } from "./pedido.interface";


export interface DetallePedido {
  id?: number;
  producto: Producto;
  cantidad: number;
  subtotal: number;
  pedido?: Pedido;
}
