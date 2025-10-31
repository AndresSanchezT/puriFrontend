import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-dashboard-layout.html',
})
export class AdminDashboardLayoutComponent {
  private router = inject(Router);

  // Simulación de usuario
  user = signal({ nombre: 'Juan Pérez', rol: 'administrador' });

  // Menú principal
  menuItems = [
    {
      title: 'Dashboard',
      path: '/admin/dashboard',
      icon: '🏠',
      permission: 'iniciar_sesion',
    },
    {
      title: 'Usuarios',
      icon: '👥',
      permission: 'registrar_usuario',
      subItems: [
        {
          title: 'Registrar Usuario',
          path: '/admin/usuarios/registrar',
          permission: 'registrar_usuario',
        },
        {
          title: 'Lista Usuarios',
          path: '/admin/usuarios/lista',
          permission: 'registrar_usuario',
        },
      ],
    },
    {
      title: 'Clientes',
      icon: '🏢',
      permission: 'mantener_cliente',
      subItems: [
        {
          title: 'Lista Clientes',
          path: '/admin/clientes/lista',
          permission: 'mantener_cliente',
        },
        {
          title: 'Asignar Clientes',
          path: '/admin/clientes/asignar',
          permission: 'mantener_cliente',
        },
      ],
    },
    {
      title: 'Vendedores',
      icon: '🚗',
      permission: 'buscar_vendedor',
      path: '/admin/vendedores/gestionar',
      subItems: [
        {
          title: 'Lista Vendedores',
          path: '/admin/vendedor/lista',
          permission: 'mantener_vendedor',
        },
        {
          title: 'Registrar Vendedor',
          path: '/admin/vendedor/registrar',
          permission: 'mantener_vendedor',
        },
      ],
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
      path: '/admin/reportes',
      subItems: [
        {
          title: 'Gestionar Reportes',
          path: '/admin/reportes/gestionar',
          permission: 'gestionar_reporte',
        }
      ],
    },
  ];

  // Estado de submenús (por índice)
  expandedItems = signal<{ [key: number]: boolean }>({});

  toggleSubmenu(index: number) {
    const current = { ...this.expandedItems() };
    current[index] = !current[index];
    this.expandedItems.set(current);
  }
}
