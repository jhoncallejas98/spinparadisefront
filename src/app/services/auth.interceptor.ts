import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const authService = inject(AuthService);
    const token = authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.warn('Error en interceptor de autenticación:', error);
  }
  
  return next(req);
};

