import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('spinparadiseFront');
  constructor(private auth: AuthService, private router: Router) {}
  isAuth() { return this.auth.isAuthenticated(); }
  isAdmin() { return this.auth.getCurrentUser()?.role === 'admin'; }
  currentUser() { return this.auth.getCurrentUser(); }
  logout() { this.auth.logout(); this.router.navigate(['/login']); }
}
