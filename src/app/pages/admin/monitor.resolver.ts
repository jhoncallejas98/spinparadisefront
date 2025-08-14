import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, of } from 'rxjs';

export const monitorResolver: ResolveFn<any[]> = () => {
  const http = inject(HttpClient);
  return http
    .get<any[]>(`${environment.apiUrl}/api/games?includeStats=true`)
    .pipe(catchError(() => of([])));
};

