import { Component, ViewChild, ElementRef } from '@angular/core';
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
  // UI state
  betType: 'color' | 'numero' = 'color';
  selectedColor: 'rojo' | 'negro' | '' = '';
  selectedNumber: number | null = null;
  amount = 10;
  uiMsg = '';
  lastWinningNumber?: number;
  lastWinningColor?: 'rojo'|'negro'|'verde';
  resultMsg = '';
  showResultModal = false;
  won = false;
  gameStatus: 'open'|'closed'|'finished'|'' = '';
  hasBet = false;
  canClose = false;
  canSpin = false;
  isSpinning = false;

  @ViewChild('gameWheel') gameWheel!: ElementRef<HTMLDivElement>;

  // Orden de números en la ruleta europea (desde el 0 en sentido horario)
  private readonly wheelNumbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  private getAngleForNumber(number: number): number {
    const index = this.wheelNumbers.indexOf(number);
    if (index === -1) {
      console.warn('Número no encontrado en la ruleta:', number);
      return 0; // respaldo
    }
    // Cada número ocupa 9.73 grados (360 / 37)
    // Ajustar para centrar exactamente el número bajo el indicador
    // Añadir medio segmento (4.865 grados) para centrar
    const baseAngle = index * 9.73;
    const centeredAngle = 360 - (baseAngle + 4.865); // Centrado perfecto
    console.log(`Número ${number} está en índice ${index}, ángulo centrado ${centeredAngle}`);
    return centeredAngle;
  }

  constructor(private gamesService: GamesService, private auth: AuthService, private betsService: BetsService) {
    this.user = this.auth.getCurrentUser();
    this.refresh();
  }

  refresh() {
    this.gamesService.listGames().subscribe(g => {
      this.games = g;
      const active = g.find(x => x.status === 'open' || x.status === 'closed');
      this.currentGameNumber = active?.gameNumber;
      this.gameStatus = (active?.status as any) || '';
      this.canClose = this.gameStatus === 'open' && this.hasBet;
      this.canSpin = this.gameStatus === 'closed';
    });
  }

  open() {
    this.gamesService.openGame().subscribe(res => {
      this.message = `Juego abierto #${res.gameNumber}`;
      this.hasBet = false;
      this.canClose = false;
      this.canSpin = false;
      this.gameStatus = 'open';
      this.refresh();
    });
  }

  close() {
    if (!this.currentGameNumber) return;
    this.gamesService.closeGame(this.currentGameNumber).subscribe(() => {
      this.message = `Juego #${this.currentGameNumber} cerrado`;
      this.gameStatus = 'closed';
      this.canClose = false;
      this.canSpin = true;
      this.refresh();
    });
  }

  spin() {
    if (!this.currentGameNumber || this.isSpinning) return;
    
    // Start spinning animation
    this.isSpinning = true;
    // Remove any previous classes and reset transform
    const wheel = this.gameWheel.nativeElement;
    wheel.classList.remove('spinning-to-result');
    wheel.style.transform = 'rotate(0deg)'; // Reset position
    this.message = '¡Girando la ruleta...';
    
    console.log('Iniciando animación de giro...');
    
    // Call backend API
    this.gamesService.spin(this.currentGameNumber).subscribe({ 
      next: (g) => {
        console.log('Spin result:', g); // Debug log
        
        // Prepare result data immediately
        this.lastWinningNumber = g.winningNumber;
        
        // Calculate color from number
        let color = 'verde';
        if (g.winningNumber && g.winningNumber > 0) {
          color = this.isRed(g.winningNumber) ? 'rojo' : 'negro';
        }
        this.lastWinningColor = color as any;
        
        // Calculate winnings
        let won = false;
        let payout = 0;
        if (this.betType === 'color' && this.selectedColor) {
          won = (this.selectedColor === color);
          payout = won ? this.amount * 2 : 0;
        } else if (this.betType === 'numero' && this.selectedNumber !== null) {
          won = (this.selectedNumber === g.winningNumber);
          payout = won ? this.amount * 36 : 0;
        }
        
        this.won = won;
        this.resultMsg = won
          ? `¡Ganaste! Pago estimado ${payout}`
          : 'Perdiste esta ronda';
        
        console.log('Result calculated:', { won, payout, color }); // Debug log
        
        // Update balance
        this.auth.updateBalanceLocallyBy(won ? payout : -this.amount);
        this.user = this.auth.getCurrentUser();
        
        // Calculate target angle for the winning number
        const targetAngle = this.getAngleForNumber(g.winningNumber!);
        // The wheel rotates counter-clockwise, so we need to adjust
        const finalRotation = 1080 + targetAngle; // 3 full turns + stop at number
        
        console.log(`Número objetivo: ${g.winningNumber}, ángulo: ${targetAngle}, rotación final: ${finalRotation}`);
        
        // Crear animación dinámica
        const wheel = this.gameWheel.nativeElement;
        
        // Usar un timeout como respaldo en caso de que animationend falle
        const showResultsNow = () => {
          console.log('¡MOSTRANDO RESULTADOS AHORA!');
          
          // Detener el giro
          wheel.classList.remove('spinning-to-result');
          this.isSpinning = false;
          
          // Limpiar mensaje de giro
          this.message = '';
          
          // FORZAR la aparición del modal
          this.showResultModal = true;
          
          console.log('✅ Modal activado:', this.showResultModal);
          console.log('✅ Datos completos:', {
            won: this.won,
            number: this.lastWinningNumber,
            color: this.lastWinningColor,
            result: this.resultMsg
          });
          
          // Actualizar saldo inmediatamente
          this.user = this.auth.getCurrentUser();
          console.log('✅ Saldo actualizado:', this.user?.balance);
          
          // Cerrar modal automáticamente después de 6 segundos
          setTimeout(() => {
            console.log('Cerrando modal automáticamente');
            this.closeResult();
          }, 6000);
          
          this.refresh();
        };
        
        // Escuchar el fin de la animación
        const onAnimationEnd = (event: AnimationEvent) => {
          console.log('Evento de animación detectado:', event.animationName);
          
          if (event.target !== wheel || event.animationName !== 'spin-to-result') {
            return;
          }
          
          wheel.removeEventListener('animationend', onAnimationEnd);
          showResultsNow();
        };
        
        wheel.addEventListener('animationend', onAnimationEnd);
        
        // RESPALDO: Forzar resultados después de 4.5 segundos sin importar qué
        setTimeout(() => {
          if (this.isSpinning) {
            console.log('⚠️ RESPALDO ACTIVADO - Forzando resultados');
            showResultsNow();
          }
        }, 4500);
        
        // Iniciar animación con pequeño retraso
        setTimeout(() => {
          console.log('Iniciando animación con rotación:', `${finalRotation}deg`);
          wheel.style.setProperty('--final-rotation', `${finalRotation}deg`);
          wheel.classList.add('spinning-to-result');
          console.log('Clase spinning-to-result agregada');
        }, 100);
      }, 
      error: (e: any) => {
        // Detener el giro en caso de error
        if (this.gameWheel?.nativeElement) {
          this.gameWheel.nativeElement.classList.remove('spinning');
          this.gameWheel.nativeElement.classList.remove('spinning-to-result');
        }
        this.isSpinning = false;
        this.uiMsg = e?.error?.msg || 'No se pudo girar. Cierra la ronda antes de girar.';
      }
    });
  }

  closeResult() { this.showResultModal = false; }

  // UI helpers
  isRed(n: number): boolean {
    return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n);
  }
  selectNumber(n: number) {
    this.betType = 'numero';
    this.selectedNumber = n;
    this.selectedColor = '';
  }
  setChip(v: number) { this.amount = v; }
  setBetType(type: 'color'|'numero', color?: 'rojo'|'negro') {
    this.betType = type;
    if (type === 'color') {
      this.selectedColor = color || '';
      this.selectedNumber = null;
    }
  }
  get canPlaceBet(): boolean {
    const hasSelection = (this.betType === 'color' && !!this.selectedColor) || (this.betType === 'numero' && this.selectedNumber !== null);
    return !!this.currentGameNumber && this.gameStatus === 'open' && hasSelection && this.amount > 0;
  }
  placeBet() {
    if (!this.currentGameNumber) { this.uiMsg = 'No hay una ronda abierta.'; return; }
    if (this.gameStatus !== 'open') { this.uiMsg = 'La ronda no está abierta para apostar.'; return; }
    if (this.betType === 'color' && !this.selectedColor) { this.uiMsg = 'Selecciona un color.'; return; }
    if (this.betType === 'numero' && this.selectedNumber === null) { this.uiMsg = 'Selecciona un número.'; return; }
    const value: any = this.betType === 'numero' ? this.selectedNumber : this.selectedColor;
    const items: BetItem[] = [{ type: this.betType, value, amount: this.amount }];
    this.betsService.createBet(this.currentGameNumber!, items).subscribe({
      next: () => {
        this.uiMsg = 'Apuesta creada. Ahora Cierra la ronda para poder Girar.';
        this.hasBet = true;
        this.canClose = true;
        this.refresh();
      },
      error: (e) => { this.uiMsg = e?.error?.msg || 'Error al crear la apuesta'; }
    });
  }
}

