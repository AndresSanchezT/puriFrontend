import { Usuario } from "./usuario.interface";
import { Pedido } from './pedido.interface';

export interface Visita {
  id: number;
  fechaEntrega: string; // LocalDate → string ISO
  direccion: string;
  repartidor: Usuario; // solo usuarios con rol REPARTIDOR/ADMINISTRADOR/REPARTIDOR
  pedido: Pedido;
}
