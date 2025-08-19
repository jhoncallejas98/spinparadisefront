import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-add-balance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card">
    <h2>Agregar saldo</h2>
    <p>Saldo actual: <b style="color:var(--casino-gold)">{{ balance }}</b></p>
    <form (ngSubmit)="add()" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="number" [(ngModel)]="amount" name="amount" placeholder="Monto" class="input" />
      <button class="btn gold">Agregar</button>
    </form>
    <div *ngIf="msg" style="margin-top:8px">{{ msg }}</div>
  </div>
  `
})
export class AddBalanceComponent {
  amount = 0;
  balance = 0;
  msg = '';
  constructor(private http: HttpClient, private auth: AuthService) {
    this.balance = this.auth.getCurrentUser()?.balance ?? 0;
  }
  add() {
    if (this.amount <= 0) {
      this.msg = 'El monto debe ser mayor a 0';
      return;
    }
    
    // Actualizar saldo localmente ya que no hay endpoint para usuarios regulares
    this.auth.updateBalanceLocallyBy(this.amount);
    this.balance = this.auth.getCurrentUser()?.balance ?? 0;
    this.msg = 'Saldo actualizado localmente';
    this.amount = 0;
  }
}

