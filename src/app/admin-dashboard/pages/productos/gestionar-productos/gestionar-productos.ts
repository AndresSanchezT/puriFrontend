import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PaginationService } from '../../../../shared/components/pagination/pagination-service';
import { ProductoService } from '../../../../services/producto-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';



interface ProductRequest {
  page: number;
  limit: number;
}

@Component({
  selector: 'app-gestionar-productos',
  imports: [Pagination],
  templateUrl: './gestionar-productos.html',
})
export class GestionarProductos {
  productsService = inject(ProductoService);
  paginationService = inject(PaginationService);

  productsPerPage = signal(10);

  productsResource = rxResource({
    request: () => ({
      page: this.paginationService.currentPage() - 1,
      limit: this.productsPerPage(),
    }),
    loader: ({ request }) => {
      return this.productsService.getProducts({
        offset: request.page * 9,
        limit: request.limit,
      });
    },
  });
}
