import { Cliente } from "./cliente.interface";
import { Usuario } from "./usuario.interface";


export interface Visita {
  id?: number;
  vendedor?: Usuario;
  cliente?: Cliente;
  fecha: string;
  estado: string;
  observaciones: string;
}
