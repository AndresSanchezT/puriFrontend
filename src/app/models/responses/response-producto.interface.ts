import { Producto } from "../producto.interface";

export interface ResponseProduct {
  content: Producto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
