import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard para proteger rutas de administrador
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  // En SSR no podemos verificar localStorage, permitir y validar en el cliente
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  
  const user = auth.getCurrentUser();
  if (user && (user.role === 'admin')) {
    return true;
  }
  
  // Redirigir a página de no autorizado si no es admin
  return router.createUrlTree(['/not-authorized']);
};

