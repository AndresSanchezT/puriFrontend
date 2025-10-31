import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Producto } from '../models/producto.interface';
import { Observable, of, tap } from 'rxjs';
import { ResponseProduct } from '../models/responses/response-producto.interface';

const baseUrl = environment.baseUrl;

interface Options {
  limit?: number;
  offset?: number;
  tipo?: string;
}

const emptyProduct: Producto = {
  id: -1,
  codigo: '',
  nombre: '',
  precio: 0,
  stockActual: 0,
  stockMinimo: 0,
  unidadMedida: '',
  estado: '',
  tipo: '',
  descripcion: '',
  fechaCreacion: '',
  fechaActualizacion: ''
};

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private http = inject(HttpClient);

  private productsCache = new Map<string, ResponseProduct>();
  private productCache = new Map<number, Producto>();

  getProducts(options: Options): Observable<ResponseProduct> {
    const { limit = 9, offset = 0, tipo = '' } = options;
    const key = `${limit}-${offset}-${tipo}`;

    if (this.productsCache.has(key)) {
      return of(this.productsCache.get(key)!);
    }

    return this.http
      .get<ResponseProduct>(`${baseUrl}/productos`, {
        params: { limit, offset, tipo },
      })
      .pipe(
        tap((resp) => console.log(resp)),
        tap((resp) => this.productsCache.set(key, resp))
      );
  }

  getProductById(id: number): Observable<Producto> {
    if (id == -1) {
      return of(emptyProduct);
    }

    if (this.productCache.has(id)) {
      return of(this.productCache.get(id)!);
    }

    return this.http
      .get<Producto>(`${baseUrl}/productos/${id}`)
      .pipe(tap((product) => this.productCache.set(id, product)));
  }

  updateProduct(id: number, productLike: Partial<Producto>): Observable<Producto> {
    return this.http
      .patch<Producto>(`${baseUrl}/productos/${id}`, productLike)
      .pipe(tap((product) => this.updateProductCache(product)));
  }

  createProduct(productLike: Partial<Producto>): Observable<Producto> {
    return this.http
      .post<Producto>(`${baseUrl}/productos`, productLike)
      .pipe(tap((product) => this.updateProductCache(product)));
  }

  updateProductCache(producto: Producto) {
    const productId = producto.id;

    this.productCache.set(productId, producto);

    this.productsCache.forEach((productResponse) => {
      productResponse.content = productResponse.content.map((currentProduct) =>
        currentProduct.id === productId ? producto : currentProduct
      );
    });

    console.log('Caché actualizado');
  }
}
