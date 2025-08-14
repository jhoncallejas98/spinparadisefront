import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LoginComponent } from '../auth/login.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LoginComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private auth: AuthService, private router: Router) {}
  isAuth() { return this.auth.isAuthenticated(); }
  goDashboard() { this.router.navigateByUrl('/dashboard'); }
  logout() { this.auth.logout(); }
}

