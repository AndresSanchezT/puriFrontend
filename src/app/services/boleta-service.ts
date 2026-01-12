import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Boleta } from '../models/boleta.interface';
import { Observable, of, tap } from 'rxjs';
import { EstadoBoleta } from '../models/responses/response-estado.interface';


const baseUrl = environment.baseUrl;

@Injectable({
  providedIn: 'root',
})
export class BoletaService {
  http = inject(HttpClient);

  boletaCache = new Map<number, Boleta>();
  boletasCache = new Map<string, Boleta[]>();

  generarBoleta(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${baseUrl}/boletas/${id}/pdf`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
  getAll(): Observable<Boleta[]> {
    return this.http.get<Boleta[]>(`${baseUrl}/boletas`).pipe(
      tap((resp) => console.log('respuesta', resp))
    );
  }

  getById(id: number): Observable<Boleta> {
    if (this.boletaCache.has(id)) {
      return of(this.boletaCache.get(id)!);
    }

    return this.http
      .get<Boleta>(`${baseUrl}/boletas/${id}`)
      .pipe(tap((res) => this.boletaCache.set(id, res)));
  }

  update(id: number, entLike: Partial<Boleta>): Observable<Boleta> {
    return this.http
      .put<Boleta>(`${baseUrl}/boletas/${id}`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  create(entLike: Partial<Boleta>): Observable<Boleta> {
    return this.http
      .post<Boleta>(`${baseUrl}/boletas`, entLike)
      .pipe(tap((res) => this.updateCache(res)));
  }

  updateCache(entidad: Boleta) {
    const entidadId = entidad.id;

    this.boletaCache.set(entidadId, entidad);

    this.boletasCache.forEach((res) => {
      res.map((res) => (res.id === entidadId ? entidad : res));
    });

    console.log('Caché actualizado');
  }

  actualizarEstadoBoleta(id: number, motivo: EstadoBoleta): Observable<string> {
    return this.http.put<string>(`${baseUrl}/boletas/${id}/estado`, motivo, {
      responseType: 'text' as 'json',
    });
  }

  delete(id: number) {
    return this.http.delete<void>(`${baseUrl}/boletas/${id}`);
  }

  clearCache() {
    this.boletasCache.clear();
  }
}
