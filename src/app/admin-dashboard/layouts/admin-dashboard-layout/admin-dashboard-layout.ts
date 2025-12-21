import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, LoginResponse } from '../../../services/auth-service';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-dashboard-layout.html'
})
export class AdminDashboardLayoutComponent {
  private router = inject(Router);
  authService = inject(AuthService)

  nombreUsuario = signal('');
  rolUsuario = signal('');

  constructor() {
    this.loadUserFromLocalStorage();
  }
  // Menú principal
  menuItems = [
    {
      title: 'Dashboard',
      path: '/admin/dashboard',
      icon: '🏠',
      permission: 'iniciar_sesion',
    },
    // {
    //   title: 'Usuarios',
    //   icon: '👥',
    //   permission: 'registrar_usuario',
    //   subItems: [
    //     {
    //       title: 'Registrar Usuario',
    //       path: '/admin/usuarios/registrar',
    //       permission: 'registrar_usuario',
    //     },
    //     {
    //       title: 'Lista Usuarios',
    //       path: '/admin/usuarios/lista',
    //       permission: 'registrar_usuario',
    //     },
    //   ],
    // },
    {
      title: 'Clientes',
      icon: '🏢',
      permission: 'mantener_cliente',
      path: '/admin/clientes/lista',
    },

    {
      title: 'Vendedores',
      icon: '🚗',
      permission: 'buscar_vendedor',
      path: '/admin/vendedores/gestionar',
    },
    {
      title: 'Boletas',
      icon: '🧾',
      permission: 'ver_boletas',
      path: '/admin/boletas/lista',
    },
    {
      title: 'Visitas',
      icon: '📅',
      permission: 'registrar_visita',
      subItems: [
        {
          title: 'Registrar Visita',
          path: '/admin/visitas/registrar',
          permission: 'registrar_visita',
        },
        {
          title: 'Mis Visitas',
          path: '/admin/visitas/lista',
          permission: 'registrar_visita',
        },
      ],
    },
    {
      title: 'Pedidos',
      icon: '📦',
      permission: 'registrar_pedido',
      subItems: [
        {
          title: 'Registrar Pedido',
          path: '/admin/pedidos/registrar',
          permission: 'registrar_pedido',
        },
        {
          title: 'Lista Pedidos',
          path: '/admin/pedidos/lista',
          permission: 'buscar_pedido',
        },
      ],
    },
    {
      title: 'Productos',
      icon: '📦',
      permission: 'buscar_producto',
      subItems: [
        {
          title: 'Consultar Stock',
          path: '/admin/productos/stock',
          permission: 'buscar_producto',
        },
        {
          title: 'Gestionar Productos',
          path: '/admin/productos/gestionar',
          permission: 'mantener_productos',
        },
      ],
    },
    {
      title: 'Reportes',
      icon: '📊',
      permission: 'ver_reportes',
      path: '/admin/reportes/gestionar',
    },
  ];

  // Estado de submenús (por índice)
  expandedItems = signal<{ [key: number]: boolean }>({});

  toggleSubmenu(index: number) {
    const current = { ...this.expandedItems() };
    current[index] = !current[index];
    this.expandedItems.set(current);
  }

  private loadUserFromLocalStorage(): void {
    const userData = sessionStorage.getItem('user_data');

    if (userData) {
      const user: LoginResponse = JSON.parse(userData);
      this.nombreUsuario.set(user.nombre ?? 'Usuario');
      this.rolUsuario.set(user.role ?? 'Usuario');
    }
  }

  logout(): void {
    this.authService.logout()
  }
}
