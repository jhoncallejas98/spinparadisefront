import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GamesService } from '../../services/games.service';

@Component({
  selector: 'app-round-spin',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card"><h2>Lanzar ruleta</h2><button class="btn gold" (click)="spin()">Girar</button><div *ngIf="msg" style="margin-top:8px">{{ msg }}</div></div>`
})
export class RoundSpinComponent {
  gameNumber: number;
  msg = '';
  constructor(route: ActivatedRoute, private games: GamesService) {
    this.gameNumber = Number(route.snapshot.paramMap.get('id'));
  }
  spin() {
    if (!this.gameNumber) return;
    this.games.spin(this.gameNumber).subscribe(g => this.msg = `Resultado: ${g.winningNumber} (${g.winningColor})`);
  }
}

