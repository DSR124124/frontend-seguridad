import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TokenHandlerService {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  initializeTokenFromQueryParams(): void {
    // Obtener el token de los query params actuales
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const token = params['token'];
      if (token && typeof token === 'string') {
        // Guardar el token en localStorage
        const existingToken = localStorage.getItem('auth_token');
        if (!existingToken || existingToken !== token) {
          localStorage.setItem('auth_token', token);
        }

        // Limpiar la URL del token inmediatamente
        const currentUrl = this.router.url.split('?')[0];
        const queryParams = { ...params };
        delete queryParams['token'];

        // Navegar sin el token en los query params
        const hasOtherParams = Object.keys(queryParams).length > 0;

        if (hasOtherParams) {
          // Si hay otros query params, mantenerlos pero sin el token
          this.router.navigate([currentUrl], {
            replaceUrl: true,
            queryParams: queryParams
          });
        } else {
          // Si solo había el token, navegar sin query params
          this.router.navigate([currentUrl], {
            replaceUrl: true
          }).then(() => {
            // Forzar limpieza de la URL en el navegador
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          });
        }
      }
    });
  }
}

