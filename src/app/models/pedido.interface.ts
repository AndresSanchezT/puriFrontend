import { Producto } from "./producto.interface";

export interface Pedido {
  id?: number;
  id_vendedor: number; // solo usuarios con rol VENDEDOR/ADMINISTRADOR/REPARTIDOR
  id_cliente: number;
  visita_id: number;
  fechaPedido: string; // LocalDate → string ISO en Angular
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  observaciones: string;
  productos: Carrito[];
}

export interface Carrito {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}
