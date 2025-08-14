import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `<div class="card" style="max-width:640px;margin:40px auto;text-align:center"><h2>404 - Página no encontrada</h2><p>La ruta no existe.</p><a class="btn" routerLink="/home">Ir al inicio</a></div>`
})
export class NotFoundComponent {}

