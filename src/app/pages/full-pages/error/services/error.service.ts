import { Injectable } from '@angular/core';

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
export class ErrorService {
  private errorMap: Map<string, ErrorInfo> = new Map([
    ['token', {
      code: 'AUTH_001',
      title: 'Token de Autenticación Requerido',
      message: 'No se encontró un token de autenticación válido',
      description: 'Para acceder a este sistema, necesitas un token de autenticación válido. Por favor, accede desde el sistema de gestión principal.',
      icon: 'pi pi-lock',
      severity: 'error',
      showRefresh: true
    }],
    ['401', {
      code: 'AUTH_002',
      title: 'No Autorizado',
      message: 'No tienes permisos para acceder a este recurso',
      description: 'Tu sesión ha expirado o no tienes los permisos necesarios. Por favor, inicia sesión nuevamente.',
      icon: 'pi pi-ban',
      severity: 'error',
      showRefresh: true
    }],
    ['403', {
      code: 'AUTH_003',
      title: 'Acceso Denegado',
      message: 'No tienes permisos para realizar esta acción',
      description: 'Tu cuenta no tiene los permisos necesarios para acceder a este recurso. Contacta al administrador si crees que esto es un error.',
      icon: 'pi pi-shield',
      severity: 'warning',
      showRefresh: false
    }],
    ['404', {
      code: 'NOT_FOUND',
      title: 'Página No Encontrada',
      message: 'La página que buscas no existe',
      description: 'La URL que intentas acceder no se encuentra en el servidor. Verifica la dirección e intenta nuevamente.',
      icon: 'pi pi-search',
      severity: 'info',
      showRefresh: false
    }],
    ['500', {
      code: 'SERVER_ERROR',
      title: 'Error del Servidor',
      message: 'Ha ocurrido un error en el servidor',
      description: 'El servidor encontró un error al procesar tu solicitud. Por favor, intenta más tarde o contacta al soporte técnico.',
      icon: 'pi pi-exclamation-triangle',
      severity: 'error',
      showRefresh: true
    }],
    ['network', {
      code: 'NETWORK_ERROR',
      title: 'Error de Conexión',
      message: 'No se pudo conectar con el servidor',
      description: 'Verifica tu conexión a internet e intenta nuevamente. Si el problema persiste, el servidor podría estar temporalmente no disponible.',
      icon: 'pi pi-wifi',
      severity: 'error',
      showRefresh: true
    }],
    ['419', {
      code: 'TOKEN_EXPIRED',
      title: 'Sesión Expirada',
      message: 'Tu sesión ha expirado',
      description: 'Por seguridad, tu sesión ha expirado. Por favor, accede nuevamente desde el sistema de gestión principal.',
      icon: 'pi pi-clock',
      severity: 'warning',
      showRefresh: true
    }]
  ]);

  getErrorInfo(errorType: string): ErrorInfo {
    return this.errorMap.get(errorType) || this.errorMap.get('500')!;
  }

  getAllErrors(): ErrorInfo[] {
    return Array.from(this.errorMap.values());
  }
}

