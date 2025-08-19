import { Component, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamesService, Game } from '../../services/games.service';
import { BetsService, BetItem } from '../../services/bets.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.css']
})
export class GamesComponent {
  games: Game[] = [];
  currentGameNumber?: number;
  message = '';
  user: ReturnType<AuthService['getCurrentUser']> = null;
  
  // Configuración de la apuesta
  betType: 'color' | 'numero' = 'color';
  selectedColor: 'rojo' | 'negro' | '' = '';
  selectedNumber: number | null = null;
  amount = 10;
  uiMsg = '';
  
  // Resultados del juego
  lastWinningNumber?: number;
  lastWinningColor?: 'rojo'|'negro'|'verde';
  resultMsg = '';
  showResultModal = false;
  won = false;
  
  // Estado del juego
  gameStatus: 'open'|'closed'|'finished'|'' = '';
  hasBet = false;
  canClose = false;
  canSpin = false;
  isSpinning = false;

  // Variables para actualizar saldo después del modal
  pendingBalanceUpdate = 0;
  pendingBalanceDelta = 0;

  @ViewChild('gameWheel') gameWheel!: ElementRef<HTMLDivElement>;

  // Números de la ruleta europea en orden
  private readonly wheelNumbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  constructor(
    private gamesService: GamesService, 
    private auth: AuthService, 
    private betsService: BetsService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.user = this.auth.getCurrentUser();
    
    // Sincronizar saldo con el servidor
    this.auth.syncBalanceSafely().subscribe({
      next: (user) => {
        if (user) {
          this.user = user;
        }
      },
      error: (error) => {
        console.warn('Error al sincronizar saldo, usando saldo local');
      }
    });
    
    this.refresh();
  }

  // Calcular el ángulo para que la ruleta se detenga en el número correcto
  private getAngleForNumber(number: number): number {
    const index = this.wheelNumbers.indexOf(number);
    if (index === -1) {
      console.warn('Número no encontrado en la ruleta:', number);
      return 0;
    }
    const baseAngle = index * 9.73;
    const centeredAngle = 360 - (baseAngle + 4.865);
    return centeredAngle;
  }

  refresh() {
    this.gamesService.listGames().subscribe({
      next: (g) => {
        this.games = g;
        const active = g.find(x => x.status === 'open' || x.status === 'closed');
        this.currentGameNumber = active?.gameNumber;
        this.gameStatus = (active?.status as any) || '';
        this.canClose = this.gameStatus === 'open' && this.hasBet;
        this.canSpin = this.gameStatus === 'closed';
      },
      error: (error) => {
        console.error('Error al cargar juegos:', error);
        this.message = 'Error de conexión';
        this.uiMsg = 'No se puede conectar al servidor. Verifica que el backend esté funcionando en http://localhost:3000';
      }
    });
  }

  open() {
    this.message = 'Creando nueva ronda...';
    this.gamesService.openGame().subscribe({
      next: (res) => {
        this.message = `Juego abierto #${res.gameNumber}`;
        this.hasBet = false;
        this.canClose = false;
        this.canSpin = false;
        this.gameStatus = 'open';
        this.currentGameNumber = res.gameNumber;
        this.uiMsg = '';
        
        // Limpiar selecciones para la nueva ronda
        this.selectedColor = '';
        this.selectedNumber = null;
        this.amount = 10;
        
        this.refresh();
      },
      error: (error) => {
        console.error('Error al crear nueva ronda:', error);
        this.message = 'Error al crear nueva ronda';
        this.uiMsg = error?.error?.msg || 'No se pudo conectar al servidor.';
      }
    });
  }

  close() {
    if (!this.currentGameNumber) {
      this.uiMsg = 'No hay ronda activa para cerrar';
      return;
    }
    this.message = 'Cerrando ronda...';
    this.gamesService.closeGame(this.currentGameNumber).subscribe({
      next: () => {
        this.message = `Juego #${this.currentGameNumber} cerrado`;
        this.gameStatus = 'closed';
        this.canClose = false;
        this.canSpin = true;
        this.uiMsg = '';
        this.refresh();
      },
      error: (error) => {
        console.error('Error al cerrar ronda:', error);
        this.message = 'Error al cerrar ronda';
        this.uiMsg = error?.error?.msg || 'No se pudo cerrar la ronda';
      }
    });
  }

  spin() {
    if (!this.currentGameNumber || this.isSpinning) return;
    
    this.isSpinning = true;
    this.message = '¡Girando la ruleta...';
    
    this.gamesService.spin(this.currentGameNumber).subscribe({ 
      next: (g) => {
        // Obtener el número ganador del servidor
        this.lastWinningNumber = g.winningNumber;
        
        // Determinar el color del número ganador
        let color = 'verde';
        if (g.winningNumber && g.winningNumber > 0) {
          color = this.isRed(g.winningNumber) ? 'rojo' : 'negro';
        }
        this.lastWinningColor = color as any;
        
        // Calcular si ganó y cuánto
        let won = false;
        let payout = 0;
        if (this.betType === 'color' && this.selectedColor) {
          won = (this.selectedColor === color);
          // Apuesta por color paga 1:1 (apuesta + ganancia)
          payout = won ? this.amount + this.amount : 0;
        } else if (this.betType === 'numero' && this.selectedNumber !== null) {
          won = (this.selectedNumber === g.winningNumber);
          // Apuesta por número paga 35:1 (apuesta + 35x ganancia)
          payout = won ? this.amount + (this.amount * 35) : 0;
        }
        
        this.won = won;
        this.resultMsg = won
          ? `¡Ganaste! Pago estimado ${payout}`
          : 'Perdiste esta ronda';
        
        // Guardar para actualizar saldo cuando se cierre el modal
        if (won) {
          this.pendingBalanceUpdate = payout;
          this.pendingBalanceDelta = 0;
        } else {
          this.pendingBalanceUpdate = 0;
          this.pendingBalanceDelta = -this.amount;
        }
        
        // Animar la ruleta hacia el número ganador
        this.animateWheel(g.winningNumber!);
      }, 
      error: (e: any) => {
        this.stopSpinning();
        this.uiMsg = e?.error?.msg || 'No se pudo girar. Cierra la ronda antes de girar.';
      }
    });
  }

  // Animar la ruleta para que se detenga en el número ganador
  private animateWheel(winningNumber: number) {
    const wheel = this.gameWheel.nativeElement;
    const targetAngle = this.getAngleForNumber(winningNumber);
    const finalRotation = 1080 + targetAngle; // 3 vueltas + posición final
    
    wheel.classList.remove('spinning-to-result');
    wheel.style.setProperty('--final-rotation', `${finalRotation}deg`);
    
    setTimeout(() => {
      wheel.classList.add('spinning-to-result');
      
      // Mostrar resultados cuando termine la animación
      const onAnimationEnd = () => {
        wheel.removeEventListener('animationend', onAnimationEnd);
        this.showResults();
      };
      
      wheel.addEventListener('animationend', onAnimationEnd);
      
      // Respaldo por si no se dispara el evento de animación
      setTimeout(() => {
        if (this.isSpinning) {
          this.showResults();
        }
      }, 4500);
    }, 100);
  }

  // Mostrar el modal con los resultados
  private showResults() {
    this.ngZone.run(() => {
      this.isSpinning = false;
      this.message = '';
      this.showResultModal = true;
      this.cdr.detectChanges();
    });
  }

  // Detener la animación de la ruleta
  private stopSpinning() {
    if (this.gameWheel?.nativeElement) {
      this.gameWheel.nativeElement.classList.remove('spinning-to-result');
    }
    this.isSpinning = false;
    this.message = '';
  }

  closeResult() { 
    this.showResultModal = false; 
    
    // Limpiar datos del resultado
    this.lastWinningNumber = undefined;
    this.lastWinningColor = undefined;
    this.resultMsg = '';
    this.won = false;
    
    // Reiniciar la ruleta a su posición inicial
    this.resetWheel();
    
    // Actualizar el saldo del usuario en el backend
    if (this.pendingBalanceUpdate > 0) {
      this.auth.updateBalanceInBackend(this.pendingBalanceUpdate).subscribe({
        next: (user) => {
          this.user = user;
        },
        error: (error) => {
          console.warn('Error al actualizar saldo en backend');
        }
      });
      this.pendingBalanceUpdate = 0;
    } else if (this.pendingBalanceDelta !== 0) {
      this.auth.updateBalanceInBackend(this.pendingBalanceDelta).subscribe({
        next: (user) => {
          this.user = user;
        },
        error: (error) => {
          console.warn('Error al actualizar saldo en backend');
        }
      });
      this.pendingBalanceDelta = 0;
    }
    
    this.refresh();
  }

  // Reiniciar la ruleta a su posición inicial
  private resetWheel() {
    if (this.gameWheel?.nativeElement) {
      const wheel = this.gameWheel.nativeElement;
      wheel.classList.remove('spinning-to-result');
      wheel.style.transform = 'rotate(0deg)';
      wheel.style.setProperty('--final-rotation', '0deg');
    }
  }

  // Verificar si un número es rojo en la ruleta
  isRed(n: number): boolean {
    const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return redNumbers.includes(n);
  }
  
  // Seleccionar un número para apostar
  selectNumber(n: number) {
    this.betType = 'numero';
    this.selectedNumber = n;
    this.selectedColor = '';
  }
  
  // Cambiar el valor de la ficha
  setChip(v: number) { 
    this.amount = v; 
  }
  
  // Cambiar el tipo de apuesta (color o número)
  setBetType(type: 'color'|'numero', color?: 'rojo'|'negro') {
    this.betType = type;
    if (type === 'color') {
      this.selectedColor = color || '';
      this.selectedNumber = null;
    }
  }
  
  // Verificar si se puede hacer una apuesta
  get canPlaceBet(): boolean {
    const hasSelection = (this.betType === 'color' && !!this.selectedColor) || 
                        (this.betType === 'numero' && this.selectedNumber !== null);
    const hasEnoughBalance = (this.user?.balance || 0) >= this.amount;
    
    return !!this.currentGameNumber && this.gameStatus === 'open' && hasSelection && this.amount > 0 && hasEnoughBalance;
  }
  
  // Crear una apuesta
  placeBet() {
    if (!this.currentGameNumber) { 
      this.uiMsg = 'No hay una ronda abierta.'; 
      return; 
    }
    if (this.gameStatus !== 'open') { 
      this.uiMsg = 'La ronda no está abierta para apostar.'; 
      return; 
    }
    if (this.betType === 'color' && !this.selectedColor) { 
      this.uiMsg = 'Selecciona un color.'; 
      return; 
    }
    if (this.betType === 'numero' && this.selectedNumber === null) { 
      this.uiMsg = 'Selecciona un número.'; 
      return; 
    }
    if ((this.user?.balance || 0) < this.amount) {
      this.uiMsg = `Saldo insuficiente. Tienes $${this.user?.balance || 0} y necesitas $${this.amount}.`;
      return;
    }
    
    const value: any = this.betType === 'numero' ? this.selectedNumber : this.selectedColor;
    const items: BetItem[] = [{ type: this.betType, value, amount: this.amount }];
    
    this.betsService.createBet(this.currentGameNumber!, items).subscribe({
      next: () => {
        this.uiMsg = 'Apuesta creada. Ahora Cierra la ronda para poder Girar.';
        this.hasBet = true;
        this.canClose = true;
        
        this.refresh();
      },
      error: (e) => { 
        this.uiMsg = e?.error?.msg || 'Error al crear la apuesta'; 
      }
    });
  }
}

