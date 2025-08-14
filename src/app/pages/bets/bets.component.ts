import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BetsService, BetItem, Bet } from '../../services/bets.service';

@Component({
  selector: 'app-bets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bets.component.html',
  styleUrls: ['./bets.component.css']
})
export class BetsComponent {
  bets: Bet[] = [];
  gameNumber = 1;
  betType: 'color' | 'numero' = 'color';
  betValue: string = 'rojo';
  amount = 10;
  search = '';

  constructor(private betsService: BetsService) {
    this.load();
  }

  load() {
    this.betsService.listMyBets().subscribe(b => (this.bets = b));
  }

  placeBet() {
    const value: any = this.betType === 'numero' ? Number(this.betValue) : this.betValue;
    const items: BetItem[] = [{ type: this.betType, value, amount: this.amount }];
    this.betsService.createBet(this.gameNumber, items).subscribe(() => {
      this.load();
    });
  }

  formatBet(bet: Bet): string {
    if (!bet || !Array.isArray(bet.bets)) return '';
    return bet.bets
      .map((item) => `${item.type}:${item.value} $${item.amount}`)
      .join(', ');
  }
}

