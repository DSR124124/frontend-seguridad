import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Bus } from '../../interfaces/bus.interface';
import { BusService } from '../../services/bus.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { BusFormComponent } from '../bus-form/bus-form.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    BusFormComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './bus-list.component.html',
  styleUrl: './bus-list.component.css'
})
export class BusListComponent implements OnInit, OnDestroy {
  buses: Bus[] = [];
  busesFiltrados: Bus[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  estadoSeleccionado: string | null = null;
  private loadingSubscription?: Subscription;

  estados = [
    { label: 'Todos', value: null },
    { label: 'Operativo', value: 'operativo' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Inactivo', value: 'inactivo' }
  ];

  @ViewChild(BusFormComponent) busFormComponent?: BusFormComponent;

  constructor(
    private busService: BusService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Suscribirse al estado de loading del servicio
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => this.loading = loading
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
    const estado = this.estadoSeleccionado || undefined;
    
    this.busService.listarBuses(estado).subscribe({
      next: (buses) => {
        this.buses = buses;
        this.busesFiltrados = buses;
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar los buses';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  filtrarBuses(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.busesFiltrados = this.buses;
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    this.busesFiltrados = this.buses.filter(bus =>
      bus.placa.toLowerCase().includes(termino) ||
      (bus.modelo && bus.modelo.toLowerCase().includes(termino)) ||
      (bus.imeiGps && bus.imeiGps.toLowerCase().includes(termino))
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.busesFiltrados = this.buses;
  }

  onEstadoChange(): void {
    this.cargarBuses();
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
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el bus con placa "${bus.placa}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.eliminarBus(bus.idBus);
      }
    });
  }

  eliminarBus(id: number): void {
    this.loadingService.show();
    this.busService.eliminarBus(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Bus eliminado correctamente',
          life: 5000
        });
        this.cargarBuses();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al eliminar el bus';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  getSeveridadEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'operativo':
        return 'success';
      case 'mantenimiento':
        return 'warning';
      case 'inactivo':
        return 'danger';
      default:
        return 'info';
    }
  }
}
