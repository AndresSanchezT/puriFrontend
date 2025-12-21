import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const service = inject(AuthService);
  const router = inject(Router);

  // ❌ NO está autenticado
  if (!service.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  // ❌ Token expirado
  if (isTokenExpired()) {
    service.logout();
    return router.parseUrl('/login');
  }

  // ✅ Todo OK
  return true;
};

const isTokenExpired = (): boolean => {
  const service = inject(AuthService);
  const token = service.token;

  if (!token) return true;

  const payload = service.getPayload(token);
  if (!payload?.exp) return true;

  const now = Date.now() / 1000;
  return payload.exp < now;
};