import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Conductor } from '../../interfaces/conductor.interface';
import { ConductorService } from '../../services/conductor.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-conductor-list',
  standalone: true,
  imports: [
    ...PrimeNGModules
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './conductor-list.component.html',
  styleUrl: './conductor-list.component.css'
})
export class ConductorListComponent implements OnInit, OnDestroy {
  conductores: Conductor[] = [];
  conductoresFiltrados: Conductor[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  estadoSeleccionado: string | null = null;
  private loadingSubscription?: Subscription;

  estados = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
    { label: 'Suspendido', value: 'suspendido' }
  ];

  constructor(
    private conductorService: ConductorService,
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
    this.cargarConductores();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  cargarConductores(): void {
    this.loadingService.show();
    const estado = this.estadoSeleccionado || undefined;
    
    this.conductorService.listarConductores(estado).subscribe({
      next: (conductores) => {
        this.conductores = conductores;
        this.conductoresFiltrados = conductores;
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar los conductores';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  filtrarConductores(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.conductoresFiltrados = this.conductores;
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    this.conductoresFiltrados = this.conductores.filter(conductor =>
      conductor.licenciaNumero.toLowerCase().includes(termino) ||
      (conductor.categoria && conductor.categoria.toLowerCase().includes(termino)) ||
      (conductor.telefonoContacto && conductor.telefonoContacto.toLowerCase().includes(termino)) ||
      conductor.idUsuarioGestion.toString().includes(termino) ||
      (conductor.nombreCompleto && conductor.nombreCompleto.toLowerCase().includes(termino)) ||
      (conductor.username && conductor.username.toLowerCase().includes(termino)) ||
      (conductor.email && conductor.email.toLowerCase().includes(termino)) ||
      (conductor.nombreRol && conductor.nombreRol.toLowerCase().includes(termino))
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.conductoresFiltrados = this.conductores;
  }

  onEstadoChange(): void {
    this.cargarConductores();
  }

  confirmarEliminar(conductor: Conductor): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el conductor con licencia "${conductor.licenciaNumero}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.eliminarConductor(conductor.idUsuarioGestion);
      }
    });
  }

  eliminarConductor(id: number): void {
    this.loadingService.show();
    this.conductorService.eliminarConductor(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Conductor eliminado correctamente',
          life: 5000
        });
        this.cargarConductores();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al eliminar el conductor';
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
      case 'activo':
        return 'success';
      case 'inactivo':
        return 'danger';
      case 'suspendido':
        return 'warning';
      default:
        return 'info';
    }
  }
}

