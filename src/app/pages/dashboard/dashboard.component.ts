import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  user: ReturnType<AuthService['getCurrentUser']> = null;
  adminUsersPreview: Array<{ id: string; username: string; email: string; balance: number }> = [];
  lastFinishedRound: { gameNumber: number; winningNumber?: number; winningColor?: string; totalBets?: number; totalAmount?: number } | null = null;
  constructor(private auth: AuthService, private http: HttpClient) {
    this.user = this.auth.getCurrentUser();
    if (this.user?.role === 'admin') {
      this.http.get<any[]>(`${environment.apiUrl}/api/admin/users`).subscribe({
        next: (list) => {
          const arr = Array.isArray(list) ? list : [];
          this.adminUsersPreview = arr.slice(0, 5).map((u: any) => ({ id: u.id || u._id, username: u.username, email: u.email, balance: u.balance }));
        },
        error: () => {}
      });
      this.http.get<any[]>(`${environment.apiUrl}/api/games?includeStats=true`).subscribe({
        next: (games) => {
          const arr = Array.isArray(games) ? games : [];
          const finished = arr
            .filter((g: any) => g.status === 'finished')
            .sort((a: any, b: any) => new Date(b.createdAt || b.updatedAt || b.finishedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || a.finishedAt || 0).getTime());
          const g = finished[0];
          if (g) {
            const stats = g.stats || {};
            const totalBets = g.totalBets ?? g.betsCount ?? stats.totalBets ?? stats.count ?? 0;
            const totalAmount = g.totalAmount ?? g.betsAmount ?? stats.totalAmount ?? stats.sum ?? 0;
            this.lastFinishedRound = {
              gameNumber: g.gameNumber ?? g.number ?? g.id,
              winningNumber: g.winningNumber,
              winningColor: g.winningColor,
              totalBets,
              totalAmount
            };
          }
        },
        error: () => {}
      });
    }
  }
}

