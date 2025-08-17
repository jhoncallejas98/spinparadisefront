import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  balance: number;
  role?: 'player' | 'admin';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';

  constructor(private http: HttpClient) {}

  register(username: string, email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/api/users`, { username, email, password });
  }

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

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  setCurrentUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getCurrentUser(): (AuthUser & { role?: 'player' | 'admin' }) | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.userKey);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  refreshCurrentUser() {
    const token = this.getToken();
    if (!token) {
      return this.http.get<null>('about:blank');
    }
    // Intentar obtener el usuario actual si el backend lo soporta
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((user) => {
        if (user) this.setCurrentUser(user);
      })
    );
  }

  updateBalanceLocallyBy(delta: number) {
    console.log('🔍 DEPURACIÓN - AuthService.updateBalanceLocallyBy:');
    console.log('  - Delta recibido:', delta);
    
    const user = this.getCurrentUser();
    if (!user) {
      console.log('  - ERROR: No hay usuario logueado');
      return;
    }
    
    console.log('  - Saldo anterior:', user.balance);
    user.balance = Math.max(0, (user.balance || 0) + delta);
    console.log('  - Saldo nuevo:', user.balance);
    
    this.setCurrentUser(user);
    console.log('  - Usuario actualizado en localStorage');
  }

  // Método para actualizar saldo en el backend
  updateBalanceInBackend(delta: number): Observable<AuthUser> {
    console.log('🔍 DEPURACIÓN - Actualizando saldo en backend:', delta);
    
    return this.http.post<AuthUser>(`${environment.apiUrl}/api/users/balance`, { delta }).pipe(
      tap((updatedUser) => {
        console.log('🔍 DEPURACIÓN - Saldo actualizado en backend:', updatedUser.balance);
        this.setCurrentUser(updatedUser);
      })
    );
  }

  // Método para sincronizar saldo con el backend
  syncBalanceFromBackend(): Observable<AuthUser> {
    console.log('🔍 DEPURACIÓN - Sincronizando saldo desde backend');
    
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((user) => {
        console.log('🔍 DEPURACIÓN - Saldo sincronizado desde backend:', user.balance);
        this.setCurrentUser(user);
      })
    );
  }

  // Método para sincronizar saldo de forma segura (con manejo de errores)
  syncBalanceSafely(): Observable<AuthUser | null> {
    console.log('🔍 DEPURACIÓN - Sincronización segura de saldo');
    
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((user) => {
        console.log('🔍 DEPURACIÓN - Saldo sincronizado exitosamente:', user.balance);
        this.setCurrentUser(user);
      }),
      // Manejar errores sin romper la aplicación
      catchError((error) => {
        console.warn('⚠️ No se pudo sincronizar saldo desde backend, usando saldo local:', error);
        // Retornar el usuario local en caso de error
        const localUser = this.getCurrentUser();
        return of(localUser);
      })
    );
  }
}

