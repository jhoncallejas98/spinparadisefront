import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-bet-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card"><h2>Detalle de apuesta</h2><pre>{{ bet | json }}</pre></div>`
})
export class BetDetailComponent {
  bet: any;
  constructor(route: ActivatedRoute, http: HttpClient) {
    const id = route.snapshot.paramMap.get('id');
    if (id) {
      http.get(`${environment.apiUrl}/api/bets/${id}`).subscribe((d) => (this.bet = d));
    }
  }
}

