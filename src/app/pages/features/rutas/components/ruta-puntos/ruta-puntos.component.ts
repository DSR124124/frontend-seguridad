import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RutaPuntoService, RutaPunto, RutaPuntoRequest } from '../../services/ruta-punto.service';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

// Declaración de tipos para Google Maps
declare var google: any;

@Component({
  selector: 'app-ruta-puntos',
  standalone: true,
  imports: [
    CommonModule,
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  providers: [ConfirmationService],
  templateUrl: './ruta-puntos.component.html',
  styleUrl: './ruta-puntos.component.css'
})
export class RutaPuntosComponent implements OnInit, OnDestroy {
  @Input() rutaId!: number;
  @Input() colorRuta: string = '#0000FF';
  @Input() nombreRuta: string = '';

  visible: boolean = false;
  puntos: RutaPunto[] = [];
  puntoForm!: FormGroup;
  puntoEditando: RutaPunto | null = null;
  submitted: boolean = false;

  // Google Maps
  map: any = null;
  markers: any[] = [];
  polyline: any = null;
  mapInitialized: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private rutaPuntoService: RutaPuntoService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // El mapa se inicializa cuando se muestra el diálogo
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.limpiarMapa();
  }

  initForm(): void {
    this.puntoForm = this.fb.group({
      orden: [null, [Validators.required, Validators.min(1)]],
      latitud: [null, [Validators.required]],
      longitud: [null, [Validators.required]],
      nombreParadero: [''],
      esParaderoOficial: [false]
    });
  }

  showDialog(rutaId: number, colorRuta?: string, nombreRuta?: string): void {
    this.rutaId = rutaId;
    if (colorRuta) this.colorRuta = colorRuta;
    if (nombreRuta) this.nombreRuta = nombreRuta;
    this.visible = true;
    this.puntoEditando = null;
    this.submitted = false;

    // Cargar puntos y inicializar mapa
    this.cargarPuntos();
    setTimeout(() => {
      this.inicializarMapa();
    }, 300);
  }

  hideDialog(): void {
    this.visible = false;
    this.puntoEditando = null;
    this.puntos = [];
    this.limpiarMapa();
    this.mapInitialized = false;
    this.puntoForm.reset();
  }

  cargarPuntos(): void {
    if (!this.rutaId) return;

    this.loadingService.show();
    const sub = this.rutaPuntoService.listarPuntosPorRuta(this.rutaId).subscribe({
      next: (puntos) => {
        this.puntos = puntos || [];
        this.loadingService.hide();
        if (this.mapInitialized) {
          this.actualizarMapa();
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar los puntos';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
    this.subscriptions.push(sub);
  }

  inicializarMapa(): void {
    if (this.mapInitialized || typeof google === 'undefined' || !google.maps) {
      if (this.puntos.length > 0) {
        this.actualizarMapa();
      }
      return;
    }

    const mapContainer = document.getElementById('map-puntos-container');
    if (!mapContainer) {
      return;
    }

    // Centro por defecto (Lima, Perú) o primer punto si existe
    let defaultCenter = { lat: -12.046374, lng: -77.042793 };
    if (this.puntos.length > 0) {
      defaultCenter = { lat: this.puntos[0].latitud, lng: this.puntos[0].longitud };
    }

    this.map = new google.maps.Map(mapContainer, {
      center: defaultCenter,
      zoom: this.puntos.length > 0 ? 13 : 10,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // Listener para clics en el mapa
    this.map.addListener('click', (event: any) => {
      if (event.latLng) {
        this.agregarPuntoDesdeMapa(event.latLng.lat(), event.latLng.lng());
      }
    });

    this.mapInitialized = true;
    this.actualizarMapa();
  }

  agregarPuntoDesdeMapa(lat: number, lng: number): void {
    const siguienteOrden = this.puntos.length > 0
      ? Math.max(...this.puntos.map(p => p.orden || 0)) + 1
      : 1;

    this.puntoForm.patchValue({
      orden: siguienteOrden,
      latitud: lat,
      longitud: lng,
      nombreParadero: '',
      esParaderoOficial: false
    });

    // Abrir diálogo para completar datos
    this.puntoEditando = null;
  }

  actualizarMapa(): void {
    if (!this.map || !this.mapInitialized) {
      return;
    }

    // Limpiar marcadores y polyline existentes
    this.limpiarMapa();

    const puntos: { lat: number; lng: number }[] = [];

    // Ordenar puntos por orden
    const puntosOrdenados = [...this.puntos].sort((a, b) => (a.orden || 0) - (b.orden || 0));

    // Crear marcadores para cada punto
    puntosOrdenados.forEach((punto, index) => {
      const lat = punto.latitud;
      const lng = punto.longitud;

      if (lat && lng) {
        puntos.push({ lat, lng });

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: this.map!,
          label: {
            text: (punto.orden || (index + 1)).toString(),
            color: 'white',
            fontWeight: 'bold'
          },
          title: punto.nombreParadero || `Punto ${punto.orden || index + 1}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: this.colorRuta,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2
          }
        });

        // Info window con detalles del punto
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <strong>Punto ${punto.orden || index + 1}</strong><br>
              ${punto.nombreParadero ? `Paradero: ${punto.nombreParadero}<br>` : ''}
              Lat: ${lat.toFixed(6)}<br>
              Lng: ${lng.toFixed(6)}<br>
              ${punto.esParaderoOficial ? '<span style="color: green;">Paradero Oficial</span>' : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(this.map!, marker);
        });

        // Doble clic para editar
        marker.addListener('dblclick', () => {
          this.editarPunto(punto);
        });

        this.markers.push(marker);
      }
    });

    // Crear polyline para conectar los puntos
    if (puntos.length > 1) {
      this.polyline = new google.maps.Polyline({
        path: puntos,
        geodesic: true,
        strokeColor: this.colorRuta,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: this.map!
      });
    }

    // Ajustar el zoom para mostrar todos los puntos
    if (puntos.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      puntos.forEach(punto => bounds.extend(punto));
      this.map!.fitBounds(bounds);
    }
  }

  limpiarMapa(): void {
    // Eliminar marcadores
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    // Eliminar polyline
    if (this.polyline) {
      this.polyline.setMap(null);
      this.polyline = null;
    }
  }

  abrirDialogoCrear(): void {
    const siguienteOrden = this.puntos.length > 0
      ? Math.max(...this.puntos.map(p => p.orden || 0)) + 1
      : 1;

    this.puntoForm.reset({
      orden: siguienteOrden,
      latitud: null,
      longitud: null,
      nombreParadero: '',
      esParaderoOficial: false
    });
    this.puntoEditando = null;
    this.submitted = false;
  }

  editarPunto(punto: RutaPunto): void {
    this.puntoEditando = punto;
    this.puntoForm.patchValue({
      orden: punto.orden,
      latitud: punto.latitud,
      longitud: punto.longitud,
      nombreParadero: punto.nombreParadero || '',
      esParaderoOficial: punto.esParaderoOficial || false
    });
    this.submitted = false;

    // Centrar mapa en el punto
    if (this.map && punto.latitud && punto.longitud) {
      this.map.setCenter({ lat: punto.latitud, lng: punto.longitud });
      this.map.setZoom(16);
    }
  }

  cancelarEdicion(): void {
    this.puntoEditando = null;
    this.puntoForm.reset();
    this.submitted = false;
  }

  guardarPunto(): void {
    this.submitted = true;

    if (this.puntoForm.invalid) {
      this.messageService.warn('Por favor, complete todos los campos requeridos correctamente', 'Validación', 5000);
      return;
    }

    const puntoData: RutaPuntoRequest = {
      idRuta: this.rutaId,
      orden: this.puntoForm.value.orden,
      latitud: this.puntoForm.value.latitud,
      longitud: this.puntoForm.value.longitud,
      nombreParadero: this.puntoForm.value.nombreParadero || undefined,
      esParaderoOficial: this.puntoForm.value.esParaderoOficial || false
    };

    this.loadingService.show();

    if (this.puntoEditando && this.puntoEditando.idPunto) {
      // Actualizar punto existente
      const sub = this.rutaPuntoService.actualizarPunto(this.puntoEditando.idPunto, puntoData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.success('Punto actualizado correctamente', 'Éxito', 5000);
          this.cancelarEdicion();
          this.cargarPuntos();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al actualizar el punto';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    } else {
      // Crear nuevo punto
      const sub = this.rutaPuntoService.crearPunto(puntoData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.success('Punto creado correctamente', 'Éxito', 5000);
          this.cancelarEdicion();
          this.cargarPuntos();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al crear el punto';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  confirmarEliminar(punto: RutaPunto): void {
    if (!punto.idPunto) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el punto ${punto.orden}${punto.nombreParadero ? ' (' + punto.nombreParadero + ')' : ''}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.eliminarPunto(punto.idPunto!);
      }
    });
  }

  eliminarPunto(id: number): void {
    this.loadingService.show();
    const sub = this.rutaPuntoService.eliminarPunto(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.messageService.success('Punto eliminado correctamente', 'Éxito', 5000);
        this.cargarPuntos();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al eliminar el punto';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
    this.subscriptions.push(sub);
  }

  seleccionarPuntoEnMapa(punto: RutaPunto): void {
    if (this.map && punto.latitud && punto.longitud) {
      this.map.setCenter({ lat: punto.latitud, lng: punto.longitud });
      this.map.setZoom(16);
    }
  }

  get f() {
    return this.puntoForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.puntoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}

