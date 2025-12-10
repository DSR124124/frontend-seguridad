import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorInfo {
  code: string;
  title: string;
  message: string;
  description: string;
  icon: string;
  severity: 'error' | 'warning' | 'info';
  showSupport?: boolean;
  showRefresh?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor(private router: Router) { }

  /**
   * Maneja errores HTTP y los redirige a la página de error apropiada
   */
  handleHttpError(error: HttpErrorResponse): void {
    let errorType: string;
    let customMessage: string | undefined;
    let customDescription: string | undefined;

    switch (error.status) {
      case 0:
        // Error de red o CORS
        errorType = 'network';
        break;
      case 401:
        // No autorizado - redirigir al login
        this.router.navigate(['/login']);
        return;
      case 403:
        errorType = '403';
        break;
      case 419:
        // Token expirado - redirigir a página de error
        errorType = '419';
        break;
      case 404:
        errorType = '404';
        customMessage = 'Recurso no encontrado';
        customDescription = 'El recurso que intentas acceder no existe en el servidor.';
        break;
      case 500:
        errorType = '500';
        break;
      case 503:
        errorType = 'maintenance';
        customMessage = 'Servicio no disponible';
        customDescription = 'El servicio está temporalmente no disponible. Intenta más tarde.';
        break;
      default:
        errorType = '500';
        customMessage = `Error ${error.status}`;
        customDescription = error.message || 'Ha ocurrido un error inesperado.';
    }

    this.showError(errorType, customMessage, customDescription, error.status.toString());
  }

  /**
   * Maneja errores de JavaScript no capturados
   */
  handleJavaScriptError(error: Error): void {
    console.error('Error de JavaScript:', error);

    this.showError('500',
      'Error de aplicación',
      'Ha ocurrido un error inesperado en la aplicación. Por favor, recarga la página.',
      'JS_ERROR'
    );
  }

  /**
   * Muestra una página de error personalizada
   */
  showError(errorType: string, customMessage?: string, customDescription?: string, customCode?: string): void {
    const queryParams: any = { type: errorType };

    if (customMessage) queryParams.message = customMessage;
    if (customDescription) queryParams.description = customDescription;
    if (customCode) queryParams.code = customCode;

    this.router.navigate(['/error'], { queryParams });
  }

  /**
   * Muestra error 404 para rutas no encontradas
   */
  show404(): void {
    this.showError('404');
  }

  /**
   * Muestra error de mantenimiento
   */
  showMaintenance(): void {
    this.showError('maintenance');
  }

  /**
   * Muestra error de acceso denegado
   */
  show403(): void {
    this.showError('403');
  }

  /**
   * Muestra error de red
   */
  showNetworkError(): void {
    this.showError('network');
  }

  /**
   * Muestra error de sesión expirada (419)
   */
  showTokenExpired(): void {
    this.showError('419');
  }
}
