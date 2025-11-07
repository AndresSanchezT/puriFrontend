import { Cliente } from "./cliente.interface";
import { DetallePedido } from "./detalle-pedido.interface";
import { Usuario } from "./usuario.interface";
import { Visita } from "./visita.interface";

export interface Pedido {
  id: number;
  vendedorId: number; // solo usuarios con rol VENDEDOR/ADMINISTRADOR/REPARTIDOR
  clienteId: number;
  visitaId: number;
  fechaPedido: string; // LocalDate → string ISO en Angular
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  observaciones: string;
  detallePedidosId: number;
}
