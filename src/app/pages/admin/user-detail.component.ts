import { Component, NgZone, ChangeDetectorRef, Inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card">
    <h2 style="margin-top:0">Gestión de saldo</h2>
    <div *ngIf="loading">Cargando...</div>
    <div *ngIf="error" style="color:crimson">{{ error }}</div>
    <ng-container *ngIf="!loading && !error && user">
      <div><b>{{ user.username }}</b> ({{ user.email }})</div>
      <div style="margin:6px 0">Saldo actual: <b style="color:var(--casino-gold)">{{ user.balance | currency:'USD' }}</b></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <input type="number" [(ngModel)]="amount" placeholder="Monto (+/-)" class="input" style="width:140px" />
        <button class="btn gold" (click)="applyAdjustment()" [disabled]="pending">{{ pending ? 'Aplicando...' : 'Ajustar saldo' }}</button>
        <span *ngIf="msg" style="color:var(--text-secondary)">{{ msg }}</span>
      </div>
      <div style="margin-top:6px;color:var(--text-secondary)">Usa un valor negativo para descontar. Si el monto es positivo, se registra también en el total depositado.</div>

      <div style="margin-top:18px">
        <h3 style="margin:0 0 8px 0">Historial de ajustes</h3>
        <div *ngIf="historyLoading">Cargando historial...</div>
        <div *ngIf="!historyLoading && historyError" style="color:crimson">{{ historyError }} <button class="btn small" (click)="retryHistory()">Reintentar</button></div>
        <div *ngIf="!historyLoading && !historyError && balanceHistory.length === 0" style="color:var(--text-secondary)">Sin ajustes recientes.</div>
        <div class="table" *ngIf="!historyLoading && balanceHistory.length > 0" style="max-width:560px;width:100%;margin:0;border-radius:10px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 4px rgba(0,0,0,0.04)">
          <div class="table-row table-header" style="display:grid;grid-template-columns: 1fr .8fr .6fr;gap:8px;align-items:center;padding:12px 14px;background:#0b1f1a;color:#f5f5f5;font-weight:700;letter-spacing:.2px">
            <div style="font-size:12px;text-transform:uppercase;opacity:.9">Fecha</div>
            <div style="font-size:12px;text-transform:uppercase;opacity:.9">Tipo</div>
            <div style="text-align:right;font-size:12px;text-transform:uppercase;opacity:.9">Monto</div>
          </div>
          <div class="table-row" *ngFor="let h of balanceHistory; let i = index" style="display:grid;grid-template-columns: 1fr .8fr .6fr;gap:8px;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(0,0,0,0.06);font-size:13px" [style.background]="i % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent'">
            <div>{{ h.date | date:'short' }}</div>
            <div>
              <span [ngStyle]="{padding:'3px 8px', 'border-radius':'999px', 'font-weight':'600', 'font-size':'11px', 'background': typeBackground(h.type), 'color': typeColor(h.type)}">{{ formatType(h.type) }}</span>
            </div>
            <div style="text-align:right;font-weight:700;letter-spacing:0.1px" [style.color]="h.amount >= 0 ? '#d4af37' : '#c62828'">{{ h.amount | currency:'USD' }}</div>
          </div>
        </div>
      </div>
    </ng-container>
  </div>`
})
export class UserDetailComponent {
  user: any;
  amount = 0;
  msg = '';
  loading = true;
  pending = false;
  error = '';
  balanceHistory: Array<{ date: string; type: 'deposit' | 'bet' | 'payout'; amount: number; gameNumber?: number }> = [];
  historyLoading = true;
  historyError = '';
  private historySafetyTimer: any;
  constructor(route: ActivatedRoute, private http: HttpClient, private zone: NgZone, private cdr: ChangeDetectorRef, @Inject(PLATFORM_ID) private platformId: Object) {
    const id = route.snapshot.paramMap.get('id');
    if (id) {
      // Cargar usuario y luego refrescar tras una breve espera para asegurar token/hidratación
      this.http.get(`${environment.apiUrl}/api/admin/users/${id}`).subscribe({
        next: (d) => { this.user = d; this.loading = false; },
        error: (e) => {
          // Fallback: intentar encontrar el usuario entre la lista si el endpoint por ID falla
          this.http.get<any[]>(`${environment.apiUrl}/api/admin/users`).subscribe({
            next: (list) => {
              const found = (list || []).find((u: any) => (u.id || u._id) === id);
              if (found) { this.user = found; this.loading = false; this.error = ''; }
              else { this.error = e?.error?.msg || 'Error cargando usuario'; this.loading = false; }
            },
            error: () => { this.error = e?.error?.msg || 'Error cargando usuario'; this.loading = false; }
          });
        }
      });
      // Pequeño debounce para asegurar que el Authorization esté disponible tras login/hidratación
      setTimeout(() => this.fetchHistory(id), 50);
    } else { this.loading = false; this.error = 'Usuario no encontrado'; }
  }
  applyAdjustment() {
    if (!this.user?.id && !this.user?._id) return;
    const uid = this.user.id || this.user._id;
    this.pending = true; this.msg = '';
    this.http.post<any>(`${environment.apiUrl}/api/admin/users/${uid}/balance/adjust`, { amount: Number(this.amount) })
      .subscribe({
        next: (r) => {
          const newBalance = (r && (r.balance ?? r?.user?.balance));
          if (typeof newBalance === 'number') this.user.balance = newBalance;
          this.msg = 'Saldo actualizado'; this.pending = false;
          this.fetchHistory(uid);
        },
        error: (e) => { this.msg = e?.error?.msg || 'Error'; this.pending = false; }
      });
  }

  private fetchHistory(_userId: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    clearTimeout(this.historySafetyTimer);
    this.historyLoading = true; this.historyError = '';
    // Safety timeout
    this.historySafetyTimer = setTimeout(() => {
      if (this.historyLoading) {
        this.zone.run(() => {
          this.historyLoading = false;
          this.historyError = 'No se pudo cargar el historial. Intenta nuevamente.';
          this.cdr.detectChanges();
        });
      }
    }, 4000);
    this.http.get<any[]>(`${environment.apiUrl}/api/me/history`, { headers: { 'Cache-Control': 'no-cache' } as any }).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        const normalized = list.map((it: any) => ({
          date: it.date || it.createdAt || it.timestamp || new Date().toISOString(),
          type: (it.type as any) || 'deposit',
          amount: Number(it.amount || 0),
          gameNumber: it.gameNumber
        }));
        this.zone.run(() => {
          this.balanceHistory = normalized;
          this.historyLoading = false;
          clearTimeout(this.historySafetyTimer);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.historyLoading = false;
          clearTimeout(this.historySafetyTimer);
          this.historyError = 'No se pudo cargar el historial. Intenta nuevamente.';
          this.cdr.detectChanges();
        });
      }
    });
  }


  retryHistory() {
    const id = (this.user && (this.user.id || this.user._id)) || '';
    if (!id) return;
    this.historyError = '';
    this.fetchHistory(id);
  }

  formatType(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'deposit') return 'depositado';
    if (t === 'bet') return 'apuesta';
    if (t === 'payout') return 'pago';
    return type;
  }

  typeBackground(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'deposit' || t === 'payout') return 'rgba(212,175,55,0.18)';
    if (t === 'bet') return 'rgba(220,53,69,0.16)';
    return 'rgba(14,98,81,0.14)';
  }

  typeColor(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'deposit' || t === 'payout') return '#d4af37';
    if (t === 'bet') return 'crimson';
    return '#0e6251';
  }
}

