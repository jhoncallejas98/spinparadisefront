import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-round-result',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card"><h2>Resultado de ronda</h2><pre>{{ result | json }}</pre></div>`
})
export class RoundResultComponent {
  result: any;
  constructor(route: ActivatedRoute, http: HttpClient) {
    const id = route.snapshot.paramMap.get('id');
    if (id) {
      http.get(`${environment.apiUrl}/api/games/${id}/results`).subscribe((d) => (this.result = d));
    }
  }
}

