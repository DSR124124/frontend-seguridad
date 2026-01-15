import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { NotificacionUsuarioDTO } from '../../interfaces/notificacion.interface';
import { NotificacionService } from '../../services/notificacion.service';
import { NotificacionWebsocketService } from '../../services/notificacion-websocket.service';
import { NotificacionCounterService } from '../../services/notificacion-counter.service';
import { AuthUserService } from '../../../../../core/services/auth-user.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { Subscription } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ColumnType, FilterType, TableConfig } from '../../../../../shared/components/data-table/interfaces/table-column.interface';

@Component({
  selector: 'app-mis-notificaciones-asignadas',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    LoadingSpinnerComponent,
    DataTableComponent
  ],
  templateUrl: './mis-notificaciones-asignadas.component.html',
  styleUrl: './mis-notificaciones-asignadas.component.css'
})
export class MisNotificacionesAsignadasComponent implements OnInit, OnDestroy {
  notificaciones: NotificacionUsuarioDTO[] = [];
  terminoBusqueda: string = '';
  filtroTipo: string = '';
  filtroPrioridad: string = '';
  mostrarSoloNoLeidas: boolean = false;
  idUsuario: number | null = null;
  notificacionesTableConfig!: TableConfig;
  filtrosVisibles: boolean = false;
  loading: boolean = false;

  @ViewChild('dataTable') dataTableComponent?: DataTableComponent;

  private notificacionCounterService = inject(NotificacionCounterService);
  private notificacionWsService = inject(NotificacionWebsocketService);
  private wsSubscription?: Subscription;
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
    // Inicializar configuración de la tabla
    this.notificacionesTableConfig = this.buildNotificacionesTableConfig([]);
    // Suscribirse al estado de loading del servicio
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => {
        this.loading = loading;
        this.notificacionesTableConfig = { ...this.notificacionesTableConfig, loading };
      }
    );
    
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

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  private escucharNotificacionesEnTiempoReal(): void {
    if (!this.idUsuario) return;

    this.wsSubscription = this.notificacionWsService
      .suscribirseANotificacionesCreadasPorMi()
      .subscribe({
        next: (notificacion) => {
          // Cuando llega una nueva notificación, recargar la lista
          // El contador se actualizará automáticamente a través del servicio
          this.cargarNotificaciones();
        },
        error: (error) => {
          console.error('Error en suscripción WebSocket:', error);
        }
      });
  }

  cargarNotificaciones(): void {
    if (!this.idUsuario) return;

    this.loadingService.show();
    this.notificacionService.obtenerMisNotificacionesAsignadas(this.idUsuario).subscribe({
      next: (notificaciones) => {
        this.notificaciones = notificaciones || [];
        this.aplicarFiltros();
        this.loadingService.hide();
        
        // Actualizar el contador después de cargar
        this.notificacionCounterService.refresh();
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

    this.notificacionesTableConfig = this.buildNotificacionesTableConfig(filtradas);
  }

  toggleFiltrosColumnas(): void {
    if (this.dataTableComponent) {
      this.dataTableComponent.toggleFiltros();
      // Sincronizar el estado de visibilidad
      this.filtrosVisibles = !this.filtrosVisibles;
    }
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
        
        // Actualizar el contador de notificaciones no leídas
        this.notificacionCounterService.refresh();
        
        // Actualizar la tabla
        this.aplicarFiltros();
        
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
        this.aplicarFiltros(); // Actualizar la tabla
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

  getRowClass(notificacion: NotificacionUsuarioDTO): string {
    return !notificacion.leida ? 'notificacion-no-leida' : '';
  }

  private buildNotificacionesTableConfig(data: NotificacionUsuarioDTO[]): TableConfig {
    return {
      loading: this.loading,
      rowsPerPage: 10,
      rowsPerPageOptions: [10, 25, 50],
      showCurrentPageReport: true,
      showGlobalSearch: false,
      currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} notificaciones',
      emptyMessage: 'No se encontraron notificaciones asignadas',
      globalSearchPlaceholder: 'Buscar por título o mensaje...',
      columns: [
        {
          field: 'idNotificacion',
          header: 'ID',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '80px',
          mobileVisible: true,
        },
        {
          field: 'titulo',
          header: 'Título',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '200px',
          mobileVisible: true,
        },
        {
          field: 'mensaje',
          header: 'Mensaje',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '200px',
          mobileVisible: false,
          getLabel: (value: any) => {
            if (!value) return '-';
            return value.length > 50 ? value.substring(0, 50) + '...' : value;
          },
        },
        {
          field: 'tipoNotificacionText',
          header: 'Tipo',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Info', value: 'Info' },
            { label: 'Advertencia', value: 'Advertencia' },
            { label: 'Error', value: 'Error' },
            { label: 'Éxito', value: 'Éxito' },
            { label: 'Crítica', value: 'Crítica' },
          ],
          width: '120px',
          mobileVisible: true,
        },
        {
          field: 'prioridadText',
          header: 'Prioridad',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Baja', value: 'Baja' },
            { label: 'Normal', value: 'Normal' },
            { label: 'Alta', value: 'Alta' },
            { label: 'Urgente', value: 'Urgente' },
          ],
          width: '120px',
          mobileVisible: false,
        },
        {
          field: 'nombreAplicacion',
          header: 'Aplicación',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '150px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'estadoText',
          header: 'Estado',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Leída', value: 'Leída' },
            { label: 'No leída', value: 'No leída' },
            { label: 'Confirmada', value: 'Confirmada' },
          ],
          width: '120px',
          mobileVisible: true,
        },
        {
          field: 'fechaCreacionText',
          header: 'Fecha',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '150px',
          mobileVisible: false,
        },
        {
          field: 'acciones',
          header: 'Acciones',
          type: ColumnType.TEXT,
          isAction: true,
          sortable: false,
          filterType: FilterType.NONE,
          width: '180px',
          align: 'center',
          mobileVisible: true,
        },
      ],
      rowActions: [
        {
          icon: 'pi pi-check',
          severity: 'success',
          tooltip: 'Marcar como leída',
          action: (row: NotificacionUsuarioDTO) => this.marcarComoLeida(row),
          disabled: (row: NotificacionUsuarioDTO) => row.leida,
          permission: true,
        },
        {
          icon: 'pi pi-check-circle',
          severity: 'info',
          tooltip: 'Confirmar',
          action: (row: NotificacionUsuarioDTO) => this.confirmarNotificacion(row),
          disabled: (row: NotificacionUsuarioDTO) => !row.requiereConfirmacion || row.confirmada,
          permission: true,
        },
      ],
      globalFilterFields: ['titulo', 'mensaje', 'tipoNotificacionText', 'prioridadText', 'nombreAplicacion'],
      getRowClass: (row: NotificacionUsuarioDTO) => this.getRowClass(row),
      data: data.map(n => ({
        ...n,
        titulo: !n.leida ? `${n.titulo} [Nueva]` : n.titulo,
        tipoNotificacionText: this.getLabelTipo(n.tipoNotificacion),
        prioridadText: this.getLabelPrioridad(n.prioridad),
        estadoText: n.confirmada ? 'Confirmada' : (n.leida ? 'Leída' : 'No leída'),
        fechaCreacionText: this.formatearFecha(n.fechaCreacion),
      })),
    };
  }
}

