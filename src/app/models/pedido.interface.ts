import { Cliente } from './cliente.interface';
import { Producto } from './producto.interface';
import { Usuario } from './usuario.interface';
import { Visita } from './visita.interface';

export interface Pedido {
  id?: number;
  vendedor?: Usuario;
  cliente?: Cliente;
  visita?: Visita;
  fechaPedido: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  observaciones: string;
  detallePedidos: DetallePedido[];
}

export interface DetallePedido {
  id?: number;
  producto: Producto; //
  cantidad: number;
  precioUnitario: number; //
  subtotal: number;
}
