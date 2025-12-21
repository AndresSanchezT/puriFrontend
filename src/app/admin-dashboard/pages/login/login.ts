import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from '../../../services/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  authService = inject(AuthService);
  router = inject(Router)

  dataForm: LoginRequest = {
    usuario: '',
    password: '',
  };

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    // Validación básica
    if (!this.dataForm.usuario || !this.dataForm.password) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.dataForm).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);

        // Guardar token y datos del usuario
        this.authService.saveAuthData(response.token, response);

        // Redirigir al dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.isLoading = false;

        // Manejo de errores
        if (error.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor';
        } else {
          this.errorMessage = 'Error al iniciar sesión. Intenta nuevamente';
        }
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
