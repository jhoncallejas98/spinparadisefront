import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface RoundBetAnyShape {
  id?: string;
  _id?: string;
  user?: { id?: string; _id?: string; username?: string; email?: string } | string;
  username?: string;
  amount?: number;
  betAmount?: number;
  value?: number | string;
  betType?: string; // 'color' | 'numero' | etc.
  type?: string;    // alias of betType
  number?: number;
  color?: string;
  createdAt?: string;
  bets?: Array<{ type?: string; betType?: string; value?: number | string; amount?: number; createdAt?: string }>;
  items?: Array<{ type?: string; value?: number | string; amount?: number; createdAt?: string }>;
  wagers?: Array<{ type?: string; value?: number | string; amount?: number; createdAt?: string }>;
}

interface RoundBetRow {
  username: string;
  type: string;
  detail: string;
  amount: number;
  createdAt: string;
}

@Component({
  selector: 'app-round-bets',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card">
    <div style="display:flex;align-items:center;gap:10px;justify-content:space-between">
      <h2 style="margin:0">Apuestas ronda #{{ gameNumber }}</h2>
      <div style="opacity:.7;font-size:13px">{{ rows.length }} apuestas</div>
    </div>
    <div *ngIf="loading">Cargando...</div>
    <div *ngIf="error" style="color:crimson">{{ error }}</div>
    <ng-container *ngIf="!loading && !error">
      <div *ngIf="rows.length === 0" style="color:var(--text-secondary)">No hay apuestas.</div>
      <div *ngIf="rows.length > 0" style="display:grid;grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));gap:12px;margin-top:12px">
        <div *ngFor="let r of rows" style="border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg, rgba(11,31,26,0.04), transparent 60%)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.username }}</div>
            <span [ngStyle]="{padding:'3px 8px', 'border-radius':'999px', 'font-weight':'600', 'font-size':'11px', 'background': typeBackground(r.type), 'color': typeColor(r.type)}">{{ r.type }}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="color:var(--text-secondary)">Detalle</div>
            <div style="font-weight:600">{{ r.detail }}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="color:var(--text-secondary)">Monto</div>
            <div style="font-weight:800;letter-spacing:.2px;color:#d4af37">{{ r.amount | currency:'USD' }}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--text-secondary)">
            <div>Fecha</div>
            <div>{{ r.createdAt | date:'short' }}</div>
          </div>
        </div>
      </div>
    </ng-container>
  </div>
  `
})
export class RoundBetsComponent {
  gameNumber = '';
  rows: RoundBetRow[] = [];
  loading = true;
  error = '';
  constructor(route: ActivatedRoute, private http: HttpClient) {
    this.gameNumber = route.snapshot.paramMap.get('gameNumber') || '';
    if (!this.gameNumber) { this.loading = false; this.error = 'Ronda no especificada'; return; }
    this.http.get<RoundBetAnyShape[]>(`${environment.apiUrl}/api/admin/games/${this.gameNumber}/bets`).subscribe({
      next: (data) => { this.rows = this.normalizeBetsResponse(data || []); this.loading = false; },
      error: (e) => { this.error = e?.error?.msg || 'Error cargando apuestas'; this.loading = false; }
    });
  }

  private normalizeBetsResponse(items: RoundBetAnyShape[]): RoundBetRow[] {
    const rows: RoundBetRow[] = [];
    for (const it of items) {
      const username = this.displayUserFromAny(it);
      const createdAt = this.pickDate(it);

      const nested = it.bets || it.items || it.wagers;
      if (Array.isArray(nested) && nested.length > 0) {
        for (const bi of nested) {
          const type = this.normalizeType((bi as any).betType || bi.type);
          const detail = this.normalizeDetail(type, bi.value);
          const amount = this.pickAmount(bi);
          rows.push({ username, type, detail, amount, createdAt: bi.createdAt || createdAt });
        }
        continue;
      }

      // Single bet per record
      const type = this.normalizeType((it as any).betType || (it as any).type || this.inferTypeFromFields(it));
      const detail = this.pickDetailFromFields(it);
      const amount = this.pickAmount(it);
      rows.push({ username, type, detail, amount, createdAt });
    }
    return rows;
  }

  private displayUserFromAny(b: RoundBetAnyShape): string {
    if (typeof b.user === 'string') return b.username || b.user;
    if (b.user && typeof b.user === 'object') return b.user.username || b.username || (b.user as any).email || '—';
    return b.username || '—';
  }

  private normalizeType(raw?: string): string {
    if (!raw) return '—';
    const v = String(raw).toLowerCase();
    if (v.includes('num')) return 'número';
    if (v.includes('color')) return 'color';
    return raw;
  }

  private normalizeDetail(type: string, value: any): string {
    if (value === null || value === undefined) return '—';
    if (type === 'número') return `#${value}`;
    return String(value);
  }

  private inferTypeFromFields(b: RoundBetAnyShape): string {
    if (b.number !== undefined && b.number !== null) return 'número';
    if (b.color) return 'color';
    if (typeof b.value === 'number') return 'número';
    if (typeof b.value === 'string') return 'color';
    return '—';
  }

  private pickDetailFromFields(b: RoundBetAnyShape): string {
    if (b.number !== undefined && b.number !== null) return `#${b.number}`;
    if (b.color) return b.color;
    if (b.value !== undefined && b.value !== null) return String(b.value);
    return '—';
  }

  private pickAmount(b: any): number {
    const val = b?.amount ?? b?.betAmount ?? b?.value;
    return typeof val === 'number' ? val : Number(val) || 0;
  }

  private pickDate(b: RoundBetAnyShape): string {
    return b.createdAt || new Date().toISOString();
  }

  typeBackground(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('número')) return 'rgba(14,98,81,0.14)';
    if (t.includes('color')) return 'rgba(33,37,41,0.10)';
    return 'rgba(0,0,0,0.06)';
  }

  typeColor(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('número')) return '#0e6251';
    if (t.includes('color')) return '#1f2937';
    return '#444';
  }
}

