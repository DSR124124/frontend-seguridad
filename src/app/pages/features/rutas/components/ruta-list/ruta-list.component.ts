import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Ruta } from '../../interfaces/ruta.interface';
import { RutaService } from '../../services/ruta.service';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { RutaFormComponent } from '../ruta-form/ruta-form.component';
import { RutaPuntosComponent } from '../ruta-puntos/ruta-puntos.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ruta-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...PrimeNGModules,
    RutaFormComponent,
    RutaPuntosComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './ruta-list.component.html',
  styleUrl: './ruta-list.component.css'
})
export class RutaListComponent implements OnInit, OnDestroy {
  rutas: Ruta[] = [];
  rutasFiltradas: Ruta[] = [];
  loading: boolean = false;
  terminoBusqueda: string = '';
  private loadingSubscription?: Subscription;

  @ViewChild(RutaFormComponent) rutaFormComponent?: RutaFormComponent;
  @ViewChild(RutaPuntosComponent) rutaPuntosComponent?: RutaPuntosComponent;

  constructor(
    private rutaService: RutaService,
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
        this.rutasFiltradas = this.rutas;
        this.loadingService.hide();

        // Mostrar notificación si no hay rutas
        if (this.rutas.length === 0) {
          this.messageService.info('No hay rutas registradas. Puede crear una nueva usando el botón "Nueva Ruta".', 'Sin rutas', 6000);
        } else {
          // Mostrar notificación de éxito al cargar
          this.messageService.success(`Se cargaron ${this.rutas.length} ruta(s) correctamente`, 'Rutas cargadas', 3000);
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar las rutas';
        this.messageService.error(errorMessage, 'Error al cargar', 6000);
      }
    });
  }

  filtrarRutas(): void {
    if (!this.terminoBusqueda || this.terminoBusqueda.trim() === '') {
      this.rutasFiltradas = this.rutas;
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase().trim();
    this.rutasFiltradas = this.rutas.filter(ruta =>
      ruta.nombre.toLowerCase().includes(termino) ||
      (ruta.descripcion && ruta.descripcion.toLowerCase().includes(termino)) ||
      (ruta.colorMapa && ruta.colorMapa.toLowerCase().includes(termino))
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.rutasFiltradas = this.rutas;
  }

  abrirDialogoCrear(): void {
    if (this.rutaFormComponent) {
      this.rutaFormComponent.showDialog();
    }
  }

  onRutaCreada(rutaId: number): void {
    this.messageService.success('Ruta registrada correctamente', 'Registro exitoso', 5000);
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
    this.messageService.success('Ruta actualizada correctamente', 'Actualización exitosa', 5000);
    this.cargarRutas();
  }

  editarRuta(ruta: Ruta): void {
    if (this.rutaFormComponent) {
      this.rutaFormComponent.showDialog(ruta);
    }
  }

  confirmarEliminar(ruta: Ruta): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar la ruta "${ruta.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
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
        const errorMessage = error?.error?.message || error?.message || 'Error al eliminar la ruta';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
  }

  getClaseTagEstado(estado: boolean): string {
    return estado ? 'tag-success' : 'tag-danger';
  }

  getEstadoLabel(estado: boolean): string {
    return estado ? 'Activa' : 'Inactiva';
  }
}

