import { Injectable } from '@angular/core';
import { MessageService as PrimeMessageService } from 'primeng/api';
import { MessageResponse } from '../interfaces/message.interfaces';

export interface MessageConfig {
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail: string;
  life?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  constructor(private primeMessageService: PrimeMessageService) { }

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Muestra un mensaje de éxito
   */
  success(message: string, summary: string = 'Éxito', life: number = 4000): void {
    this.add({
      severity: 'success',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra un mensaje de información
   */
  info(message: string, summary: string = 'Información', life: number = 4000): void {
    this.add({
      severity: 'info',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra un mensaje de advertencia
   */
  warn(message: string, summary: string = 'Advertencia', life: number = 6000): void {
    this.add({
      severity: 'warn',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra un mensaje de error
   */
  error(message: string, summary: string = 'Error', life: number = 6000): void {
    this.add({
      severity: 'error',
      summary,
      detail: message,
      life
    });
  }

  // ==================== MÉTODOS ESPECÍFICOS PARA COTIZACIONES ====================

  /**
   * Muestra mensaje de búsqueda exitosa
   */
  searchSuccess(message: string, life: number = 4000): void {
    this.success(message, 'Éxito', life);
  }

  /**
   * Muestra mensaje de búsqueda sin resultados
   */
  searchNoResults(message: string, life: number = 6000): void {
    this.warn(message, 'Búsqueda', life);
  }

  /**
   * Muestra mensaje de aviso del backend
   */
  backendInfo(message: string, life: number = 4000): void {
    this.info(message, 'Información', life);
  }

  /**
   * Muestra mensaje de error del backend
   */
  backendError(message: string, life: number = 6000): void {
    this.error(message, 'Error', life);
  }

  /**
   * Muestra mensaje de error de conexión
   */
  connectionError(life: number = 6000): void {
    this.error('No se pudo conectar con el servidor', 'Error de Conexión', life);
  }

  // ==================== MÉTODOS PARA ACTUALIZACIONES ====================

  /**
   * Muestra mensaje de actualización exitosa
   */
  updateSuccess(message: string, summary: string, life: number = 8000): void {
    this.success(message, summary, life);
  }

  /**
   * Muestra mensaje de actualización con advertencia
   */
  updateWarning(message: string, summary: string, life: number = 8000): void {
    this.warn(message, summary, life);
  }

  // ==================== MÉTODOS PARA RESPUESTAS DEL BACKEND ====================

  /**
   * Procesa respuesta del backend y muestra mensajes apropiados
   */
  handleBackendResponse(response: MessageResponse, isUpdate: boolean = false, successSummary: string = 'Éxito'): void {
    if (response.success) {
      // Respuesta exitosa
      if (!isUpdate && response.message) {
        this.success(response.message, successSummary);
      }
      if (response.mensajeAviso) {
        this.backendInfo(response.mensajeAviso);
      }
    } else {
      // Respuesta fallida
      if (response.message) {
        this.searchNoResults(response.message);
      }
      if (response.mensajeAviso) {
        this.backendInfo(response.mensajeAviso);
      }
    }
  }

  /**
   * Procesa error HTTP y muestra mensajes apropiados
   */
  handleHttpError(error: any): void {
    const backendResponse: MessageResponse | any = error?.error || error;

    // Verificar si la respuesta tiene la estructura de MessageResponse
    if (backendResponse && typeof backendResponse === 'object' && 'message' in backendResponse) {
      if (backendResponse.message) {
        // Mostrar mensaje del backend
        this.searchNoResults(backendResponse.message);
      }

      // Mostrar mensaje de aviso si existe
      if (backendResponse.mensajeAviso) {
        this.backendInfo(backendResponse.mensajeAviso);
      }
    } else {
      // Error genérico
      this.connectionError();
    }
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * Limpia todos los mensajes
   */
  clear(): void {
    this.primeMessageService.clear();
  }

  /**
   * Agrega un mensaje personalizado
   */
  add(config: MessageConfig): void {
    this.primeMessageService.add(config);
  }

  /**
   * Agrega múltiples mensajes
   */
  addAll(configs: MessageConfig[]): void {
    this.primeMessageService.addAll(configs);
  }
}
