import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Cliente } from '../models/cliente.interface';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';


const baseUrl = environment.baseUrl;

const emptyCliente : Cliente = {
  id: -1,
  nombreContacto: '',
  nombreNegocio: '',
  direccion: '',
  referencia: '',
  estado: '',
  telefono: '',
  fechaRegistro: '',
  fechaActualizacion: '',
  latitud: 0,
  longitud: 0,
  tieneCredito: false
}


@Injectable({
  providedIn: 'root',
})
export class ClienteService {
   http = inject(HttpClient);

  // TODO implementar paginable
  //  clientesCache = new Map<, ResponseClientes>();
   clienteCache = new Map<number, Cliente>();
   allClientesCache = new Map<string, Cliente[]>();

  getAll(): Observable<Cliente[]> {
    const key = 'all-clientes';
    if (this.allClientesCache.has(key)) {
      const cached = this.allClientesCache.get(key) ?? [];
      return of(cached);
    }
    return this.http.get<Cliente[]>(`${baseUrl}/clientes`).pipe(
      tap((resp) => console.log('respuesta', resp)),
      tap((resp) => this.allClientesCache.set(key, resp))
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

  getById(id: number): Observable<Cliente> {
    if (id == -1) {
      return of(emptyCliente);
    }

    if (this.clienteCache.has(id)) {
      return of(this.clienteCache.get(id)!);
    }

    return this.http
      .get<Cliente>(`${baseUrl}/clientes/${id}`)
      .pipe(tap((res) => this.clienteCache.set(id, res)));
  }

  update(id: number, entLike: Partial<Cliente>): Observable<Cliente> {
    return this.http
      .put<Cliente>(`${baseUrl}/clientes/${id}`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  create(entLike: Partial<Cliente>): Observable<Cliente> {
    return this.http
      .post<Cliente>(`${baseUrl}/clientes`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  updateCache(entidad: Cliente) {
    const entidadId = entidad.id;

    this.clienteCache.set(entidadId, entidad);

    this.allClientesCache.forEach((res) => {
      res.map((res) => (res.id === entidadId ? entidad : res));
    });

    console.log('Caché actualizado');
  }

  delete(id: number) {
    return this.http.delete<void>(`${baseUrl}/clientes/${id}`);
  }

  clearCache() {
    this.allClientesCache.clear();
  }
}
