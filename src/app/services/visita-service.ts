import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Visita } from '../models/visita.interface';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../environments/environment';

const baseUrl = environment.baseUrl

const visitaEmpty: Visita = {
  id: -1,
  vendedor: undefined,
  cliente: undefined,
  fecha: '',
  estado: '',
  observaciones: ''
};

@Injectable({
  providedIn: 'root',
})
export class VisitaService {
  http = inject(HttpClient);

  // TODO implementar paginable
  //  clientesCache = new Map<, ResponseClientes>();
  visitaCache = new Map<number, Visita>();
  allVisitasCache = new Map<string, Visita[]>();

  //TODO APRENDER PORQUE GUARDAMOS EN CACHE Y NO EN LOCALSTORAGE
  getAll(): Observable<Visita[]> {
    const key = 'all-visitas';
    if (this.allVisitasCache.has(key)) {
      const cached = this.allVisitasCache.get(key) ?? [];
      return of(cached);
    }
    return this.http.get<Visita[]>(`${baseUrl}/visitas`).pipe(
      tap((resp) => console.log('respuesta', resp)),
      tap((resp) => this.allVisitasCache.set(key, resp))
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

  getById(id: number): Observable<Visita> {
    if (id == -1) {
      return of(visitaEmpty);
    }

    if (this.visitaCache.has(id)) {
      return of(this.visitaCache.get(id)!);
    }

    return this.http
      .get<Visita>(`${baseUrl}/visitas/${id}`)
      .pipe(tap((res) => this.visitaCache.set(id, res)));
  }

  update(id: number, entLike: Partial<Visita>): Observable<Visita> {
    return this.http
      .put<Visita>(`${baseUrl}/visitas/${id}`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  create(entLike: Partial<Visita>): Observable<Visita> {
    return this.http
      .post<Visita>(`${baseUrl}/visitas`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  updateCache(entidad: Visita) {
    const entidadId = entidad.id;

    this.visitaCache.set(entidadId!, entidad);

    this.allVisitasCache.forEach((res) => {
      res.map((res) => (res.id === entidadId ? entidad : res));
    });

    console.log('Caché actualizado');
  }

  delete(id: number) {
    return this.http.delete<void>(`${baseUrl}/visitas/${id}`);
  }

  clearCache() {
    this.allVisitasCache.clear();
  }
}
