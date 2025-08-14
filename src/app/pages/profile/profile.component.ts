import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card">
    <h2 style="margin-top:0">Perfil</h2>
    <div *ngIf="!user">Sin sesión</div>
    <ng-container *ngIf="user">
      <div><b>{{ user.username }}</b> ({{ user.email }})</div>
      <div style="margin:6px 0">Saldo actual: <b style="color:var(--casino-gold)">{{ user.balance | currency:'USD' }}</b></div>

      <div class="grid cols-2" style="margin-top:12px">
        <div class="card">
          <h3 style="margin:0 0 8px 0">Depósitos</h3>
          <div *ngIf="loadingDeposits">Cargando...</div>
          <div *ngIf="!loadingDeposits && deposits.length===0" style="color:var(--text-secondary)">Sin depósitos.</div>
          <div class="table" *ngIf="!loadingDeposits && deposits.length>0" style="width:100%;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
            <div class="table-row table-header" style="display:grid;grid-template-columns: 1fr .6fr;gap:8px;align-items:center;padding:10px 12px;background: color-mix(in srgb, var(--electric-violet) 12%, transparent);border-bottom:1px solid rgba(0,0,0,0.08);font-weight:700;color:#222"><div>Fecha</div><div style="text-align:right">Monto</div></div>
            <div class="table-row" *ngFor="let d of deposits" style="display:grid;grid-template-columns: 1fr .6fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(0,0,0,0.06)">
              <div>{{ d.date | date:'short' }}</div>
              <div style="text-align:right;font-weight:600;color:var(--casino-gold)">{{ d.amount | currency:'USD' }}</div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 style="margin:0 0 8px 0">Historial</h3>
          <div *ngIf="loadingHistory">Cargando...</div>
          <div *ngIf="!loadingHistory && history.length===0" style="color:var(--text-secondary)">Sin movimientos.</div>
          <div class="table" *ngIf="!loadingHistory && history.length>0" style="width:100%;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
            <div class="table-row table-header" style="display:grid;grid-template-columns: 1.1fr .8fr .6fr .7fr;gap:8px;align-items:center;padding:10px 12px;background: color-mix(in srgb, var(--electric-violet) 12%, transparent);border-bottom:1px solid rgba(0,0,0,0.08);font-weight:700;color:#222"><div>Fecha</div><div>Tipo</div><div>Juego</div><div style="text-align:right">Monto</div></div>
            <div class="table-row" *ngFor="let h of history" style="display:grid;grid-template-columns: 1.1fr .8fr .6fr .7fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(0,0,0,0.06)">
              <div>{{ h.date | date:'short' }}</div>
              <div style="text-transform:capitalize">{{ h.type }}</div>
              <div>{{ h.gameNumber || '' }}</div>
              <div style="text-align:right;font-weight:600" [style.color]="h.amount >= 0 ? 'var(--casino-gold)' : 'crimson'">{{ h.amount | currency:'USD' }}</div>
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  </div>
  `
})
export class ProfileComponent {
  user: ReturnType<AuthService['getCurrentUser']> = null;
  deposits: Array<{ type: 'deposit'; amount: number; date: string }> = [];
  history: Array<{ type: 'deposit' | 'bet' | 'payout'; amount: number; date: string; gameNumber?: number }> = [];
  loadingDeposits = true;
  loadingHistory = true;
  constructor(private auth: AuthService, private http: HttpClient, private zone: NgZone, private cdr: ChangeDetectorRef) {
    this.user = this.auth.getCurrentUser();
    if (this.user) {
      this.http.get<any[]>(`${environment.apiUrl}/api/me/deposits`).subscribe({
        next: (data) => {
          const list = Array.isArray(data) ? data : [];
          this.zone.run(() => { this.deposits = list; this.loadingDeposits = false; this.cdr.detectChanges(); });
        },
        error: () => { this.loadingDeposits = false; }
      });
      this.http.get<any[]>(`${environment.apiUrl}/api/me/history`).subscribe({
        next: (data) => {
          const list = Array.isArray(data) ? data : [];
          this.zone.run(() => { this.history = list; this.loadingHistory = false; this.cdr.detectChanges(); });
        },
        error: () => { this.loadingHistory = false; }
      });
    } else {
      this.loadingDeposits = false;
      this.loadingHistory = false;
    }
  }
}

