
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Pedido } from '../models/pedido.interface';
import { environment } from '../environments/environment';
import { DatosProductoConsolidado } from '../models/responses/response-consolidado.interface';
import { PedidoValidacionDTO } from '../models/responses/item-pedido.interface';
import { ProductoFaltante } from '../models/responses/pedido-faltante.interface';

const baseUrl = environment.baseUrl;

interface CambiarEstadoDTO {
  nuevoEstado: string;
  motivoAnulacion?: string;
}

interface RespuestaEstado {
  success: boolean;
  message: string;
  nuevoEstado?: string;
}

interface EliminarPedidosResponse {
  mensaje: string;
  eliminados: number;
  fechaLimite?: string;
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private http = inject(HttpClient);

  /** Obtiene todos los pedidos del backend */
  getAll(): Observable<Pedido[]> {
    return this.http
      .get<Pedido[]>(`${baseUrl}/pedidos`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  getPedidosHoy(): Observable<Pedido[]> {
    return this.http
      .get<Pedido[]>(`${baseUrl}/pedidos/hoy`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  getPedidosTotalesHoy(): Observable<Pedido[]> {
    return this.http
      .get<Pedido[]>(`${baseUrl}/pedidos/reporte/hoy`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  getPedidosTotalesManana(): Observable<Pedido[]> {
    return this.http
      .get<Pedido[]>(`${baseUrl}/pedidos/reporte/manana`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  getPedidosTotales(): Observable<number> {
    return this.http
      .get<number>(`${baseUrl}/pedidos/total`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  getDatosConsolidadoDeHoy(): Observable<DatosProductoConsolidado[]> {
    return this.http
      .get<DatosProductoConsolidado[]>(`${baseUrl}/pedidos/productos-registrados/hoy`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  getDatosConsolidadoDeManana(): Observable<DatosProductoConsolidado[]> {
    return this.http
      .get<DatosProductoConsolidado[]>(`${baseUrl}/pedidos/productos-registrados/manana`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  /** Obtiene un pedido por ID */
  getById(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${baseUrl}/pedidos/${id}`);
  }

  /** Crea un nuevo pedido simple */
  create(data: Partial<Pedido>): Observable<Pedido> {
    return this.http.post<Pedido>(`${baseUrl}/pedidos`, data);
  }

  /** Registrar pedido completo (con cliente y vendedor) */
  // registrar(data: Partial<Pedido>, idCliente: number, idVendedor: number): Observable<Pedido> {
  //   return this.http.post<Pedido>(`${baseUrl}/pedidos/registrar/${idCliente}/${idVendedor}`, data);
  // }
  //TODO VERIFICAR
  registrar(
    pedido: Partial<Pedido>,
    idCliente: number,
    idVendedor: number,
    forzar: boolean = false,
    tipoFecha: 'HOY' | 'MANANA' | 'PASADO_MANANA' = 'HOY',
  ): Observable<Pedido> {
    return this.http.post<Pedido>(
      `${baseUrl}/pedidos/registrar/${idCliente}/${idVendedor}?forzar=${forzar}&tipoFecha=${tipoFecha}`,
      pedido,
    );
  }

  registrarForzado(
    data: Partial<Pedido>,
    idCliente: number,
    idVendedor: number,
  ): Observable<Pedido> {
    return this.http.post<Pedido>(
      `${baseUrl}/pedidos/registrar/${idCliente}/${idVendedor}?forzar=true`,
      data,
    );
  }
  /** Actualiza un pedido existente */
  update(id: number, data: Partial<Pedido>): Observable<Pedido> {
    return this.http.put<Pedido>(`${baseUrl}/pedidos/${id}`, data);
  }

  /** Elimina un pedido */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${baseUrl}/pedidos/${id}`);
  }

  eliminarPedidosAntiguos(): Observable<EliminarPedidosResponse> {
    return this.http.delete<EliminarPedidosResponse>(`${baseUrl}/pedidos/antiguos`);
  }

  validateStock(dto: PedidoValidacionDTO): Observable<any[]> {
    return this.http.post<any[]>(`${baseUrl}/pedidos/validar-pedido`, dto.items);
  }

  getFaltantes(): Observable<ProductoFaltante[]> {
    return this.http
      .get<ProductoFaltante[]>(`${baseUrl}/pedidos/faltantes`)
      .pipe(tap(() => console.log('Solicitando HTTP')));
  }

  resetearProductosFaltantes(): Observable<void> {
    return this.http.delete<void>(`${baseUrl}/pedidos/resetear-faltantes`);
  }

  cambiarEstado(
    pedidoId: number,
    nuevoEstado: string,
    motivoAnulacion?: string,
  ): Observable<RespuestaEstado> {
    const body: CambiarEstadoDTO = {
      nuevoEstado,
      ...(motivoAnulacion && { motivoAnulacion }),
    };

    return this.http.patch<RespuestaEstado>(`${baseUrl}/pedidos/${pedidoId}/estado`, body);
  }
}
