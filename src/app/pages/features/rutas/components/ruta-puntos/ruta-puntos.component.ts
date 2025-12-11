import { Component, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
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
export class RutaPuntosComponent implements OnDestroy {
  @Input() rutaId!: number;
  @Input() colorRuta: string = '#0000FF';
  @Input() nombreRuta: string = '';

  visible: boolean = false;
  puntos: RutaPunto[] = [];
  puntoForm!: FormGroup;
  puntoEditando: RutaPunto | null = null;
  submitted: boolean = false;
  mostrarFormulario: boolean = false;
  puntoSeleccionado: { lat: number; lng: number } | null = null;
  modoAgregarPunto: boolean = false; // Controla si se permite agregar puntos desde el mapa

  // Google Maps
  map: any = null;
  markers: any[] = [];
  polyline: any = null;
  directionsService: any = null;
  directionsRenderer: any = null;
  mapInitialized: boolean = false;
  marcadorTemporal: any = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private rutaPuntoService: RutaPuntoService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.limpiarMapa();
  }

  initForm(): void {
    this.puntoForm = this.fb.group({
      orden: [null, [Validators.required, Validators.min(1)]],
      nombreParadero: [''],
      esParaderoOficial: [false]
    });
  }

  showDialog(rutaId: number, colorRuta?: string, nombreRuta?: string): void {
    this.rutaId = rutaId;
    if (colorRuta) {
      this.colorRuta = colorRuta;
      // Actualizar el color del renderer si ya está inicializado
      if (this.directionsRenderer) {
        this.directionsRenderer.setOptions({
          polylineOptions: {
            strokeColor: this.colorRuta,
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });
      }
    }
    if (nombreRuta) this.nombreRuta = nombreRuta;
    this.visible = true;
    this.puntoEditando = null;
    this.submitted = false;
    this.modoAgregarPunto = false;

    // Verificar si hay error previo
    if ((window as any).googleMapsError) {
      this.messageService.error(
        'La API de Google Maps no está disponible. Verifique su conexión a internet y que la API key sea válida.',
        'Error de Google Maps',
        8000
      );
      this.cargarPuntos();
      return;
    }

    this.cargarPuntos();

    // Esperar a que el diálogo se renderice y luego inicializar el mapa
    setTimeout(() => {
      this.verificarYInicializarMapa();
    }, 300);
  }

  private verificarYInicializarMapa(): void {
    const mostrarError = () => {
      this.messageService.error(
        'Error al cargar Google Maps. Verifique su conexión y que la API key sea válida.',
        'Error de Google Maps',
        8000
      );
    };

    if ((window as any).googleMapsLoaded && typeof google !== 'undefined' && google.maps) {
      this.inicializarMapa();
      return;
    }

    if ((window as any).googleMapsError) {
      mostrarError();
      return;
    }

    const checkInterval = setInterval(() => {
      if ((window as any).googleMapsLoaded && typeof google !== 'undefined' && google.maps) {
        clearInterval(checkInterval);
        this.inicializarMapa();
      } else if ((window as any).googleMapsError) {
        clearInterval(checkInterval);
        mostrarError();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.mapInitialized && typeof google === 'undefined') {
        this.messageService.error(
          'Timeout al cargar Google Maps. Verifique su conexión a internet.',
          'Error de Google Maps',
          8000
        );
      }
    }, 10000);

    window.addEventListener('googleMapsLoaded', () => {
      clearInterval(checkInterval);
      this.inicializarMapa();
    }, { once: true });

    window.addEventListener('googleMapsError', () => {
      clearInterval(checkInterval);
      mostrarError();
    }, { once: true });
  }

  hideDialog(): void {
    this.visible = false;
    this.puntoEditando = null;
    this.puntos = [];
    this.mostrarFormulario = false;
    this.puntoSeleccionado = null;
    this.modoAgregarPunto = false;
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
    if (this.mapInitialized) {
      if (this.puntos.length > 0) {
        this.actualizarMapa();
      }
      return;
    }

    // Verificar errores
    if ((window as any).googleMapsError) {
      this.messageService.error(
        'La API de Google Maps no está disponible. Verifique que esté activada en Google Cloud Console y que la API key sea válida.',
        'Error de Google Maps',
        8000
      );
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      setTimeout(() => this.inicializarMapa(), 200);
      return;
    }

    const mapContainer = document.getElementById('map-puntos-container');
    if (!mapContainer) {
      setTimeout(() => this.inicializarMapa(), 200);
      return;
    }

    try {
      const defaultCenter = this.puntos.length > 0
        ? { lat: this.puntos[0].latitud, lng: this.puntos[0].longitud }
        : { lat: -12.046374, lng: -77.042793 }; // Lima, Perú por defecto

      this.map = new google.maps.Map(mapContainer, {
        center: defaultCenter,
        zoom: this.puntos.length > 0 ? 13 : 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      });

      // Agregar listener para clicks en el mapa (cuando está en modo agregar o editando)
      this.map.addListener('click', (event: any) => {
        if (event.latLng && (this.modoAgregarPunto || this.puntoEditando)) {
          this.agregarPuntoDesdeMapa(event.latLng.lat(), event.latLng.lng());
        }
      });

      // Inicializar Directions Service y Renderer
      this.directionsService = new google.maps.DirectionsService();
      this.actualizarDirectionsRenderer();
      this.mapInitialized = true;

      if (this.puntos.length > 0) {
        this.actualizarMapa();
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido al cargar el mapa';
      this.messageService.error(
        `Error al cargar el mapa: ${errorMessage}. Verifique que la API key sea válida y tenga los permisos necesarios.`,
        'Error de Google Maps',
        8000
      );
    }
  }

  agregarPuntoDesdeMapa(lat: number, lng: number): void {
    // Eliminar marcador temporal anterior si existe
    if (this.marcadorTemporal) {
      this.marcadorTemporal.setMap(null);
      this.marcadorTemporal = null;
    }

    // Guardar el punto seleccionado
    this.puntoSeleccionado = { lat, lng };

    // Si se está editando, actualizar las coordenadas del punto que se está editando
    if (this.puntoEditando) {
      this.puntoEditando.latitud = lat;
      this.puntoEditando.longitud = lng;
    }

    // Agregar marcador temporal en la posición del clic
    if (this.map && typeof google !== 'undefined' && google.maps) {
      this.marcadorTemporal = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#FF0000',
          fillOpacity: 0.9,
          strokeColor: 'white',
          strokeWeight: 3
        },
        animation: google.maps.Animation.DROP,
        zIndex: 1000
      });
    }

    // Si el formulario ya está abierto (en modo agregar o editar), mantenerlo abierto
    // Solo cerrar si no está en modo agregar ni editando
    if (!this.modoAgregarPunto && !this.puntoEditando) {
      this.mostrarFormulario = false;
      this.puntoEditando = null;
    }
    this.submitted = false;

    this.cdr.detectChanges();
  }

  actualizarMapa(): void {
    if (!this.map || !this.mapInitialized) {
      return;
    }

    // Verificar que Google Maps esté disponible
    if (typeof google === 'undefined' || !google.maps) {
      return;
    }

    try {
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

          marker.addListener('click', () => infoWindow.open(this.map!, marker));
          marker.addListener('dblclick', () => this.editarPunto(punto));

          this.markers.push(marker);
        }
      });

      if (puntos.length > 1 && this.directionsService && this.directionsRenderer) {
        this.trazarRutaConDirections(puntos);
      } else if (puntos.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        puntos.forEach(punto => bounds.extend(punto));
        this.map!.fitBounds(bounds);
      }
    } catch (error) {
      this.messageService.error('Error al actualizar el mapa', 'Error', 5000);
    }
  }

  actualizarDirectionsRenderer(): void {
    if (!this.map) return;

    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: true, // No mostrar marcadores por defecto, usaremos los nuestros
      polylineOptions: {
        strokeColor: this.colorRuta,
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });
  }

  trazarRutaConDirections(puntos: { lat: number; lng: number }[]): void {
    if (!this.directionsService || !this.directionsRenderer || puntos.length < 2) {
      return;
    }

    this.directionsRenderer.setOptions({
      polylineOptions: {
        strokeColor: this.colorRuta,
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    const waypoints = puntos.length > 2
      ? puntos.slice(1, -1).map(p => ({ location: p, stopover: true }))
      : undefined;

    this.directionsService.route({
      origin: puntos[0],
      destination: puntos[puntos.length - 1],
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
      waypoints
    }, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.directionsRenderer.setDirections(result);
        const bounds = new google.maps.LatLngBounds();
        result.routes[0].overview_path.forEach((point: any) => bounds.extend(point));
        this.map!.fitBounds(bounds);
      } else {
        this.trazarRutaPolylineRespaldo(puntos);
      }
    });
  }

  trazarRutaPolylineRespaldo(puntos: { lat: number; lng: number }[]): void {
    if (this.polyline) {
      this.polyline.setMap(null);
    }

    this.polyline = new google.maps.Polyline({
      path: puntos,
      geodesic: true,
      strokeColor: this.colorRuta,
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: this.map!
    });

    const bounds = new google.maps.LatLngBounds();
    puntos.forEach(punto => bounds.extend(punto));
    this.map!.fitBounds(bounds);
  }

  limpiarMapa(): void {
    this.markers.forEach(marker => marker?.setMap?.(null));
    this.markers = [];

    if (this.polyline) {
      this.polyline.setMap(null);
      this.polyline = null;
    }

    if (this.marcadorTemporal) {
      this.marcadorTemporal.setMap(null);
      this.marcadorTemporal = null;
    }

    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({ routes: [] });
    }
  }

  abrirDialogoCrear(): void {
    // Limpiar selección anterior
    if (this.marcadorTemporal) {
      this.marcadorTemporal.setMap(null);
      this.marcadorTemporal = null;
    }
    this.puntoSeleccionado = null;

    // Activar modo agregar punto para permitir clicks en el mapa
    this.modoAgregarPunto = true;

    const siguienteOrden = this.puntos.length > 0
      ? Math.max(...this.puntos.map(p => p.orden || 0)) + 1
      : 1;

    this.puntoForm.reset({
      orden: siguienteOrden,
      nombreParadero: '',
      esParaderoOficial: false
    });
    this.puntoEditando = null;
    this.submitted = false;
    this.mostrarFormulario = true;
  }

  editarPunto(punto: RutaPunto): void {
    this.puntoEditando = punto;
    this.puntoForm.patchValue({
      orden: punto.orden,
      nombreParadero: punto.nombreParadero || '',
      esParaderoOficial: punto.esParaderoOficial || false
    });
    this.submitted = false;
    this.mostrarFormulario = true;
    this.modoAgregarPunto = false;

    if (this.map && punto.latitud && punto.longitud) {
      this.map.setCenter({ lat: punto.latitud, lng: punto.longitud });
      this.map.setZoom(16);
    }
  }

  cancelarEdicion(): void {
    this.puntoEditando = null;
    this.puntoForm.reset();
    this.submitted = false;
    this.mostrarFormulario = false;
    this.puntoSeleccionado = null;
    this.modoAgregarPunto = false;

    // Eliminar marcador temporal al cancelar
    if (this.marcadorTemporal) {
      this.marcadorTemporal.setMap(null);
      this.marcadorTemporal = null;
    }
  }

  guardarPunto(): void {
    this.submitted = true;

    // Validar solo el orden (latitud y longitud se manejan internamente)
    if (!this.puntoForm.get('orden')?.valid) {
      this.messageService.warn('Por favor, complete el campo orden correctamente', 'Validación', 5000);
      return;
    }

    // Validar que haya coordenadas disponibles
    let latitud: number;
    let longitud: number;

    if (this.puntoEditando) {
      // Si se está editando, usar las coordenadas del punto original
      latitud = this.puntoEditando.latitud;
      longitud = this.puntoEditando.longitud;
    } else {
      // Si es nuevo punto, usar las coordenadas del punto seleccionado en el mapa
      if (!this.puntoSeleccionado) {
        this.messageService.warn('Debe seleccionar un punto en el mapa antes de guardar', 'Validación', 5000);
        return;
      }
      latitud = this.puntoSeleccionado.lat;
      longitud = this.puntoSeleccionado.lng;
    }

    const puntoData: RutaPuntoRequest = {
      idRuta: this.rutaId,
      orden: this.puntoForm.value.orden,
      latitud: latitud,
      longitud: longitud,
      nombreParadero: this.puntoForm.value.nombreParadero || undefined,
      esParaderoOficial: this.puntoForm.value.esParaderoOficial || false
    };

    this.loadingService.show();

    if (this.puntoEditando?.idPunto) {
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
      const sub = this.rutaPuntoService.crearPunto(puntoData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.success('Punto creado correctamente', 'Éxito', 5000);
          // Eliminar marcador temporal al guardar
          if (this.marcadorTemporal) {
            this.marcadorTemporal.setMap(null);
            this.marcadorTemporal = null;
          }
          this.puntoSeleccionado = null;
          this.modoAgregarPunto = false;
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

  puedeGuardar(): boolean {
    // Validar que el orden sea válido
    if (!this.puntoForm.get('orden')?.valid) {
      return false;
    }

    // Si se está editando, solo necesita orden válido
    if (this.puntoEditando) {
      return true;
    }

    // Si es nuevo punto, también necesita tener un punto seleccionado en el mapa
    return !!this.puntoSeleccionado;
  }
}

