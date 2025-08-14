import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class BetsService {
  constructor(private http: HttpClient) {}

  listMyBets(): Observable<Bet[]> {
    return this.http.get<Bet[]>(`${environment.apiUrl}/api/bets`);
  }

  createBet(gameNumber: number, betItems: BetItem[]): Observable<Bet> {
    return this.http.post<Bet>(`${environment.apiUrl}/api/bets`, { gameNumber, bets: betItems });
  }

  updateBet(id: string, betItems: BetItem[]): Observable<Bet> {
    return this.http.put<Bet>(`${environment.apiUrl}/api/bets/${id}`, { bets: betItems });
  }

  deleteBet(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/bets/${id}`);
  }
}

