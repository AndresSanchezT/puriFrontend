import { Cliente } from "./cliente.interface";
import { Pedido } from "./pedido.interface";
import { Usuario } from "./usuario.interface";

export interface Boleta{
  id: number;
  codigo: string;
  pedido: Pedido;
  vendedor: Usuario;
  cliente: Cliente;
  fechaEmision: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  motivoAnulacion: string;
  fechaAnulacion: string;
  fechaRegistro: string;
}
