import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';

export interface Game {
  id?: string;
  gameNumber: number;
  status: 'open' | 'closed' | 'finished';
  winningNumber?: number;
  winningColor?: 'rojo' | 'negro' | 'verde';
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class GamesService {
  constructor(private http: HttpClient) {}

  listGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${environment.apiUrl}/api/games`);
  }

  openGame(): Observable<{ gameNumber: number }> {
    return this.http.post<{ gameNumber: number }>(`${environment.apiUrl}/api/games/open`, {});
  }

  closeGame(gameNumber: number): Observable<Game> {
    return this.http.post<Game>(`${environment.apiUrl}/api/games/${gameNumber}/close`, {});
  }

  spin(gameNumber: number): Observable<Game> {
    return this.http
      .post<{ game: Game } | Game>(`${environment.apiUrl}/api/games/${gameNumber}/spin`, {})
      .pipe(map((resp: any) => (resp && resp.game ? resp.game : resp as Game)));
  }
}

