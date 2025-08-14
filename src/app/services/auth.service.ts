import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';

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
    const user = this.getCurrentUser();
    if (!user) return;
    user.balance = Math.max(0, (user.balance || 0) + delta);
    this.setCurrentUser(user);
  }
}

