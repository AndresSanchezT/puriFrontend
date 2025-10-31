import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin-dashboard/admin-dashboard.routes')
  }
];
