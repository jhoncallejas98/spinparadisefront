import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';

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

  constructor(private http: HttpClient) {}

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
    localStorage.setItem(this.tokenKey, token);
  }

  // Obtener el token del localStorage
  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  // Guardar el usuario en localStorage
  setCurrentUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Obtener el usuario del localStorage
  getCurrentUser(): (AuthUser & { role?: 'player' | 'admin' }) | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.userKey);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Actualizar datos del usuario desde el servidor
  refreshCurrentUser() {
    const token = this.getToken();
    if (!token) {
      return this.http.get<null>('about:blank');
    }
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((user) => {
        if (user) this.setCurrentUser(user);
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

  // Actualizar saldo en el servidor
  updateBalanceInBackend(delta: number): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/api/users/balance`, { delta }).pipe(
      tap((updatedUser) => {
        this.setCurrentUser(updatedUser);
      })
    );
  }

  // Sincronizar saldo desde el servidor
  syncBalanceFromBackend(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((user) => {
        this.setCurrentUser(user);
      })
    );
  }

  // Sincronizar saldo de forma segura (con manejo de errores)
  syncBalanceSafely(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((user) => {
        this.setCurrentUser(user);
      }),
      catchError((error) => {
        console.warn('No se pudo sincronizar saldo desde backend, usando saldo local');
        const localUser = this.getCurrentUser();
        return of(localUser);
      })
    );
  }
}

