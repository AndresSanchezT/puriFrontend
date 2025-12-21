import { Routes } from '@angular/router';
import { Login } from './admin-dashboard/pages/login/login';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin-dashboard/admin-dashboard.routes'),
    canActivateChild: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
