import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { Notificacion, NotificacionDTO, NotificacionUsuarioDTO } from '../interfaces/notificacion.interface';
import { environment } from '../../../../../environment/environment';
import { HttpUtilsService } from '../../../../shared/services/http-utils.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private http = inject(HttpClient);
  private httpUtils = inject(HttpUtilsService);
  private readonly API_URL = `${environment.urlAuth}api/notificaciones`;

  /**
   * Obtiene la lista de todas las notificaciones creadas por el usuario
   */
  listarMisNotificacionesCreadas(idUsuario: number): Observable<Notificacion[]> {
    // Filtrar por creadoPor usando el endpoint de listar
    return this.http.get<Notificacion[]>(this.API_URL).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Obtiene todas las notificaciones asignadas al usuario
   */
  obtenerMisNotificacionesAsignadas(idUsuario: number): Observable<NotificacionUsuarioDTO[]> {
    return this.http.get<NotificacionUsuarioDTO[]>(`${this.API_URL}/usuario/${idUsuario}`).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Obtiene las notificaciones no leídas del usuario
   */
  obtenerNotificacionesNoLeidas(idUsuario: number): Observable<NotificacionUsuarioDTO[]> {
    return this.http.get<NotificacionUsuarioDTO[]>(`${this.API_URL}/usuario/${idUsuario}/no-leidas`).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Obtiene una notificación por su ID
   */
  obtenerPorId(id: number): Observable<Notificacion> {
    return this.http.get<Notificacion>(`${this.API_URL}/${id}`).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Crea una nueva notificación
   */
  crear(notificacionDTO: NotificacionDTO): Observable<Notificacion> {
    return this.http.post<Notificacion>(this.API_URL, notificacionDTO).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Actualiza una notificación existente
   */
  actualizar(id: number, notificacionDTO: NotificacionDTO): Observable<Notificacion> {
    return this.http.put<Notificacion>(`${this.API_URL}/${id}`, notificacionDTO).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Elimina una notificación
   */
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Marca una notificación como leída
   */
  marcarComoLeida(idNotificacion: number, idUsuario: number): Observable<any> {
    return this.http.put(`${this.API_URL}/${idNotificacion}/usuario/${idUsuario}/marcar-leida`, {}).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }

  /**
   * Confirma una notificación
   */
  confirmarNotificacion(idNotificacion: number, idUsuario: number): Observable<any> {
    return this.http.put(`${this.API_URL}/${idNotificacion}/usuario/${idUsuario}/confirmar`, {}).pipe(
      catchError(error => this.httpUtils.handleError(error))
    );
  }
}

