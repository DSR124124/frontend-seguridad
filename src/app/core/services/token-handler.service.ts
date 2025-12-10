import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class TokenHandlerService {
  private router = inject(Router);
  private messageService = inject(MessageService);

  initializeTokenFromQueryParams(): void {
    // Leer los query params directamente de la URL del navegador
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token && token.trim() !== '') {
      // Guardar el token en localStorage
      const existingToken = localStorage.getItem('auth_token');
      const isNewToken = !existingToken || existingToken !== token;

      if (isNewToken) {
        localStorage.setItem('auth_token', token);

        // Mostrar mensaje de bienvenida solo si es un token nuevo
        if (!existingToken) {
          this.messageService.success('Bienvenido al Sistema de Gestión de Seguridad', 'Acceso exitoso', 5000);
        }
      }

      // Limpiar la URL del token inmediatamente
      const currentPath = window.location.pathname;

      // Crear una copia de los query params sin el token
      const remainingParams = new URLSearchParams(urlParams);
      remainingParams.delete('token');

      // Construir la nueva URL sin el token
      const remainingParamsString = remainingParams.toString();
      const newUrl = remainingParamsString
        ? `${currentPath}?${remainingParamsString}`
        : currentPath;

      // Reemplazar la URL en el historial sin recargar la página
      window.history.replaceState({}, '', newUrl);

      // También actualizar el router de Angular para mantener la sincronización
      const routerUrl = this.router.url.split('?')[0];
      if (remainingParamsString) {
        const queryParams: any = {};
        remainingParams.forEach((value, key) => {
          queryParams[key] = value;
        });
        this.router.navigate([routerUrl], {
          replaceUrl: true,
          queryParams: queryParams
        });
      } else {
        this.router.navigate([routerUrl], {
          replaceUrl: true
        });
      }
    }
  }
}

