import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export type BetType = 'color' | 'numero';

export interface BetItem {
  type: BetType;
  value: 'rojo' | 'negro' | 'verde' | number;
  amount: number;
}

export interface Bet {
  id?: string;
  userId?: string;
  gameNumber: number;
  bets: BetItem[];
  createdAt?: string;
}

export interface BetResponse {
  bet: Bet;
  newBalance: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BetsService {
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  // Verificar si estamos en el navegador
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  listMyBets(): Observable<Bet[]> {
    // Si no estamos en el navegador, retornar array vacío
    if (!this.isBrowser()) {
      return of([]);
    }
    return this.http.get<Bet[]>(`${environment.apiUrl}/api/bets`);
  }

  createBet(gameNumber: number, betItems: BetItem[]): Observable<BetResponse> {
    // Si no estamos en el navegador, retornar error
    if (!this.isBrowser()) {
      return of({} as BetResponse);
    }
    return this.http.post<BetResponse>(`${environment.apiUrl}/api/bets`, { gameNumber, bets: betItems });
  }

  updateBet(id: string, betItems: BetItem[]): Observable<Bet> {
    // Si no estamos en el navegador, retornar error
    if (!this.isBrowser()) {
      return of({} as Bet);
    }
    return this.http.put<Bet>(`${environment.apiUrl}/api/bets/${id}`, { bets: betItems });
  }

  deleteBet(id: string): Observable<void> {
    // Si no estamos en el navegador, retornar error
    if (!this.isBrowser()) {
      return of(void 0);
    }
    return this.http.delete<void>(`${environment.apiUrl}/api/bets/${id}`);
  }
}

