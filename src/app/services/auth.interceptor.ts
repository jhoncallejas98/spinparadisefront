import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const platformId = inject(PLATFORM_ID);
    
    // Solo ejecutar en el navegador, no en el servidor SSR
    if (isPlatformBrowser(platformId)) {
      const authService = inject(AuthService);
      const token = authService.getToken();
      
      if (token) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }
  } catch (error) {
    console.warn('Error en interceptor de autenticación:', error);
  }
  
  return next(req);
};

