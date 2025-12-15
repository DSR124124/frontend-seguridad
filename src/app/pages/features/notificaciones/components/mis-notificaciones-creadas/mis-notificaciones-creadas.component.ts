import { Component, OnInit, ViewChild } from '@angular/core';
import { Notificacion } from '../../interfaces/notificacion.interface';
import { NotificacionService } from '../../services/notificacion.service';
import { AuthUserService } from '../../../../../core/services/auth-user.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { NotificacionFormComponent } from '../notificacion-form/notificacion-form.component';
import { ConfirmationService } from 'primeng/api';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { NotificacionWebsocketService } from '../../services/notificacion-websocket.service';

@Component({
  selector: 'app-mis-notificaciones-creadas',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    NotificacionFormComponent,
    LoadingSpinnerComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './mis-notificaciones-creadas.component.html',
  styleUrl: './mis-notificaciones-creadas.component.css'
})
export class MisNotificacionesCreadasComponent implements OnInit {
  notificaciones: Notificacion[] = [];
  notificacionesFiltradas: Notificacion[] = [];
  terminoBusqueda: string = '';
  idUsuario: number | null = null;

  constructor(
    private notificacionService: NotificacionService,
    private authUserService: AuthUserService,
    private messageService: MessageService,
    private loadingService: LoadingService,
    private confirmationService: ConfirmationService,
    private notificacionWsService: NotificacionWebsocketService
  ) {}

  ngOnInit(): void {
    this.idUsuario = this.authUserService.obtenerIdUsuario();
    if (this.idUsuario) {
      this.cargarNotificaciones();
      this.escucharNotificacionesEnTiempoReal();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario',
        life: 5000
      });
    }
  }

  private escucharNotificacionesEnTiempoReal(): void {
    this.notificacionWsService
      .suscribirseANotificacionesCreadasPorMi()
      .subscribe((notificacion) => {
        // Insertar al inicio de la lista y volver a aplicar filtros
        this.notificaciones = [notificacion, ...this.notificaciones];
        this.aplicarFiltros();
      });
  }

  cargarNotificaciones(): void {
    if (!this.idUsuario) return;

    this.loadingService.show();
    this.notificacionService.listarMisNotificacionesCreadas(this.idUsuario).subscribe({
      next: (notificaciones) => {
        // Filtrar solo las creadas por el usuario actual
        this.notificaciones = (notificaciones || []).filter(
          n => n.creadoPor === this.idUsuario
        );
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

    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      filtradas = filtradas.filter(notif =>
        notif.titulo.toLowerCase().includes(termino) ||
        notif.mensaje.toLowerCase().includes(termino)
      );
    }

    this.notificacionesFiltradas = filtradas;
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.aplicarFiltros();
  }

  getTagClaseTipo(tipo: string): string[] {
    const base = ['tag-sm', 'tag-rounded'];
    const map: { [key: string]: string } = {
      'info': 'tag-info',
      'warning': 'tag-warning',
      'error': 'tag-danger',
      'success': 'tag-success',
      'critical': 'tag-danger'
    };
    const colorClass = map[tipo] || 'tag-info';
    return ['p-tag', ...base, colorClass];
  }

  getTagClasePrioridad(prioridad: string): string[] {
    const base = ['tag-sm', 'tag-rounded'];
    const map: { [key: string]: string } = {
      'baja': 'tag-priority-low',
      'normal': 'tag-priority-medium',
      'alta': 'tag-priority-high',
      'urgente': 'tag-priority-urgent'
    };
    const colorClass = map[prioridad] || 'tag-priority-medium';
    return ['p-tag', ...base, colorClass];
  }

  getTagClaseEstado(activo: boolean): string[] {
    const base = ['tag-sm', 'tag-rounded'];
    const estadoClass = activo ? 'tag-status-active' : 'tag-status-inactive';
    return ['p-tag', ...base, estadoClass];
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

  @ViewChild(NotificacionFormComponent) notificacionFormComponent?: NotificacionFormComponent;

  editarNotificacion(notificacion: Notificacion): void {
    if (this.notificacionFormComponent) {
      this.notificacionFormComponent.showDialog(notificacion);
    }
  }

  abrirDialogoCrear(): void {
    if (this.notificacionFormComponent) {
      this.notificacionFormComponent.showDialog();
    }
  }

  confirmarEliminar(notificacion: Notificacion): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar la notificación "${notificacion.titulo}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.eliminarNotificacion(notificacion.idNotificacion);
      }
    });
  }

  eliminarNotificacion(id: number): void {
    this.loadingService.show();
    this.notificacionService.eliminar(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Notificación eliminada correctamente',
          life: 5000
        });
        this.cargarNotificaciones();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al eliminar la notificación';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  onNotificacionCreada(): void {
    this.cargarNotificaciones();
  }

  onNotificacionActualizada(): void {
    this.cargarNotificaciones();
  }
}

