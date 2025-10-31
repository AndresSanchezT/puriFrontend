import { Component, signal } from '@angular/core';
import { AdminDashboardLayoutComponent } from './admin-dashboard/layouts/admin-dashboard-layout/admin-dashboard-layout';



@Component({
  selector: 'app-root',
  imports: [AdminDashboardLayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('puri-frontend');
}
