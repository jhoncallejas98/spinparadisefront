import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    // En SSR, no usar localStorage ni bloquear; dejar al cliente validar
    return true;
  }
  const user = auth.getCurrentUser();
  if (user && (user.role === 'admin')) {
    return true;
  }
  return router.createUrlTree(['/not-authorized']);
};

