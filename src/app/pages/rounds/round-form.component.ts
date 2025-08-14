import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamesService } from '../../services/games.service';

@Component({
  selector: 'app-round-form',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card"><h2>Nueva ronda</h2><button class="btn" (click)="open()">Abrir juego</button><div *ngIf="msg" style="margin-top:8px">{{ msg }}</div></div>`
})
export class RoundFormComponent {
  msg = '';
  constructor(private games: GamesService) {}
  open() { this.games.openGame().subscribe(r => this.msg = `Ronda abierta #${r.gameNumber}`); }
}

