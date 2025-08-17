import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard para proteger rutas que requieren autenticación
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  // En SSR no podemos leer localStorage, permitir y validar en el cliente
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const isAuthenticated = auth.isAuthenticated();
  if (!isAuthenticated) return router.createUrlTree(['/login']);
  return true;
};

