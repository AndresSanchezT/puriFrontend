import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';

import { PedidoService } from '../../../services/pedido-service';
import { ProductoService } from '../../../services/producto-service';
import { VendedorService } from '../../../services/vendedor-service';
import { VisitaService } from '../../../services/visita-service';
import { ClienteService } from '../../../services/cliente-service';
import { Pedido } from '../../../models/pedido.interface';
import { Visita } from '../../../models/visita.interface';
import { catchError, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private pedidoService = inject(PedidoService);
  private productoService = inject(ProductoService);
  private vendedorService = inject(VendedorService);

  error = signal('');
  success = signal('');

  loading = signal(true);

  stats = signal({
    totalUsuarios: 0,
    totalClientes: 0,
    pedidosHoy: 0,
    ventasMes: 0,
    productosStockBajo: 0,
    totalPedidos: 0,
  });

  pedidosRecientes = signal<Pedido[]>([]);

  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      vendedores: this.vendedorService.getAll().pipe(
        catchError(() => {
          this.error.set('Error al cargar vendedores');
          return of([]);
        })
      ),

      clientes: this.clienteService.getCountTotalClientes().pipe(
        catchError(() => {
          this.error.set('Error al cargar clientes');
          return of(0);
        })
      ),

      pedidosHoy: this.pedidoService.getPedidosHoy().pipe(
        catchError(() => {
          this.error.set('Error al cargar pedidos de hoy');
          return of([]);
        })
      ),

      pedidosTotales: this.pedidoService.getPedidosTotales().pipe(
        catchError(() => {
          this.error.set('Error al cargar conteo total de pedidos');
          return of(0);
        })
      ),

      productosStockBajo: this.productoService.getProductosStockBajo().pipe(
        catchError(() => {
          this.error.set('Error al cargar productos con stock bajo');
          return of(0);
        })
      ),

      // 👉 Se agrega la lista completa de pedidos
      todosLosPedidos: this.pedidoService.getAll().pipe(
        catchError(() => {
          this.error.set('Error al cargar todos los pedidos');
          return of([]);
        })
      ),
    }).subscribe({
      next: ({
        vendedores,
        clientes,
        pedidosHoy,
        pedidosTotales,
        productosStockBajo,
        todosLosPedidos,
      }) => {
        // ---- CÁLCULO ventasMes ----
        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const anioActual = ahora.getFullYear();

        const ventasMes = todosLosPedidos
          .filter((p) => {
            const fechaPedido = new Date(p.fechaPedido ?? '');
            return (
              fechaPedido.getMonth() === mesActual &&
              fechaPedido.getFullYear() === anioActual &&
              p.estado !== 'anulado'
            );
          })
          .reduce((sum, p) => sum + p.total, 0);

        const ventasMesRedondeado = Number(ventasMes.toFixed(2));
        // ---- ACTUALIZAR STATS ----
        this.stats.set({
          totalUsuarios: vendedores.length,
          totalClientes: clientes,
          pedidosHoy: pedidosHoy.length,
          productosStockBajo: productosStockBajo,
          totalPedidos: pedidosTotales,
          ventasMes: ventasMesRedondeado,
        });

        // ---- PEDIDOS RECIENTES ----
        this.pedidosRecientes.set(pedidosHoy.slice(0, 5));

        this.loading.set(false);
      },

      error: () => {
        this.error.set('Error general al cargar el dashboard');
        this.loading.set(false);
      },
    });
  }
}
