import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface LoginRequest {
  usuario: string;
  password: string;
}

export interface LoginResponse {
   token: string;
   id: number;
   username: string;
   role: string;
   nombre: string;
}

const baseUrl = environment.baseUrl;
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token: string | undefined;

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${baseUrl}/auth/login`, credentials);
  }

  logout(): void {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    this._token = undefined;
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem('auth_token');
  }

  get token() {
    if (this._token != undefined) {
      return this._token;
    } else if (sessionStorage.getItem('auth_token') != null) {
      this._token = sessionStorage.getItem('auth_token') || '';
      return this._token;
    }
    return this._token!;
  }

  getPayload(token: string) {
    if (token != null) {
      return JSON.parse(atob(token.split('.')[1]));
    }
    return null;
  }

  saveAuthData(token: string, userData: LoginResponse): void {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('user_data', JSON.stringify(userData));
  }
}
