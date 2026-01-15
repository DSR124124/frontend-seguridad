import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Conductor } from '../../interfaces/conductor.interface';
import { ConductorService } from '../../services/conductor.service';
import { ConductorFormComponent } from '../conductor-form/conductor-form.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ColumnType, FilterType, TableConfig } from '../../../../../shared/components/data-table/interfaces/table-column.interface';
import { DialogoComponent } from '../../../../../shared/components/dialogo/dialogo.component';

@Component({
  selector: 'app-conductor-list',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ConductorFormComponent,
    DataTableComponent
  ],
  providers: [DialogService],
  templateUrl: './conductor-list.component.html',
  styleUrl: './conductor-list.component.css'
})
export class ConductorListComponent implements OnInit, OnDestroy {
  @ViewChild(ConductorFormComponent) conductorFormComponent?: ConductorFormComponent;
  @ViewChild('dataTable') dataTableComponent?: DataTableComponent;

  conductores: Conductor[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  conductoresTableConfig!: TableConfig;
  filtrosVisibles: boolean = false;
  private loadingSubscription?: Subscription;

  constructor(
    private conductorService: ConductorService,
    private messageService: MessageService,
    private dialogService: DialogService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Inicializar configuración de la tabla
    this.conductoresTableConfig = this.buildConductoresTableConfig([]);
    // Suscribirse al estado de loading del servicio
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => {
        this.loading = loading;
        this.conductoresTableConfig = { ...this.conductoresTableConfig, loading };
      }
    );
    this.cargarConductores();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  cargarConductores(): void {
    this.loadingService.show();
    this.conductorService.listarConductores().subscribe({
      next: (conductores) => {
        this.conductores = conductores || [];
        this.conductoresTableConfig = this.buildConductoresTableConfig(this.conductores);
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar los conductores';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  filtrarConductores(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.conductoresTableConfig = this.buildConductoresTableConfig(this.conductores);
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    const filtrados = this.conductores.filter(conductor =>
      conductor.licenciaNumero.toLowerCase().includes(termino) ||
      (conductor.categoria && conductor.categoria.toLowerCase().includes(termino)) ||
      (conductor.telefonoContacto && conductor.telefonoContacto.toLowerCase().includes(termino)) ||
      conductor.idUsuarioGestion.toString().includes(termino) ||
      (conductor.nombreCompleto && conductor.nombreCompleto.toLowerCase().includes(termino)) ||
      (conductor.username && conductor.username.toLowerCase().includes(termino)) ||
      (conductor.email && conductor.email.toLowerCase().includes(termino)) ||
      (conductor.nombreRol && conductor.nombreRol.toLowerCase().includes(termino))
    );
    this.conductoresTableConfig = this.buildConductoresTableConfig(filtrados);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.conductoresTableConfig = this.buildConductoresTableConfig(this.conductores);
  }

  aplicarFiltros(): void {
    if (this.dataTableComponent) {
      this.dataTableComponent.toggleFiltros();
      // Sincronizar el estado de visibilidad
      this.filtrosVisibles = !this.filtrosVisibles;
    }
  }

  confirmarEliminar(conductor: Conductor): void {
    const ref: DynamicDialogRef = this.dialogService.open(DialogoComponent, {
      header: 'Confirmar Eliminación',
      width: '500px',
      modal: true,
      closable: true,
      data: {
        mensaje: `¿Está seguro de que desea eliminar el conductor con licencia "<strong>${conductor.licenciaNumero}</strong>"?`,
        severidad: 'warn',
        mostrarBotones: true,
        labelAceptar: 'Sí, eliminar',
        labelCerrar: 'Cancelar'
      }
    });

    ref.onClose.subscribe((result: string | undefined) => {
      if (result === 'aceptar') {
        this.eliminarConductor(conductor.idUsuarioGestion);
      }
    });
  }

  eliminarConductor(id: number): void {
    this.loadingService.show();
    this.conductorService.eliminarConductor(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.success('Conductor eliminado correctamente', 'Éxito', 5000);
        this.cargarConductores();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al eliminar el conductor';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  abrirDialogoCrear(): void {
    if (this.conductorFormComponent) {
      this.conductorFormComponent.showDialog();
    }
  }

  onConductorCreado(): void {
    this.cargarConductores();
  }

  onConductorActualizado(): void {
    this.cargarConductores();
  }

  editarConductor(conductor: Conductor): void {
    if (this.conductorFormComponent) {
      this.conductorFormComponent.showDialog(conductor);
    }
  }

  private buildConductoresTableConfig(data: Conductor[]): TableConfig {
    return {
      loading: this.loading,
      rowsPerPage: 10,
      rowsPerPageOptions: [10, 25, 50],
      showCurrentPageReport: true,
      showGlobalSearch: false,
      currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} conductores',
      emptyMessage: 'No se encontraron conductores',
      globalSearchPlaceholder: 'Buscar por licencia, nombre, email, usuario o ID...',
      columns: [
        {
          field: 'idUsuarioGestion',
          header: 'ID Usuario',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '100px',
          mobileVisible: true,
        },
        {
          field: 'nombreCompleto',
          header: 'Nombre Completo',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '200px',
          mobileVisible: true,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'username',
          header: 'Usuario',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '120px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'email',
          header: 'Email',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '200px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'licenciaNumero',
          header: 'Número de Licencia',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '150px',
          mobileVisible: true,
        },
        {
          field: 'categoria',
          header: 'Categoría',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '120px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'telefonoContacto',
          header: 'Teléfono',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '120px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'estado',
          header: 'Estado',
          type: ColumnType.DROPDOWN,
          filterType: FilterType.DROPDOWN,
          dropdownOptions: [
            { label: 'Activo', value: 'Activo' },
            { label: 'Inactivo', value: 'Inactivo' },
            { label: 'Suspendido', value: 'Suspendido' },
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
          tooltip: 'Editar conductor',
          action: (row: Conductor) => this.editarConductor(row),
        },
        {
          icon: 'pi pi-trash',
          severity: 'danger',
          tooltip: 'Eliminar conductor',
          action: (row: Conductor) => this.confirmarEliminar(row),
        },
      ],
      globalFilterFields: ['licenciaNumero', 'categoria', 'telefonoContacto', 'nombreCompleto', 'username', 'email', 'nombreRol'],
      data: data,
    };
  }
}

