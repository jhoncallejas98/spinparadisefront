import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { homeGuard } from './guards/home.guard';
import { playerGuard } from './guards/player.guard';

// Configuración de rutas de la aplicación
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', canActivate: [homeGuard], loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth/register.component').then(m => m.RegisterComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard-shell.component').then(m => m.DashboardShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'bets', loadComponent: () => import('./pages/bets/bets.component').then(m => m.BetsComponent) },
      { path: 'bets/new', loadComponent: () => import('./pages/bets/bet-form.component').then(m => m.BetFormComponent) },
      { path: 'bets/:id', loadComponent: () => import('./pages/bets/bet-detail.component').then(m => m.BetDetailComponent) },
      { path: 'rounds', canActivate: [playerGuard], loadComponent: () => import('./pages/games/games.component').then(m => m.GamesComponent) },
      { path: 'rounds/new', canActivate: [adminGuard], loadComponent: () => import('./pages/rounds/round-form.component').then(m => m.RoundFormComponent) },
      { path: 'rounds/:id', loadComponent: () => import('./pages/rounds/round-detail.component').then(m => m.RoundDetailComponent) },
      { path: 'rounds/:id/result', loadComponent: () => import('./pages/rounds/round-result.component').then(m => m.RoundResultComponent) },
      { path: 'users/rounds/:id/spin', canActivate: [adminGuard], loadComponent: () => import('./pages/rounds/round-spin.component').then(m => m.RoundSpinComponent) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'balance/add', loadComponent: () => import('./pages/balance/add-balance.component').then(m => m.AddBalanceComponent) },
      { path: 'admin/users', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/users.component').then(m => m.UsersComponent) },
      { path: 'admin/monitor', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/monitor.component').then(m => m.MonitorComponent), resolve: { monitor: () => import('./pages/admin/monitor.resolver').then(m => m.monitorResolver) } },
      { path: 'admin/games/:gameNumber/bets', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/round-bets.component').then(m => m.RoundBetsComponent) },
      { path: 'admin/users/:id', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/user-detail.component').then(m => m.UserDetailComponent) }
    ]
  },
  { path: 'not-authorized', loadComponent: () => import('./pages/shared/not-authorized.component').then(m => m.NotAuthorizedComponent) },
  
  // Rutas en español para mejor UX
  { path: 'juego', canActivate: [authGuard, playerGuard], loadComponent: () => import('./pages/games/games.component').then(m => m.GamesComponent) },
  { path: 'apuestas', canActivate: [authGuard], loadComponent: () => import('./pages/bets/bets.component').then(m => m.BetsComponent) },
  
  // Redirecciones para compatibilidad
  { path: 'games', redirectTo: '/dashboard/rounds', pathMatch: 'full' },
  { path: 'bets', redirectTo: '/dashboard/bets', pathMatch: 'full' },
  
  // Ruta para páginas no encontradas
  { path: '**', loadComponent: () => import('./pages/shared/not-found.component').then(m => m.NotFoundComponent) }
];
