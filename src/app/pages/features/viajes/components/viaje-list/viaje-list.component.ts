import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Viaje } from '../../interfaces/viaje.interface';
import { ViajeService } from '../../services/viaje.service';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { ViajeFormComponent } from '../viaje-form/viaje-form.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-viaje-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ...PrimeNGModules,
    ViajeFormComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './viaje-list.component.html',
  styleUrl: './viaje-list.component.css'
})
export class ViajeListComponent implements OnInit, OnDestroy {
  viajes: Viaje[] = [];
  viajesFiltrados: Viaje[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  estadoFiltro: string = '';
  private loadingSubscription?: Subscription;

  @ViewChild(ViajeFormComponent) viajeFormComponent?: ViajeFormComponent;

  constructor(
    private viajeService: ViajeService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => this.loading = loading
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
        this.viajesFiltrados = this.viajes;
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al cargar los viajes';
        this.messageService.error(errorMessage, 'Error al cargar', 6000);
      }
    });
  }

  filtrarViajes(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.viajesFiltrados = this.viajes;
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    this.viajesFiltrados = this.viajes.filter(viaje =>
      viaje.nombreRuta?.toLowerCase().includes(termino) ||
      viaje.placaBus?.toLowerCase().includes(termino) ||
      viaje.estado?.toLowerCase().includes(termino) ||
      viaje.idViaje?.toString().includes(termino) ||
      viaje.idRuta?.toString().includes(termino) ||
      viaje.idBus?.toString().includes(termino) ||
      viaje.idConductor?.toString().includes(termino)
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.viajesFiltrados = this.viajes;
  }

  mostrarFiltros(): void {
    // Por ahora, mostrar un mensaje informativo
    // En el futuro se puede implementar un diálogo de filtros avanzados
    this.messageService.info('Los filtros se aplicarán automáticamente al seleccionar el estado en la tabla', 'Filtros', 4000);
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
    this.messageService.success('Viaje registrado correctamente', 'Registro exitoso', 5000);
    this.cargarViajes();
  }

  onViajeActualizado(): void {
    this.messageService.success('Viaje actualizado correctamente', 'Actualización exitosa', 5000);
    this.cargarViajes();
  }

  editarViaje(viaje: Viaje): void {
    if (this.viajeFormComponent) {
      this.viajeFormComponent.showDialog(viaje);
    }
  }

  confirmarEliminar(viaje: Viaje): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el viaje #${viaje.idViaje}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
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
        const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al eliminar el viaje';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
  }

  getClaseTagEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'programado':
        return 'tag-info';
      case 'en_curso':
        return 'tag-success';
      case 'completado':
        return 'tag-primary';
      case 'cancelado':
        return 'tag-danger';
      default:
        return 'tag-secondary';
    }
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
}

