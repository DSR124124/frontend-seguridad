import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Notificacion } from '../../interfaces/notificacion.interface';
import { NotificacionService } from '../../services/notificacion.service';
import { AuthUserService } from '../../../../../core/services/auth-user.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { NotificacionFormComponent } from '../notificacion-form/notificacion-form.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { NotificacionWebsocketService } from '../../services/notificacion-websocket.service';
import { Subscription } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ColumnType, FilterType, TableConfig } from '../../../../../shared/components/data-table/interfaces/table-column.interface';
import { DialogoComponent } from '../../../../../shared/components/dialogo/dialogo.component';

@Component({
  selector: 'app-mis-notificaciones-creadas',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    NotificacionFormComponent,
    LoadingSpinnerComponent,
    DataTableComponent
  ],
  providers: [DialogService],
  templateUrl: './mis-notificaciones-creadas.component.html',
  styleUrl: './mis-notificaciones-creadas.component.css'
})
export class MisNotificacionesCreadasComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  terminoBusqueda: string = '';
  idUsuario: number | null = null;
  notificacionesTableConfig!: TableConfig;
  filtrosVisibles: boolean = false;
  loading: boolean = false;

  @ViewChild(NotificacionFormComponent) notificacionFormComponent?: NotificacionFormComponent;
  @ViewChild('dataTable') dataTableComponent?: DataTableComponent;

  private wsSubscription?: Subscription;
  private loadingSubscription?: Subscription;

  constructor(
    private notificacionService: NotificacionService,
    private authUserService: AuthUserService,
    private messageService: MessageService,
    private loadingService: LoadingService,
    private dialogService: DialogService,
    private notificacionWsService: NotificacionWebsocketService
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
    this.wsSubscription = this.notificacionWsService
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

    this.notificacionesTableConfig = this.buildNotificacionesTableConfig(filtradas);
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.aplicarFiltros();
  }

  toggleFiltrosColumnas(): void {
    if (this.dataTableComponent) {
      this.dataTableComponent.toggleFiltros();
      // Sincronizar el estado de visibilidad
      this.filtrosVisibles = !this.filtrosVisibles;
    }
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
    const ref: DynamicDialogRef = this.dialogService.open(DialogoComponent, {
      header: 'Confirmar Eliminación',
      width: '500px',
      modal: true,
      closable: true,
      data: {
        mensaje: `¿Está seguro de que desea eliminar la notificación "<strong>${notificacion.titulo}</strong>"?`,
        severidad: 'warn',
        mostrarBotones: true,
        labelAceptar: 'Sí, eliminar',
        labelCerrar: 'Cancelar'
      }
    });

    ref.onClose.subscribe((result: string | undefined) => {
      if (result === 'aceptar') {
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

  private buildNotificacionesTableConfig(data: Notificacion[]): TableConfig {
    return {
      loading: this.loading,
      rowsPerPage: 10,
      rowsPerPageOptions: [10, 25, 50],
      showCurrentPageReport: true,
      showGlobalSearch: false,
      currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} notificaciones',
      emptyMessage: 'No se encontraron notificaciones creadas',
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
          field: 'estadoText',
          header: 'Estado',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Activa', value: 'Activa' },
            { label: 'Inactiva', value: 'Inactiva' },
          ],
          width: '120px',
          mobileVisible: true,
        },
        {
          field: 'destinatariosText',
          header: 'Destinatarios',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '150px',
          mobileVisible: false,
        },
        {
          field: 'fechaCreacionText',
          header: 'Fecha Creación',
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
          width: '140px',
          align: 'center',
          mobileVisible: true,
        },
      ],
      rowActions: [
        {
          icon: 'pi pi-pencil',
          severity: 'success',
          tooltip: 'Editar',
          action: (row: Notificacion) => this.editarNotificacion(row),
        },
        {
          icon: 'pi pi-trash',
          severity: 'danger',
          tooltip: 'Eliminar',
          action: (row: Notificacion) => this.confirmarEliminar(row),
        },
      ],
      globalFilterFields: ['titulo', 'mensaje', 'tipoNotificacionText', 'prioridadText'],
      data: data.map(n => ({
        ...n,
        tipoNotificacionText: this.getLabelTipo(n.tipoNotificacion),
        prioridadText: this.getLabelPrioridad(n.prioridad),
        estadoText: n.activo ? 'Activa' : 'Inactiva',
        destinatariosText: `${n.totalDestinatarios || 0} total, ${n.totalLeidas || 0} leídas`,
        fechaCreacionText: this.formatearFecha(n.fechaCreacion),
      })),
    };
  }
}

