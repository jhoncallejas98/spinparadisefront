import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    // En SSR no podemos leer localStorage; permitir y validar del lado del cliente
    return true;
  }

  const isAuthenticated = auth.isAuthenticated();
  if (!isAuthenticated) return router.createUrlTree(['/login']);
  return true;
};

