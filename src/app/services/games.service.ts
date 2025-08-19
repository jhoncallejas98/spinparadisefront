import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface Game {
  id?: string;
  gameNumber: number;
  status: 'open' | 'closed' | 'finished';
  winningNumber?: number;
  winningColor?: 'rojo' | 'negro' | 'verde';
  createdAt?: string;
}

export interface SpinResponse {
  game: Game;
  results: any; // You can define a more specific interface for results if needed
  message: string;
}

@Injectable({ providedIn: 'root' })
export class GamesService {
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  // Verificar si estamos en el navegador
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  listGames(): Observable<Game[]> {
    // Si no estamos en el navegador, retornar array vacío
    if (!this.isBrowser()) {
      return of([]);
    }
    return this.http.get<Game[]>(`${environment.apiUrl}/api/games`);
  }

  openGame(): Observable<{ gameNumber: number }> {
    // Si no estamos en el navegador, retornar error
    if (!this.isBrowser()) {
      return of({ gameNumber: 0 });
    }
    return this.http.post<{ gameNumber: number }>(`${environment.apiUrl}/api/games/open`, {});
  }

  closeGame(gameNumber: number): Observable<Game> {
    // Si no estamos en el navegador, retornar error
    if (!this.isBrowser()) {
      return of({} as Game);
    }
    return this.http.post<Game>(`${environment.apiUrl}/api/games/${gameNumber}/close`, {});
  }

  spin(gameNumber: number): Observable<SpinResponse> {
    // Si no estamos en el navegador, retornar error
    if (!this.isBrowser()) {
      return of({} as SpinResponse);
    }
    return this.http.post<SpinResponse>(`${environment.apiUrl}/api/games/${gameNumber}/spin`, {});
  }
}

