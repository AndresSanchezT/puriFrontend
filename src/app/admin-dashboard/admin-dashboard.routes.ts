import { Routes } from '@angular/router';
import { AdminDashboardLayoutComponent } from './layouts/admin-dashboard-layout/admin-dashboard-layout';
import { ListaClientes } from './pages/clientes/lista-clientes/lista-clientes';
import { ListaUsuarios } from './pages/usuarios/lista-usuarios/lista-usuarios';
import { RegistrarUsuario } from './pages/usuarios/registrar-usuario/registrar-usuario';
import { AsignarCliente } from './pages/clientes/asignar-cliente/asignar-cliente';
import { ListaVendedores } from './pages/vendedores/lista-vendedores/lista-vendedores';
import { RegistrarVendedor } from './pages/vendedores/registrar-vendedor/registrar-vendedor';
import { ListaVisitas } from './pages/visitas/lista-visitas/lista-visitas';
import { RegistrarVisita } from './pages/visitas/registrar-visita/registrar-visita';
import { ListaPedidos } from './pages/pedidos/lista-pedidos/lista-pedidos';
import { RegistrarPedido } from './pages/pedidos/registrar-pedido/registrar-pedido';
import { ConsultarStock } from './pages/productos/consultar-stock/consultar-stock';
import { GestionarProductos } from './pages/productos/gestionar-productos/gestionar-productos';
import { GenerarReportes } from './pages/reportes/generar-reportes/generar-reportes';
import { Dashboard } from './pages/dashboard/dashboard';


export const adminDashboardRoutes: Routes = [
  {
    path: '',
    component: AdminDashboardLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'usuarios/lista',
        component: ListaUsuarios,
      },
      {
        path: 'usuarios/registrar',
        component: RegistrarUsuario,
      },
      {
        path: 'clientes/lista',
        component: ListaClientes,
      },
      {
        path: 'clientes/asignar',
        component: AsignarCliente,
      },
      {
        path: 'vendedor/lista',
        component: ListaVendedores,
      },
      {
        path: 'vendedor/registrar',
        component: RegistrarVendedor,
      },
      {
        path: 'visitas/lista',
        component: ListaVisitas,
      },
      {
        path: 'visitas/registrar',
        component: RegistrarVisita,
      },
      {
        path: 'pedidos/lista',
        component: ListaPedidos,
      },
      {
        path: 'pedidos/registrar',
        component: RegistrarPedido,
      },
      {
        path: 'productos/stock',
        component: ConsultarStock,
      },
      {
        path: 'productos/gestionar',
        component: GestionarProductos,
      },
      {
        path: 'reportes/gestionar',
        component: GenerarReportes,
      },

      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default adminDashboardRoutes;
