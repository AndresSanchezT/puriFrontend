import { Cliente } from "./cliente.interface";
import { DetallePedido } from "./detalle-pedido.interface";
import { Usuario } from "./usuario.interface";

export interface Pedido {
  id?: number;
  fecha: string; // LocalDate → string ISO en Angular
  vendedor: Usuario; // solo usuarios con rol VENDEDOR/ADMINISTRADOR/REPARTIDOR
  cliente: Cliente;
  detalles: DetallePedido[];
  aCredito: boolean;
}
