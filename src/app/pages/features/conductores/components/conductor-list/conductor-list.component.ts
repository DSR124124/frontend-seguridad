import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Conductor } from '../../interfaces/conductor.interface';
import { ConductorService } from '../../services/conductor.service';
import { ConductorFormComponent } from '../conductor-form/conductor-form.component';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-conductor-list',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ConductorFormComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './conductor-list.component.html',
  styleUrl: './conductor-list.component.css'
})
export class ConductorListComponent implements OnInit, OnDestroy {
  @ViewChild(ConductorFormComponent) conductorFormComponent!: ConductorFormComponent;

  conductores: Conductor[] = [];
  conductoresFiltrados: Conductor[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  private loadingSubscription?: Subscription;

  constructor(
    private conductorService: ConductorService,
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

    this.conductorService.listarConductores().subscribe({
      next: (conductores) => {
        this.conductores = conductores || [];
        this.conductoresFiltrados = this.conductores;
        this.loadingService.hide();

        // Mostrar notificación si no hay conductores
        if (this.conductores.length === 0) {
          this.messageService.info('No hay conductores registrados. Puede crear uno nuevo usando el botón "Nuevo Conductor".', 'Sin conductores', 6000);
        } else {
          // Mostrar notificación de éxito al cargar
          this.messageService.success(`Se cargaron ${this.conductores.length} conductor(es) correctamente`, 'Conductores cargados', 3000);
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar los conductores';
        this.messageService.error(errorMessage, 'Error al cargar', 6000);
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
        this.messageService.success('Conductor eliminado correctamente', 'Éxito', 5000);
        this.cargarConductores();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.message || 'Error al eliminar el conductor';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
  }

  getClaseTagEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return 'tag-success';
      case 'inactivo':
        return 'tag-danger';
      case 'suspendido':
        return 'tag-warning';
      default:
        return 'tag-info';
    }
  }

  abrirDialogoCrear(): void {
    this.conductorFormComponent.showDialog();
  }

  onConductorCreado(): void {
    this.messageService.success('Conductor registrado correctamente', 'Registro exitoso', 5000);
    this.cargarConductores();
  }

  onConductorActualizado(): void {
    this.messageService.success('Conductor actualizado correctamente', 'Actualización exitosa', 5000);
    this.cargarConductores();
  }

  editarConductor(conductor: Conductor): void {
    this.conductorFormComponent.showDialog(conductor);
  }
}

