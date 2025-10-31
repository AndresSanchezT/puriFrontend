export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  contrasena: string;
  rol: Rol;
}

export type Rol = 'ADMIN' | 'VENDEDOR' | 'REPARTIDOR' | 'CLIENTE';
