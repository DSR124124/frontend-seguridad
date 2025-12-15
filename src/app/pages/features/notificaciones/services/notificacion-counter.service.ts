import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { NotificacionService } from './notificacion.service';
import { NotificacionWebsocketService } from './notificacion-websocket.service';
import { AuthUserService } from '../../../../core/services/auth-user.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacionCounterService {
  private notificacionService = inject(NotificacionService);
  private notificacionWsService = inject(NotificacionWebsocketService);
  private authUserService = inject(AuthUserService);

  private unreadCount$ = new BehaviorSubject<number>(0);
  private subscription?: Subscription;
  private wsSubscription?: Subscription;

  /**
   * Observable del contador de notificaciones no leídas
   */
  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  /**
   * Obtiene el valor actual del contador
   */
  getCurrentCount(): number {
    return this.unreadCount$.value;
  }

  /**
   * Inicializa el servicio: carga el contador y se suscribe a notificaciones en tiempo real
   */
  initialize(): void {
    const idUsuario = this.authUserService.obtenerIdUsuario();
    if (!idUsuario) {
      console.warn('No se pudo obtener el ID de usuario para inicializar el contador');
      return;
    }

    // Cargar contador inicial
    this.loadUnreadCount(idUsuario);

    // Suscribirse a notificaciones en tiempo real
    this.subscribeToRealtimeNotifications(idUsuario);
  }

  /**
   * Carga el contador de notificaciones no leídas desde el servidor
   */
  private loadUnreadCount(idUsuario: number): void {
    this.notificacionService.obtenerNotificacionesNoLeidas(idUsuario).subscribe({
      next: (notificaciones) => {
        const count = notificaciones?.length || 0;
        this.unreadCount$.next(count);
      },
      error: (error) => {
        console.error('Error al cargar contador de notificaciones:', error);
      }
    });
  }

  /**
   * Se suscribe a las notificaciones en tiempo real para actualizar el contador
   */
  private subscribeToRealtimeNotifications(idUsuario: number): void {
    // Suscribirse a todas las notificaciones nuevas
    // Cuando llega una nueva notificación, recargar el contador para asegurar precisión
    this.wsSubscription = this.notificacionWsService
      .suscribirseANotificacionesCreadasPorMi()
      .subscribe({
        next: (notificacion) => {
          // Cuando llega una nueva notificación, recargar el contador desde el servidor
          // Esto asegura que solo contamos las notificaciones realmente asignadas al usuario
          setTimeout(() => {
            this.loadUnreadCount(idUsuario);
          }, 500);
        },
        error: (error) => {
          console.error('Error en suscripción WebSocket de notificaciones:', error);
        }
      });
  }

  /**
   * Incrementa el contador manualmente
   */
  increment(): void {
    const currentCount = this.unreadCount$.value;
    this.unreadCount$.next(currentCount + 1);
  }

  /**
   * Decrementa el contador manualmente
   */
  decrement(): void {
    const currentCount = this.unreadCount$.value;
    if (currentCount > 0) {
      this.unreadCount$.next(currentCount - 1);
    }
  }

  /**
   * Actualiza el contador recargando desde el servidor
   */
  refresh(): void {
    const idUsuario = this.authUserService.obtenerIdUsuario();
    if (idUsuario) {
      this.loadUnreadCount(idUsuario);
    }
  }

  /**
   * Limpia las suscripciones
   */
  destroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }
}

