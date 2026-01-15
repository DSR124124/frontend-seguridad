import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Ruta } from '../../interfaces/ruta.interface';
import { RutaService } from '../../services/ruta.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { RutaFormComponent } from '../ruta-form/ruta-form.component';
import { RutaPuntosComponent } from '../ruta-puntos/ruta-puntos.component';
import { Subscription } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ColumnType, FilterType, TableConfig } from '../../../../../shared/components/data-table/interfaces/table-column.interface';
import { DialogoComponent } from '../../../../../shared/components/dialogo/dialogo.component';

@Component({
  selector: 'app-ruta-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...PrimeNGModules,
    RutaFormComponent,
    RutaPuntosComponent,
    DataTableComponent
  ],
  providers: [DialogService],
  templateUrl: './ruta-list.component.html',
  styleUrl: './ruta-list.component.css'
})
export class RutaListComponent implements OnInit, OnDestroy {
  rutas: Ruta[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  rutasTableConfig!: TableConfig;
  filtrosVisibles: boolean = false;
  private loadingSubscription?: Subscription;

  @ViewChild(RutaFormComponent) rutaFormComponent?: RutaFormComponent;
  @ViewChild(RutaPuntosComponent) rutaPuntosComponent?: RutaPuntosComponent;
  @ViewChild('dataTable') dataTableComponent?: DataTableComponent;

  constructor(
    private rutaService: RutaService,
    private router: Router,
    private messageService: MessageService,
    private dialogService: DialogService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Inicializar configuración de la tabla
    this.rutasTableConfig = this.buildRutasTableConfig([]);
    // Suscribirse al estado de loading del servicio
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => {
        this.loading = loading;
        this.rutasTableConfig = { ...this.rutasTableConfig, loading };
      }
    );
    this.cargarRutas();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  cargarRutas(): void {
    this.loadingService.show();
    this.rutaService.listarRutas().subscribe({
      next: (rutas) => {
        this.rutas = rutas || [];
        this.rutasTableConfig = this.buildRutasTableConfig(this.rutas);
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar las rutas';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  filtrarRutas(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.rutasTableConfig = this.buildRutasTableConfig(this.rutas);
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    const filtradas = this.rutas.filter(ruta =>
      ruta.nombre.toLowerCase().includes(termino) ||
      (ruta.descripcion && ruta.descripcion.toLowerCase().includes(termino)) ||
      (ruta.colorMapa && ruta.colorMapa.toLowerCase().includes(termino))
    );
    this.rutasTableConfig = this.buildRutasTableConfig(filtradas);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.rutasTableConfig = this.buildRutasTableConfig(this.rutas);
  }

  aplicarFiltros(): void {
    if (this.dataTableComponent) {
      this.dataTableComponent.toggleFiltros();
      // Sincronizar el estado de visibilidad
      this.filtrosVisibles = !this.filtrosVisibles;
    }
  }

  abrirDialogoCrear(): void {
    if (this.rutaFormComponent) {
      this.rutaFormComponent.showDialog();
    }
  }

  onRutaCreada(rutaId: number): void {
    this.cargarRutas();
    // Opcional: Abrir gestión de puntos automáticamente
    // if (this.rutaPuntosComponent) {
    //   setTimeout(() => {
    //     const ruta = this.rutas.find(r => r.idRuta === rutaId);
    //     if (ruta) {
    //       this.rutaPuntosComponent?.showDialog(rutaId, ruta.colorMapa, ruta.nombre);
    //     }
    //   }, 500);
    // }
  }

  gestionarPuntos(ruta: Ruta): void {
    if (this.rutaPuntosComponent) {
      this.rutaPuntosComponent.showDialog(ruta.idRuta, ruta.colorMapa, ruta.nombre);
    }
  }

  onRutaActualizada(): void {
    this.cargarRutas();
  }

  editarRuta(ruta: Ruta): void {
    if (this.rutaFormComponent) {
      this.rutaFormComponent.showDialog(ruta);
    }
  }

  confirmarEliminar(ruta: Ruta): void {
    const ref: DynamicDialogRef = this.dialogService.open(DialogoComponent, {
      header: 'Confirmar Eliminación',
      width: '500px',
      modal: true,
      closable: true,
      data: {
        mensaje: `¿Está seguro de que desea eliminar la ruta "<strong>${ruta.nombre}</strong>"?`,
        severidad: 'warn',
        mostrarBotones: true,
        labelAceptar: 'Sí, eliminar',
        labelCerrar: 'Cancelar'
      }
    });

    ref.onClose.subscribe((result: string | undefined) => {
      if (result === 'aceptar') {
        this.eliminarRuta(ruta.idRuta);
      }
    });
  }

  eliminarRuta(id: number): void {
    this.loadingService.show();
    this.rutaService.eliminarRuta(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.success('Ruta eliminada correctamente', 'Éxito', 5000);
        this.cargarRutas();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al eliminar la ruta';
        this.messageService.error(errorMessage, 'Error', 5000);
      }
    });
  }

  getEstadoLabel(estado: boolean): string {
    return estado ? 'Activa' : 'Inactiva';
  }

  private buildRutasTableConfig(data: Ruta[]): TableConfig {
    return {
      loading: this.loading,
      rowsPerPage: 10,
      rowsPerPageOptions: [10, 25, 50],
      showCurrentPageReport: true,
      showGlobalSearch: false,
      currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} rutas',
      emptyMessage: 'No se encontraron rutas',
      globalSearchPlaceholder: 'Buscar por nombre, descripción o color...',
      columns: [
        {
          field: 'idRuta',
          header: 'ID',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '80px',
          mobileVisible: true,
        },
        {
          field: 'nombre',
          header: 'Nombre',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '200px',
          mobileVisible: true,
        },
        {
          field: 'descripcion',
          header: 'Descripción',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          align: 'left',
          width: '250px',
          mobileVisible: false,
          getLabel: (value: any) => value || '-',
        },
        {
          field: 'colorMapa',
          header: 'Color Mapa',
          type: ColumnType.TEXT,
          filterType: FilterType.TEXT,
          width: '150px',
          mobileVisible: false,
          getLabel: (value: any) => value || '#0000FF',
        },
        {
          field: 'puntosCount',
          header: 'Puntos',
          type: ColumnType.NUMBER,
          filterType: FilterType.NUMBER,
          width: '100px',
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
          field: 'acciones',
          header: 'Acciones',
          type: ColumnType.TEXT,
          isAction: true,
          sortable: false,
          filterType: FilterType.NONE,
          width: '200px',
          align: 'center',
          mobileVisible: true,
        },
      ],
      rowActions: [
        {
          icon: 'pi pi-map',
          severity: 'info',
          tooltip: 'Gestionar puntos',
          action: (row: Ruta) => this.gestionarPuntos(row),
        },
        {
          icon: 'pi pi-pencil',
          severity: 'success',
          tooltip: 'Editar ruta',
          action: (row: Ruta) => this.editarRuta(row),
        },
        {
          icon: 'pi pi-trash',
          severity: 'danger',
          tooltip: 'Eliminar ruta',
          action: (row: Ruta) => this.confirmarEliminar(row),
        },
      ],
      globalFilterFields: ['nombre', 'descripcion', 'colorMapa'],
      data: data.map(r => ({
        ...r,
        puntosCount: r.puntos?.length || 0,
        estadoText: this.getEstadoLabel(r.estado),
      })),
    };
  }
}

