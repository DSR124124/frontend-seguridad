import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, filter, switchMap, take } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Notificacion } from '../interfaces/notificacion.interface';
import { AuthUserService } from '../../../../core/services/auth-user.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacionWebsocketService {
  private client: Client;
  private connected$ = new BehaviorSubject<boolean>(false);

  private authUserService = inject(AuthUserService);

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(this.buildWsUrl()),
      reconnectDelay: 5000,
      debug: () => {}
    });

    this.client.onConnect = () => {
      this.connected$.next(true);
    };

    this.client.onStompError = () => {
      this.connected$.next(false);
    };

    this.client.onWebSocketClose = () => {
      this.connected$.next(false);
    };

    this.client.activate();
  }

  /**
   * Se suscribe al topic de notificaciones nuevas y emite solo
   * aquellas cuyo creador sea el usuario actual.
   */
  suscribirseANotificacionesCreadasPorMi(): Observable<Notificacion> {
    const idUsuario = this.authUserService.obtenerIdUsuario();

    return this.connected$.pipe(
      filter((c) => c),
      take(1),
      switchMap(
        () =>
          new Observable<Notificacion>((observer) => {
            const subscription: StompSubscription = this.client.subscribe(
              '/topic/notificaciones-nuevas',
              (message: IMessage) => {
                try {
                  const payload = JSON.parse(message.body) as any;
                  if (payload.creadoPor === idUsuario) {
                    // Adaptamos ligeramente a la interfaz Notificacion que usa el listado
                    const notificacion: Notificacion = {
                      idNotificacion: payload.idNotificacion!,
                      titulo: payload.titulo!,
                      mensaje: payload.mensaje!,
                      tipoNotificacion: payload.tipoNotificacion!,
                      prioridad: payload.prioridad!,
                      idAplicacion: payload.idAplicacion!,
                      nombreAplicacion: payload.nombreAplicacion!,
                      creadoPor: payload.creadoPor!,
                      creadorNombre: payload.creadorNombre!,
                      fechaCreacion: payload.fechaCreacion?.toString() ?? '',
                      fechaEnvio: payload.fechaEnvio?.toString() ?? null,
                      requiereConfirmacion: payload.requiereConfirmacion ?? false,
                      mostrarComoRecordatorio: payload.mostrarComoRecordatorio ?? true,
                      activo: payload.activo ?? true,
                      datosAdicionales: payload.datosAdicionales ?? null,
                      fechaModificacion: payload.fechaModificacion?.toString() ?? '',
                      totalDestinatarios: payload.totalDestinatarios ?? 0,
                      totalLeidas: payload.totalLeidas ?? 0,
                      totalConfirmadas: payload.totalConfirmadas ?? 0
                    };

                    // Mostrar notificación del navegador (si está disponible)
                    this.mostrarNotificacionNavegador(notificacion);

                    observer.next(notificacion);
                  }
                } catch {
                  // Ignorar mensajes inválidos
                }
              }
            );

            return () => subscription.unsubscribe();
          })
      )
    );
  }

  /**
   * Muestra una notificación nativa del navegador si el usuario
   * ha concedido permisos (o los concede al solicitarlos).
   */
  private mostrarNotificacionNavegador(notificacion: Notificacion): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const mostrar = () => {
      const bodyLines: string[] = [];
      if (notificacion.mensaje) {
        bodyLines.push(notificacion.mensaje);
      }
      if (notificacion.nombreAplicacion) {
        bodyLines.push(`app ${notificacion.nombreAplicacion}`);
      }

      new Notification(notificacion.titulo, {
        body: bodyLines.join('\n'),
        icon: '/assets/icons/icon-192.png', // ajusta la ruta si tienes un icono
      });
    };

    if (Notification.permission === 'granted') {
      mostrar();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          mostrar();
        }
      });
    }
    // Si es 'denied', no hacemos nada
  }

  private buildWsUrl(): string {
    // Tomamos el host/puerto actual y apuntamos al endpoint HTTP de SockJS.
    // SockJS se encarga internamente de usar WebSocket/long polling según corresponda.
    const origin = window.location.origin; // ej: http://localhost:4200 o https://edugen.brianuceda.xyz
    return `${origin}/gestion/ws-notificaciones`;
  }
}


