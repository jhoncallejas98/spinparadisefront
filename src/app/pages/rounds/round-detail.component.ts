import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-round-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card"><h2>Detalle de ronda</h2><pre>{{ round | json }}</pre></div>`
})
export class RoundDetailComponent {
  round: any;
  constructor(route: ActivatedRoute, http: HttpClient) {
    const id = route.snapshot.paramMap.get('id');
    if (id) {
      http.get(`${environment.apiUrl}/api/games/${id}`).subscribe((d) => (this.round = d));
    }
  }
}

