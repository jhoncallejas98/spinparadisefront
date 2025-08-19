import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

// Interfaz para el usuario autenticado
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  balance: number;
  role?: 'player' | 'admin';
}

// Respuesta del login
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  // Verificar si estamos en el navegador
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // Registrar un nuevo usuario
  register(username: string, email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/api/users`, { username, email, password });
  }

  // Iniciar sesión
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          this.setToken(res.token);
          this.setCurrentUser(res.user);
        })
      );
  }

  // Cerrar sesión
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Guardar el token en localStorage
  setToken(token: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  // Obtener el token del localStorage
  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.tokenKey);
  }

  // Guardar el usuario en localStorage
  setCurrentUser(user: AuthUser): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  // Obtener el usuario del localStorage
  getCurrentUser(): (AuthUser & { role?: 'player' | 'admin' }) | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(this.userKey);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Obtener el saldo actual desde el backend
  getCurrentBalance(): Observable<number> {
    // Si no estamos en el navegador, retornar el saldo local
    if (!this.isBrowser()) {
      const user = this.getCurrentUser();
      return of(user?.balance || 0);
    }

    return this.http.get<{ balance: number }>(`${environment.apiUrl}/api/me/balance`).pipe(
      map(response => response.balance),
      tap(balance => {
        // Actualizar el usuario local con el nuevo saldo
        const user = this.getCurrentUser();
        if (user) {
          user.balance = balance;
          this.setCurrentUser(user);
        }
      }),
      catchError(error => {
        console.warn('Error al obtener saldo desde backend:', error);
        // Si falla, retornar el saldo local
        const user = this.getCurrentUser();
        return of(user?.balance || 0);
      })
    );
  }

  // Actualizar datos del usuario desde el servidor
  refreshCurrentUser() {
    const user = this.getCurrentUser();
    if (!user) {
      return this.http.get<null>('about:blank');
    }
    
    // Si no estamos en el navegador, retornar el usuario local
    if (!this.isBrowser()) {
      return of(user);
    }
    
    // Obtener el saldo actualizado desde el backend
    return this.getCurrentBalance().pipe(
      map(balance => {
        const updatedUser = { ...user, balance };
        this.setCurrentUser(updatedUser);
        return updatedUser;
      }),
      catchError(error => {
        console.warn('Error al refrescar usuario, usando datos locales:', error);
        return of(user);
      })
    );
  }

  // Actualizar saldo localmente (sin ir al servidor)
  updateBalanceLocallyBy(delta: number) {
    const user = this.getCurrentUser();
    if (!user) {
      return;
    }
    
    user.balance = Math.max(0, (user.balance || 0) + delta);
    this.setCurrentUser(user);
  }

  // Sincronizar saldo desde el backend usando el nuevo endpoint
  syncBalanceFromBackend(): Observable<AuthUser> {
    // Si no estamos en el navegador, retornar el usuario local
    if (!this.isBrowser()) {
      const user = this.getCurrentUser();
      return of(user as AuthUser);
    }

    return this.getCurrentBalance().pipe(
      map(balance => {
        const user = this.getCurrentUser();
        if (user) {
          const updatedUser = { ...user, balance };
          this.setCurrentUser(updatedUser);
          return updatedUser;
        }
        return null as any;
      })
    );
  }

  // Sincronizar saldo de forma segura (con manejo de errores)
  syncBalanceSafely(): Observable<AuthUser | null> {
    // Si no estamos en el navegador, retornar el usuario local
    if (!this.isBrowser()) {
      const user = this.getCurrentUser();
      return of(user);
    }

    return this.getCurrentBalance().pipe(
      map(balance => {
        const user = this.getCurrentUser();
        if (user) {
          const updatedUser = { ...user, balance };
          this.setCurrentUser(updatedUser);
          return updatedUser;
        }
        return null;
      }),
      catchError(error => {
        console.warn('No se pudo sincronizar saldo desde backend, usando saldo local');
        const localUser = this.getCurrentUser();
        return of(localUser);
      })
    );
  }
}

