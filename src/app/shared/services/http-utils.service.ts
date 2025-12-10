import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { MessageResponse } from '../../core/interfaces/message.interfaces';

@Injectable({
  providedIn: 'root'
})
export class HttpUtilsService {

  handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error HTTP:', error);

    const errorMessage = error.error?.message || error.message || 'Error inesperado';

    // Si el error tiene la estructura de MessageResponse, devolverla
    if (error.error && typeof error.error === 'object' && 'success' in error.error) {
      const messageResponse: MessageResponse = {
        success: false,
        message: error.error.message || errorMessage,
        mensajeAviso: error.error.mensajeAviso || null,
        data: error.error.data || null
      };
      return throwError(() => messageResponse);
    }

    // Si no, crear una estructura MessageResponse básica
    const messageResponse: MessageResponse = {
      success: false,
      message: errorMessage,
      mensajeAviso: null,
      data: error.error?.data || null
    };

    return throwError(() => messageResponse);
  }
}
