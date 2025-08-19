import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BetsService, BetItem, BetResponse } from '../../services/bets.service';

@Component({
  selector: 'app-bet-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bet-form.component.html',
  styleUrls: ['./bet-form.component.css']
})
export class BetFormComponent {
  gameNumber = 1;
  betType: 'color' | 'numero' = 'color';
  betValue: string = 'rojo';
  amount = 10;
  message = '';

  constructor(private betsService: BetsService) {}

  place() {
    const value: any = this.betType === 'numero' ? Number(this.betValue) : this.betValue;
    const items: BetItem[] = [{ type: this.betType, value, amount: this.amount }];
    this.betsService.createBet(this.gameNumber, items).subscribe({
      next: (response: BetResponse) => (this.message = response.message || 'Apuesta creada'),
      error: (e) => (this.message = e?.error?.msg || 'Error creando apuesta')
    });
  }
}

