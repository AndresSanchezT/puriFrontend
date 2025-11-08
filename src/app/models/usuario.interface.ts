import { Visita } from "./visita.interface";
import { Pedido } from "./pedido.interface";

export type Rol = 'ADMIN' | 'VENDEDOR' | 'REPARTIDOR' | 'CLIENTE';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string;
  fechaCreacion: string;       // o Date si lo prefieres
  fechaActualizacion: string;
  estado: string,  // o Date si lo prefieres
  rol: Rol;
  visitas: Visita[];
  pedidos: Pedido[];
}
