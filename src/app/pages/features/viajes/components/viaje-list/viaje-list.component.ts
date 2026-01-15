import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Viaje } from '../../interfaces/viaje.interface';
import { ViajeService } from '../../services/viaje.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { ViajeFormComponent } from '../viaje-form/viaje-form.component';
import { Subscription } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ColumnType, FilterType, TableConfig } from '../../../../../shared/components/data-table/interfaces/table-column.interface';
import { DialogoComponent } from '../../../../../shared/components/dialogo/dialogo.component';

@Component({
  selector: 'app-viaje-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ...PrimeNGModules,
    ViajeFormComponent,
    DataTableComponent
  ],
  providers: [DialogService],
  templateUrl: './viaje-list.component.html',
  styleUrl: './viaje-list.component.css'
})
export class ViajeListComponent implements OnInit, OnDestroy {
  viajes: Viaje[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  estadoFiltro: string = '';
  viajesTableConfig!: TableConfig;
  filtrosVisibles: boolean = false;
  private loadingSubscription?: Subscription;

  @ViewChild(ViajeFormComponent) viajeFormComponent?: ViajeFormComponent;
  @ViewChild('dataTable') dataTableComponent?: DataTableComponent;

  constructor(
    private viajeService: ViajeService,
    private messageService: MessageService,
    private dialogService: DialogService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Inicializar configuración de la tabla
    this.viajesTableConfig = this.buildViajesTableConfig([]);
    // Suscribirse al estado de loading del servicio
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => {
        this.loading = loading;
        this.viajesTableConfig = { ...this.viajesTableConfig, loading };
      }
    );
    this.cargarViajes();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  cargarViajes(): void {
    this.loadingService.show();

    const estado = this.estadoFiltro || undefined;
    this.viajeService.listarViajes(estado).subscribe({
      next: (viajes) => {
        this.viajes = viajes || [];
        this.viajesTableConfig = this.buildViajesTableConfig(this.viajes);
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || error?.error?.error || 'Error al cargar los viajes';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  filtrarViajes(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.viajesTableConfig = this.buildViajesTableConfig(this.viajes);
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    const filtrados = this.viajes.filter(viaje =>
      viaje.nombreRuta?.toLowerCase().includes(termino) ||
      viaje.placaBus?.toLowerCase().includes(termino) ||
      viaje.estado?.toLowerCase().includes(termino) ||
      viaje.idViaje?.toString().includes(termino) ||
      viaje.idRuta?.toString().includes(termino) ||
      viaje.idBus?.toString().includes(termino) ||
      viaje.idConductor?.toString().includes(termino)
    );
    this.viajesTableConfig = this.buildViajesTableConfig(filtrados);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.viajesTableConfig = this.buildViajesTableConfig(this.viajes);
  }

  aplicarFiltros(): void {
    if (this.dataTableComponent) {
      this.dataTableComponent.toggleFiltros();
      // Sincronizar el estado de visibilidad
      this.filtrosVisibles = !this.filtrosVisibles;
    }
  }

  cambiarFiltroEstado(): void {
    this.cargarViajes();
  }

  abrirDialogoCrear(): void {
    if (this.viajeFormComponent) {
      this.viajeFormComponent.showDialog();
    }
  }

  onViajeCreado(): void {
    this.cargarViajes();
  }

  onViajeActualizado(): void {
    this.cargarViajes();
  }

  editarViaje(viaje: Viaje): void {
    if (this.viajeFormComponent) {
      this.viajeFormComponent.showDialog(viaje);
    }
  }

  confirmarEliminar(viaje: Viaje): void {
    const ref: DynamicDialogRef = this.dialogService.open(DialogoComponent, {
      header: 'Confirmar Eliminación',
      width: '500px',
      modal: true,
      closable: true,
      data: {
        mensaje: `¿Está seguro de que desea eliminar el viaje #<strong>${viaje.idViaje}</strong>?`,
        severidad: 'warn',
        mostrarBotones: true,
        labelAceptar: 'Sí, eliminar',
        labelCerrar: 'Cancelar'
      }
    });

    ref.onClose.subscribe((result: string | undefined) => {
      if (result === 'aceptar') {
        this.eliminarViaje(viaje.idViaje);
      }
    });
  }

  eliminarViaje(id: number): void {
    this.loadingService.show();
    this.viajeService.eliminarViaje(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.success('Viaje eliminado correctamente', 'Éxito', 5000);
        this.cargarViajes();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || error?.error?.error || 'Error al eliminar el viaje';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  getEstadoLabel(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'programado':
        return 'Programado';
      case 'en_curso':
        return 'En Curso';
      case 'completado':
        return 'Completado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado || 'Desconocido';
    }
  }

  formatearFecha(fecha: string | undefined | null): string {
    if (!fecha) return '-';
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return '-';
      }
      return date.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '-';
    }
  }

  private buildViajesTableConfig(data: Viaje[]): TableConfig {
    return {
      loading: this.loading,
      rowsPerPage: 10,
      rowsPerPageOptions: [10, 25, 50],
      showCurrentPageReport: true,
      showGlobalSearch: false,
      currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} viajes',
      emptyMessage: 'No se encontraron viajes',
      globalSearchPlaceholder: 'Buscar por ruta, bus, estado o ID...',
      columns: [
        {
          field: 'idViaje',
          header: 'ID',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '80px',
          mobileVisible: true,
        },
        {
          field: 'nombreRuta',
          header: 'Ruta',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '200px',
          mobileVisible: true,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'placaBus',
          header: 'Bus',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '150px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'idConductor',
          header: 'Conductor',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '120px',
          mobileVisible: false,
          getLabel: (value: any) => value ? `#${value}` : '-',
        },
        {
          field: 'fechaInicioProgramadaText',
          header: 'Inicio Programado',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '180px',
          mobileVisible: false,
        },
        {
          field: 'fechaFinProgramadaText',
          header: 'Fin Programado',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '180px',
          mobileVisible: false,
        },
        {
          field: 'estadoText',
          header: 'Estado',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Programado', value: 'Programado' },
            { label: 'En Curso', value: 'En Curso' },
            { label: 'Completado', value: 'Completado' },
            { label: 'Cancelado', value: 'Cancelado' },
          ],
          width: '120px',
          mobileVisible: true,
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
          tooltip: 'Editar viaje',
          action: (row: Viaje) => this.editarViaje(row),
        },
        {
          icon: 'pi pi-trash',
          severity: 'danger',
          tooltip: 'Eliminar viaje',
          action: (row: Viaje) => this.confirmarEliminar(row),
        },
      ],
      globalFilterFields: ['nombreRuta', 'placaBus', 'estadoText', 'idViaje', 'idRuta', 'idBus', 'idConductor'],
      data: data.map(v => ({
        ...v,
        estadoText: this.getEstadoLabel(v.estado),
        nombreRuta: v.nombreRuta || `Ruta #${v.idRuta || '-'}`,
        placaBus: v.placaBus || `Bus #${v.idBus || '-'}`,
        fechaInicioProgramadaText: this.formatearFecha(v.fechaInicioProgramada),
        fechaFinProgramadaText: this.formatearFecha(v.fechaFinProgramada),
      })),
    };
  }
}

