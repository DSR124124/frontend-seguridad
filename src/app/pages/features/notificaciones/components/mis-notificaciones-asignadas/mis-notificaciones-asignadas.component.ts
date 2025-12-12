import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificacionUsuarioDTO } from '../../interfaces/notificacion.interface';
import { NotificacionService } from '../../services/notificacion.service';
import { AuthUserService } from '../../../../../core/services/auth-user.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mis-notificaciones-asignadas',
  standalone: true,
  imports: [
    ...PrimeNGModules
  ],
  templateUrl: './mis-notificaciones-asignadas.component.html',
  styleUrl: './mis-notificaciones-asignadas.component.css'
})
export class MisNotificacionesAsignadasComponent implements OnInit, OnDestroy {
  notificaciones: NotificacionUsuarioDTO[] = [];
  notificacionesFiltradas: NotificacionUsuarioDTO[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  filtroTipo: string = '';
  filtroPrioridad: string = '';
  mostrarSoloNoLeidas: boolean = false;
  idUsuario: number | null = null;
  private loadingSubscription?: Subscription;

  tiposNotificacion = [
    { label: 'Todas', value: '' },
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Success', value: 'success' },
    { label: 'Critical', value: 'critical' }
  ];

  prioridades = [
    { label: 'Todas', value: '' },
    { label: 'Baja', value: 'baja' },
    { label: 'Normal', value: 'normal' },
    { label: 'Alta', value: 'alta' },
    { label: 'Urgente', value: 'urgente' }
  ];

  constructor(
    private notificacionService: NotificacionService,
    private authUserService: AuthUserService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => this.loading = loading
    );
    this.idUsuario = this.authUserService.obtenerIdUsuario();
    if (this.idUsuario) {
      this.cargarNotificaciones();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario',
        life: 5000
      });
    }
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  cargarNotificaciones(): void {
    if (!this.idUsuario) return;

    this.loadingService.show();
    this.notificacionService.obtenerMisNotificacionesAsignadas(this.idUsuario).subscribe({
      next: (notificaciones) => {
        this.notificaciones = notificaciones || [];
        this.aplicarFiltros();
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar las notificaciones';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  aplicarFiltros(): void {
    let filtradas = [...this.notificaciones];

    if (this.mostrarSoloNoLeidas) {
      filtradas = filtradas.filter(notif => !notif.leida);
    }

    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      filtradas = filtradas.filter(notif =>
        notif.titulo.toLowerCase().includes(termino) ||
        notif.mensaje.toLowerCase().includes(termino)
      );
    }

    if (this.filtroTipo) {
      filtradas = filtradas.filter(notif => notif.tipoNotificacion === this.filtroTipo);
    }

    if (this.filtroPrioridad) {
      filtradas = filtradas.filter(notif => notif.prioridad === this.filtroPrioridad);
    }

    this.notificacionesFiltradas = filtradas;
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroTipo = '';
    this.filtroPrioridad = '';
    this.mostrarSoloNoLeidas = false;
    this.aplicarFiltros();
  }

  getSeverityTipo(tipo: string): string {
    const severities: { [key: string]: string } = {
      'info': 'info',
      'warning': 'warn',
      'error': 'danger',
      'success': 'success',
      'critical': 'danger'
    };
    return severities[tipo] || 'info';
  }

  getSeverityPrioridad(prioridad: string): string {
    const severities: { [key: string]: string } = {
      'baja': 'secondary',
      'normal': 'info',
      'alta': 'warn',
      'urgente': 'danger'
    };
    return severities[prioridad] || 'info';
  }

  getLabelTipo(tipo: string): string {
    const labels: { [key: string]: string } = {
      'info': 'Info',
      'warning': 'Advertencia',
      'error': 'Error',
      'success': 'Éxito',
      'critical': 'Crítica'
    };
    return labels[tipo] || tipo;
  }

  getLabelPrioridad(prioridad: string): string {
    const labels: { [key: string]: string } = {
      'baja': 'Baja',
      'normal': 'Normal',
      'alta': 'Alta',
      'urgente': 'Urgente'
    };
    return labels[prioridad] || prioridad;
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return '-';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  marcarComoLeida(notificacion: NotificacionUsuarioDTO): void {
    if (!this.idUsuario || notificacion.leida) return;

    this.loadingService.show();
    this.notificacionService.marcarComoLeida(notificacion.idNotificacion, this.idUsuario).subscribe({
      next: () => {
        this.loadingService.hide();
        notificacion.leida = true;
        notificacion.fechaLectura = new Date().toISOString();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Notificación marcada como leída',
          life: 3000
        });
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al marcar como leída';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  confirmarNotificacion(notificacion: NotificacionUsuarioDTO): void {
    if (!this.idUsuario || !notificacion.requiereConfirmacion || notificacion.confirmada) return;

    this.loadingService.show();
    this.notificacionService.confirmarNotificacion(notificacion.idNotificacion, this.idUsuario).subscribe({
      next: () => {
        this.loadingService.hide();
        notificacion.confirmada = true;
        notificacion.fechaConfirmacion = new Date().toISOString();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Notificación confirmada',
          life: 3000
        });
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al confirmar la notificación';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }
}

