import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Bus } from '../../interfaces/bus.interface';
import { BusService } from '../../services/bus.service';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from '../../../../../core/services/message.service';
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
  providers: [ConfirmationService],
  templateUrl: './bus-list.component.html',
  styleUrl: './bus-list.component.css'
})
export class BusListComponent implements OnInit, OnDestroy {
  buses: Bus[] = [];
  busesFiltrados: Bus[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  private loadingSubscription?: Subscription;

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
    
    this.busService.listarBuses().subscribe({
      next: (buses) => {
        this.buses = buses || [];
        this.busesFiltrados = this.buses;
        this.loadingService.hide();
        
        // Mostrar notificación si no hay buses
        if (this.buses.length === 0) {
          this.messageService.info('No hay buses registrados. Puede crear uno nuevo usando el botón "Nuevo Bus".', 'Sin buses', 6000);
        } else {
          // Mostrar notificación de éxito al cargar
          this.messageService.success(`Se cargaron ${this.buses.length} bus(es) correctamente`, 'Buses cargados', 3000);
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar los buses';
        this.messageService.error(errorMessage, 'Error al cargar', 6000);
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

  abrirDialogoCrear(): void {
    if (this.busFormComponent) {
      this.busFormComponent.showDialog();
    }
  }

  onBusCreado(): void {
    this.messageService.success('Bus registrado correctamente', 'Registro exitoso', 5000);
    this.cargarBuses();
  }

  onBusActualizado(): void {
    this.messageService.success('Bus actualizado correctamente', 'Actualización exitosa', 5000);
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
        this.messageService.success('Bus eliminado correctamente', 'Éxito', 5000);
        this.cargarBuses();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.message || 'Error al eliminar el bus';
        this.messageService.error(errorMessage, 'Error', 6000);
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
