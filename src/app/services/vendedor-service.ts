import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Usuario } from '../models/usuario.interface';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { estadisticas } from '../models/responses/estadisticas.interface';

const baseUrl = environment.baseUrl;


const emptyVendedor: Usuario = {
  id: -1,
  nombre: '',
  correo: '',
  contrasena: '',
  telefono: '',
  estado: '',
  fechaCreacion: '', // o Date si lo prefieres
  fechaActualizacion: '', // o Date si lo prefieres
  rol: 'VENDEDOR',
  visitas: [],
  pedidos: [],
};

@Injectable({
  providedIn: 'root',
})
export class VendedorService {
  http = inject(HttpClient);

  // TODO implementar paginable
  //  clientesCache = new Map<, ResponseClientes>();
  vendedorCache = new Map<number, Usuario>();
  allVendedoresCache = new Map<string, Usuario[]>();

  getAll(): Observable<Usuario[]> {
    const key = 'all-vendedores';
    if (this.allVendedoresCache.has(key)) {
      const cached = this.allVendedoresCache.get(key) ?? [];
      return of(cached);
    }
    return this.http.get<Usuario[]>(`${baseUrl}/vendedores`).pipe(
      tap((resp) => console.log('respuesta', resp)),
      tap((resp) => this.allVendedoresCache.set(key, resp))
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

  getById(id: number): Observable<Usuario> {
    if (id == -1) {
      return of(emptyVendedor);
    }

    if (this.vendedorCache.has(id)) {
      return of(this.vendedorCache.get(id)!);
    }

    return this.http
      .get<Usuario>(`${baseUrl}/vendedores/${id}`)
      .pipe(tap((res) => this.vendedorCache.set(id, res)));
  }

  update(id: number, entLike: Partial<Usuario>): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${baseUrl}/vendedores/${id}`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  create(entLike: Partial<Usuario>): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${baseUrl}/vendedores`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  updateCache(entidad: Usuario) {
    const entidadId = entidad.id;

    this.vendedorCache.set(entidadId, entidad);

    this.allVendedoresCache.forEach((res) => {
      res.map((res) => (res.id === entidadId ? entidad : res));
    });

    console.log('Caché actualizado');
  }

  delete(id: number) {
    return this.http.delete<void>(`${baseUrl}/vendedores/${id}`);
  }

  clearCache() {
    this.allVendedoresCache.clear();
  }

  getEstadisticasGenerales(): Observable<estadisticas[]> {
    return this.http.get<estadisticas[]>(`${baseUrl}/vendedores/estadisticas`);
  }
}
