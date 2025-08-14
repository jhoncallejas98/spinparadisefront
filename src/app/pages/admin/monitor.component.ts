import { Component, Inject, OnInit, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

interface RoundSummary {
  gameNumber: number;
  status: 'open' | 'closed' | 'finished';
  winningNumber?: number;
  winningColor?: string;
  totalBets?: number;
  totalAmount?: number;
  recentUser?: string;
  recentAmount?: number;
}

@Component({
  selector: 'app-admin-monitor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="card">
    <h2 style="margin-top:0">Monitoreo</h2>
    <div *ngIf="loading">Cargando...</div>
    <div *ngIf="error" style="color:crimson">{{ error }} <button class="btn small" (click)="retry()">Reintentar</button></div>
    <div class="grid cols-3" *ngIf="!loading && !error">
      <div class="card" *ngFor="let r of rounds">
        <div><b>Ronda #{{ r.gameNumber }}</b> — {{ r.status }}</div>
        <div *ngIf="r.status==='finished'" style="margin-top:6px">
          Ganador: <b>{{ r.winningNumber }}</b> ({{ r.winningColor }})
        </div>
        <div style="margin-top:6px;color:var(--text-secondary)">
          Apuestas: {{ r.totalBets ?? '-' }} · Monto: {{ r.totalAmount ?? '-' }}
        </div>
        <div style="margin-top:6px" *ngIf="r.recentUser || r.recentAmount != null">
          <span style="color:var(--text-secondary)">Última:</span>
          <b>{{ r.recentUser || '—' }}</b>
          — <span [style.color]="(r.recentAmount || 0) >= 0 ? 'var(--casino-gold)' : 'crimson'">{{ (r.recentAmount ?? 0) | currency:'USD' }}</span>
        </div>
        <div style="margin-top:12px">
          <a class="btn small" [routerLink]="['/dashboard/admin/games', r.gameNumber, 'bets']" style="text-decoration:none">Ver apuestas</a>
        </div>
      </div>
    </div>
  </div>
  `
})
export class MonitorComponent implements OnInit {
  rounds: RoundSummary[] = [];
  loading = true;
  error = '';
  private loadingSafetyTimer: any;
  constructor(private http: HttpClient, private route: ActivatedRoute, private zone: NgZone, private cdr: ChangeDetectorRef, @Inject(PLATFORM_ID) private platformId: Object) {
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      // Mantener loading en SSR para evitar pantalla vacía antes de hidratar
      return;
    }
    const prefetched = this.route.snapshot.data['monitor'] as any[] | undefined;
    if (prefetched && Array.isArray(prefetched) && prefetched.length > 0) {
      this.populateRounds(prefetched);
      // Aun así, refrescar con datos con token para evitar stats incompletas
      setTimeout(() => this.fetchAndPopulate(), 50);
      return;
    }
    // Usa GET /api/games?includeStats=true para obtener totales, con un pequeño delay post-hidratación
    setTimeout(() => this.fetchAndPopulate(), 0);
  }

  private populateRounds(data: any[]) {
    const mapped: RoundSummary[] = (data || []).map((g: any) => {
      const winning = g.winning || {};
      const totalBets = this.extractStatNumber(g, [
        'totalBets','betsCount','betCount','totalCount','count'
      ], ['stats','statistics','summary','aggregates','totals','bets','wagers']) ?? 0;
      let totalAmount = this.extractStatNumber(g, [
        'totalAmount','betsAmount','totalBetAmount','amount','sum','total'
      ], ['stats','statistics','summary','aggregates','totals','bets','wagers']);
      if (totalAmount == null) {
        // try cents variants
        const cents = this.extractStatNumber(g, ['totalAmountCents','amountCents'], ['stats','statistics','summary','aggregates','totals','bets','wagers']);
        totalAmount = typeof cents === 'number' ? cents / 100 : 0;
      }
      const recent = g.recentBet || g.lastBet || (g.stats && (g.stats.recentBet || g.stats.lastBet || g.stats.last)) || null;
      const recentUser = this.extractUsernameFromAny(recent && (recent.user || recent.username || recent.player));
      const recentAmount = this.coerceNumber(recent && (recent.amount || recent.betAmount || recent.value));
      return {
        gameNumber: g.gameNumber ?? g.number ?? g.id,
        status: g.status,
        winningNumber: g.winningNumber ?? winning.number,
        winningColor: g.winningColor ?? winning.color,
        totalBets,
        totalAmount: totalAmount ?? 0,
        recentUser: recentUser || undefined,
        recentAmount: recentAmount ?? undefined
      };
    });
    this.zone.run(() => {
      this.rounds = mapped;
      this.loading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
    // Fallback: buscar la más reciente y, si es posible, recalcular totales desde el endpoint de apuestas
    this.rounds.forEach((r, idx) => {
      if (!r.recentUser || r.recentAmount == null || !r.totalBets || !r.totalAmount) {
        this.fetchRecentBet(r.gameNumber, idx);
      }
    });
  }

  private fetchAndPopulate() {
    clearTimeout(this.loadingSafetyTimer);
    this.loading = true;
    this.loadingSafetyTimer = setTimeout(() => {
      if (this.loading) {
        this.zone.run(() => {
          this.loading = false;
          this.error = this.error || 'No se pudo cargar. Intenta nuevamente.';
          this.cdr.detectChanges();
        });
      }
    }, 4000);
    this.http.get<any[]>(`${environment.apiUrl}/api/games?includeStats=true`, { headers: { 'Cache-Control': 'no-cache' } as any }).subscribe({
      next: (data) => {
        this.populateRounds(data || []);
        clearTimeout(this.loadingSafetyTimer);
      },
      error: (e) => { this.error = e?.error?.msg || 'Error cargando rondas'; this.loading = false; }
    });
  }

  retry() {
    this.error = '';
    this.fetchAndPopulate();
  }

  private extractStatNumber(source: any, keys: string[], containers: string[]): number | null {
    if (!source) return null;
    // direct keys
    for (const k of keys) {
      const v = (source as any)[k];
      const n = this.coerceNumber(v);
      if (n != null) return n;
    }
    // nested standard containers
    for (const c of containers) {
      const obj = (source as any)[c];
      if (!obj) continue;
      for (const k of keys) {
        const v = (obj as any)[k];
        const n = this.coerceNumber(v);
        if (n != null) return n;
      }
      // two-level nesting like stats.bets.count
      for (const innerName of containers) {
        const inner = (obj as any)[innerName];
        if (!inner) continue;
        for (const k of keys) {
          const v = (inner as any)[k];
          const n = this.coerceNumber(v);
          if (n != null) return n;
        }
      }
    }
    return null;
  }

  private coerceNumber(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === 'number' && !isNaN(v)) return v;
    const n = Number(v as any);
    return isNaN(n) ? null : n;
  }

  private extractUsernameFromAny(u: any): string | null {
    if (!u) return null;
    if (typeof u === 'string') return u;
    return u.username || u.email || u.name || null;
  }

  private fetchRecentBet(gameNumber: number, idx: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => this.http.get<any[]>(`${environment.apiUrl}/api/admin/games/${gameNumber}/bets`).subscribe({
      next: (list) => {
        if (!Array.isArray(list) || list.length === 0) return;
        const last = list[list.length - 1];
        const username = this.extractUsernameFromAny(last.user || last.username || (last.player && (last.player.username || last.player.email)));

        // Calcular totales y ultimo monto
        let totalBets = 0;
        let totalAmount = 0;
        for (const entry of list) {
          const entryItems = entry.bets || entry.items || entry.wagers;
          if (Array.isArray(entryItems) && entryItems.length > 0) {
            totalBets += entryItems.length;
            totalAmount += entryItems.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.betAmount ?? 0)), 0);
          } else {
            totalBets += 1;
            totalAmount += Number(entry.amount ?? entry.betAmount ?? entry.value ?? 0);
          }
        }

        let recentAmount = 0;
        const items = last.bets || last.items || last.wagers;
        if (Array.isArray(items) && items.length > 0) {
          recentAmount = items.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.betAmount ?? 0)), 0);
        } else {
          recentAmount = Number(last.amount ?? last.betAmount ?? last.value ?? 0);
        }

        const r = this.rounds[idx];
        if (r) {
          const updated: RoundSummary = {
            ...r,
            recentUser: r.recentUser || username || r.recentUser,
            recentAmount: r.recentAmount == null && !isNaN(recentAmount) ? recentAmount : r.recentAmount,
            totalBets: (!r.totalBets && totalBets) ? totalBets : r.totalBets,
            totalAmount: ((!r.totalAmount || r.totalAmount === 0) && totalAmount) ? totalAmount : r.totalAmount
          };
          const nextRounds = this.rounds.slice();
          nextRounds[idx] = updated;
          this.zone.run(() => {
            this.rounds = nextRounds;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        }
      },
      error: () => {}
    }), 0);
  }
}

