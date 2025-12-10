import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TokenHandlerService {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  initializeTokenFromQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token && typeof token === 'string') {
        // Guardar el token en localStorage
        const existingToken = localStorage.getItem('auth_token');
        if (!existingToken || existingToken !== token) {
          localStorage.setItem('auth_token', token);

          // Limpiar la URL del token
          const cleanUrl = this.router.url.split('?')[0];
          this.router.navigate([cleanUrl], {
            replaceUrl: true,
            queryParams: {}
          });
        }
      }
    });
  }
}

