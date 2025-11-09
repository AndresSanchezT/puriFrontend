import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Pedido } from '../models/pedido.interface';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../environments/environment';

const baseUrl = environment.baseUrl;

const emptyPedido: Pedido = {
  id: -1,
  id_vendedor: 0,
  id_cliente: 0,
  visita_id: 0,
  fechaPedido: '',
  subtotal: 0,
  igv: 0,
  total: 0,
  estado: '',
  observaciones: '',
  productos: [],
};

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  constructor() {}

  http = inject(HttpClient);

  // TODO implementar paginable
  //  clientesCache = new Map<, ResponsePedidos>();
  pedidosCache = new Map<number, Pedido>();
  allPedidosCache = new Map<string, Pedido[]>();

  getAll(): Observable<Pedido[]> {
    const key = 'all-pedidos';
    if (this.allPedidosCache.has(key)) {
      const cached = this.allPedidosCache.get(key) ?? [];
      return of(cached);
    }
    return this.http.get<Pedido[]>(`${baseUrl}/pedidos`).pipe(
      tap((resp) => console.log('respuesta', resp)),
      tap((resp) => this.allPedidosCache.set(key, resp))
    );
  }

  // getProducts(options: Options): Observable<ResponseProduct> {
  //   const { limit = 9, offset = 0, tipo = '' } = options;
  //   const key = `${limit}-${offset}-${tipo}`;

  //   if (this.productsCache.has(key)) {
  //     return of(this.productsCache.get(key)!);
  //   }

  //   return this.http
  //     .get<ResponseProduct>(`${baseUrl}/productos`, {
  //       params: { limit, offset, tipo },
  //     })
  //     .pipe(
  //       tap((resp) => console.log(resp)),
  //       tap((resp) => this.productsCache.set(key, resp))
  //     );
  // }

  getById(id: number): Observable<Pedido> {
    if (id == -1) {
      return of(emptyPedido);
    }

    if (this.pedidosCache.has(id)) {
      return of(this.pedidosCache.get(id)!);
    }

    return this.http
      .get<Pedido>(`${baseUrl}/pedidos/${id}`)
      .pipe(tap((res) => this.pedidosCache.set(id, res)));
  }

  update(id: number, entLike: Partial<Pedido>): Observable<Pedido> {
    return this.http
      .put<Pedido>(`${baseUrl}/pedidos/${id}`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  create(entLike: Partial<Pedido>): Observable<Pedido> {
    return this.http
      .post<Pedido>(`${baseUrl}/pedidos`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  updateCache(entidad: Pedido) {
    const entidadId = entidad.id;

    this.pedidosCache.set(entidadId!, entidad);

    this.allPedidosCache.forEach((res) => {
      res.map((res) => (res.id === entidadId ? entidad : res));
    });

    console.log('Caché actualizado');
  }

  delete(id: number) {
    return this.http.delete<void>(`${baseUrl}/pedidos/${id}`);
  }

  clearCache() {
    this.allPedidosCache.clear();
  }
}
