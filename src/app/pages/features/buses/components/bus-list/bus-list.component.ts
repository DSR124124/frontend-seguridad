import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Bus } from '../../interfaces/bus.interface';
import { BusService } from '../../services/bus.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { BusFormComponent } from '../bus-form/bus-form.component';
import { Subscription } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ColumnType, FilterType, TableConfig } from '../../../../../shared/components/data-table/interfaces/table-column.interface';
import { DialogoComponent } from '../../../../../shared/components/dialogo/dialogo.component';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    BusFormComponent,
    DataTableComponent
  ],
  providers: [DialogService],
  templateUrl: './bus-list.component.html',
  styleUrl: './bus-list.component.css'
})
export class BusListComponent implements OnInit, OnDestroy {
  buses: Bus[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  busesTableConfig!: TableConfig;
  filtrosVisibles: boolean = false;
  private loadingSubscription?: Subscription;

  @ViewChild(BusFormComponent) busFormComponent?: BusFormComponent;
  @ViewChild('dataTable') dataTableComponent?: DataTableComponent;

  constructor(
    private busService: BusService,
    private router: Router,
    private messageService: MessageService,
    private dialogService: DialogService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Inicializar configuración de la tabla
    this.busesTableConfig = this.buildBusesTableConfig([]);
    // Suscribirse al estado de loading del servicio
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => {
        this.loading = loading;
        this.busesTableConfig = { ...this.busesTableConfig, loading };
      }
    );
    this.cargarBuses();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  cargarBuses(): void {
    this.loadingService.show();
    this.busService.listarBuses().subscribe({
      next: (buses) => {
        this.buses = buses || [];
        this.busesTableConfig = this.buildBusesTableConfig(this.buses);
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar los buses';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  filtrarBuses(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.busesTableConfig = this.buildBusesTableConfig(this.buses);
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    const filtrados = this.buses.filter(bus =>
      bus.placa.toLowerCase().includes(termino) ||
      (bus.modelo && bus.modelo.toLowerCase().includes(termino)) ||
      (bus.imeiGps && bus.imeiGps.toLowerCase().includes(termino))
    );
    this.busesTableConfig = this.buildBusesTableConfig(filtrados);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.busesTableConfig = this.buildBusesTableConfig(this.buses);
  }

  aplicarFiltros(): void {
    if (this.dataTableComponent) {
      this.dataTableComponent.toggleFiltros();
      // Sincronizar el estado de visibilidad
      this.filtrosVisibles = !this.filtrosVisibles;
    }
  }

  abrirDialogoCrear(): void {
    if (this.busFormComponent) {
      this.busFormComponent.showDialog();
    }
  }

  onBusCreado(): void {
    this.cargarBuses();
  }

  onBusActualizado(): void {
    this.cargarBuses();
  }

  editarBus(bus: Bus): void {
    if (this.busFormComponent) {
      this.busFormComponent.showDialog(bus);
    }
  }

  confirmarEliminar(bus: Bus): void {
    const ref: DynamicDialogRef = this.dialogService.open(DialogoComponent, {
      header: 'Confirmar Eliminación',
      width: '500px',
      modal: true,
      closable: true,
      data: {
        mensaje: `¿Está seguro de que desea eliminar el bus con placa "<strong>${bus.placa}</strong>"?`,
        severidad: 'warn',
        mostrarBotones: true,
        labelAceptar: 'Sí, eliminar',
        labelCerrar: 'Cancelar'
      }
    });

    ref.onClose.subscribe((result: string | undefined) => {
      if (result === 'aceptar') {
        this.eliminarBus(bus.idBus);
      }
    });
  }

  eliminarBus(id: number): void {
    this.loadingService.show();
    this.busService.eliminarBus(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.success('Bus eliminado correctamente', 'Éxito', 5000);
        this.cargarBuses();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al eliminar el bus';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  private buildBusesTableConfig(data: Bus[]): TableConfig {
    return {
      loading: this.loading,
      rowsPerPage: 10,
      rowsPerPageOptions: [10, 25, 50],
      showCurrentPageReport: true,
      showGlobalSearch: false,
      currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} buses',
      emptyMessage: 'No se encontraron buses',
      globalSearchPlaceholder: 'Buscar por placa, modelo o IMEI GPS...',
      columns: [
        {
          field: 'idBus',
          header: 'ID',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '80px',
          mobileVisible: true,
        },
        {
          field: 'placa',
          header: 'Placa',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '150px',
          mobileVisible: true,
        },
        {
          field: 'modelo',
          header: 'Modelo',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '150px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'capacidad',
          header: 'Capacidad',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '100px',
          mobileVisible: false,
        },
        {
          field: 'imeiGps',
          header: 'IMEI GPS',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '150px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'estado',
          header: 'Estado',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Operativo', value: 'Operativo' },
            { label: 'Mantenimiento', value: 'Mantenimiento' },
            { label: 'Inactivo', value: 'Inactivo' },
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
          tooltip: 'Editar bus',
          action: (row: Bus) => this.editarBus(row),
        },
        {
          icon: 'pi pi-trash',
          severity: 'danger',
          tooltip: 'Eliminar bus',
          action: (row: Bus) => this.confirmarEliminar(row),
        },
      ],
      data: data,
    };
  }
}
