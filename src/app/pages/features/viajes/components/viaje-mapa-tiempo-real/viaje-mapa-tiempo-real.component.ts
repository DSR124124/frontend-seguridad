import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViajeService } from '../../services/viaje.service';
import { ViajeActivoConUbicacion } from '../../interfaces/viaje-activo-ubicacion.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription, interval } from 'rxjs';

// Declaración de tipos para Google Maps
declare var google: any;

@Component({
  selector: 'app-viaje-mapa-tiempo-real',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...PrimeNGModules
  ],
  templateUrl: './viaje-mapa-tiempo-real.component.html',
  styleUrl: './viaje-mapa-tiempo-real.component.css'
})
export class ViajeMapaTiempoRealComponent implements OnInit, OnDestroy {
  map: any = null;
  markers: Map<number, any> = new Map(); // Map<idViaje, Marker>
  infoWindows: Map<number, any> = new Map(); // Map<idViaje, InfoWindow>
  mapInitialized: boolean = false;
  viajes: ViajeActivoConUbicacion[] = [];
  viajesFiltrados: ViajeActivoConUbicacion[] = [];
  busesDisponibles: { label: string; value: string }[] = [];
  busesSeleccionados: string[] = [];

  private updateSubscription?: Subscription;
  private readonly UPDATE_INTERVAL = 5000; // 5 segundos

  constructor(
    private viajeService: ViajeService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.inicializarMapa();
    this.iniciarActualizacionAutomatica();
  }

  ngOnDestroy(): void {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
    this.limpiarMapa();
  }

  inicializarMapa(): void {
    if (this.mapInitialized) {
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

    const mapContainer = document.getElementById('map-tiempo-real-container');
    if (!mapContainer) {
      setTimeout(() => this.inicializarMapa(), 200);
      return;
    }

    try {
      // Centro por defecto: Lima, Perú
      const defaultCenter = { lat: -12.046374, lng: -77.042793 };

      this.map = new google.maps.Map(mapContainer, {
        center: defaultCenter,
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        fullscreenControl: true
      });

      this.mapInitialized = true;
      this.cargarUbicaciones();
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido al cargar el mapa';
      this.messageService.error(
        `Error al cargar el mapa: ${errorMessage}. Verifique que la API key sea válida y tenga los permisos necesarios.`,
        'Error de Google Maps',
        8000
      );
    }
  }

  iniciarActualizacionAutomatica(): void {
    this.cargarUbicaciones();
    this.updateSubscription = interval(this.UPDATE_INTERVAL).subscribe(() => {
      this.cargarUbicaciones();
    });
  }

  cargarUbicaciones(): void {
    if (!this.mapInitialized) {
      return;
    }

    this.loadingService.show();
    this.viajeService.obtenerViajesActivosConUbicacion().subscribe({
      next: (viajes) => {
        this.viajes = viajes || [];
        this.actualizarListaBuses();
        this.aplicarFiltroBuses();
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al cargar las ubicaciones';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
  }

  actualizarListaBuses(): void {
    const busesUnicos = new Set(this.viajes.map(v => v.busPlate).filter(Boolean));

    this.busesDisponibles = Array.from(busesUnicos)
      .sort()
      .map(placa => ({ label: placa, value: placa }));

    if (this.busesSeleccionados.length === 0 && this.busesDisponibles.length > 0) {
      this.busesSeleccionados = this.busesDisponibles.map(b => b.value);
    }
  }

  aplicarFiltroBuses(): void {
    this.viajesFiltrados = this.busesSeleccionados.length === 0
      ? []
      : this.viajes.filter(v => this.busesSeleccionados.includes(v.busPlate));
    this.actualizarMarcadores();
  }

  seleccionarTodosBuses(): void {
    this.busesSeleccionados = this.busesDisponibles.map(b => b.value);
    this.aplicarFiltroBuses();
  }

  deseleccionarTodosBuses(): void {
    this.busesSeleccionados = [];
    this.aplicarFiltroBuses();
  }

  actualizarMarcadores(): void {
    if (!this.map || typeof google === 'undefined' || !google.maps) {
      return;
    }

    const viajesActualesIds = new Set(this.viajesFiltrados.map(v => v.idViaje));

    // Eliminar marcadores que ya no están en la lista filtrada
    this.markers.forEach((marker, idViaje) => {
      if (!viajesActualesIds.has(idViaje)) {
        marker.setMap(null);
        this.markers.delete(idViaje);
        this.infoWindows.get(idViaje)?.close();
        this.infoWindows.delete(idViaje);
      }
    });

    // Actualizar o crear marcadores
    this.viajesFiltrados.forEach(viaje => {
      if (!viaje.latitude || !viaje.longitude) return;

      const position = { lat: viaje.latitude, lng: viaje.longitude };

      if (this.markers.has(viaje.idViaje)) {
        this.markers.get(viaje.idViaje)!.setPosition(position);
        this.infoWindows.get(viaje.idViaje)?.setContent(this.crearContenidoInfoWindow(viaje));
      } else {
        const marker = new google.maps.Marker({
          position,
          map: this.map,
          title: `Bus: ${viaje.busPlate}`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#FF0000',
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            rotation: viaje.heading || 0
          },
          animation: google.maps.Animation.DROP
        });

        const infoWindow = new google.maps.InfoWindow({
          content: this.crearContenidoInfoWindow(viaje)
        });

        marker.addListener('click', () => {
          this.infoWindows.forEach(iw => iw.close());
          infoWindow.open(this.map, marker);
        });

        this.markers.set(viaje.idViaje, marker);
        this.infoWindows.set(viaje.idViaje, infoWindow);
      }
    });

    if (this.viajesFiltrados.length > 0) {
      this.ajustarVista();
    }
  }

  crearContenidoInfoWindow(viaje: ViajeActivoConUbicacion): string {
    const velocidad = viaje.speed ? `${viaje.speed.toFixed(1)} km/h` : 'N/A';
    const rumbo = viaje.heading ? `${viaje.heading.toFixed(0)}°` : 'N/A';
    const ultimaActualizacion = viaje.lastUpdate
      ? new Date(viaje.lastUpdate).toLocaleString('es-PE')
      : 'N/A';

    return `
      <div style="padding: 10px; min-width: 200px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Bus: ${viaje.busPlate}</h3>
        <p style="margin: 5px 0;"><strong>Ruta:</strong> ${viaje.nombreRuta || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Conductor:</strong> ${viaje.driverName}</p>
        <p style="margin: 5px 0;"><strong>Estado:</strong> ${viaje.estado}</p>
        <p style="margin: 5px 0;"><strong>Velocidad:</strong> ${velocidad}</p>
        <p style="margin: 5px 0;"><strong>Rumbo:</strong> ${rumbo}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Última actualización:</strong> ${ultimaActualizacion}</p>
      </div>
    `;
  }

  ajustarVista(): void {
    if (!this.map || this.viajesFiltrados.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.viajesFiltrados.forEach(v => {
      if (v.latitude && v.longitude) {
        bounds.extend(new google.maps.LatLng(v.latitude, v.longitude));
      }
    });

    if (this.viajesFiltrados.length === 1) {
      const v = this.viajesFiltrados[0];
      this.map.setCenter({ lat: v.latitude!, lng: v.longitude! });
      this.map.setZoom(15);
    } else {
      this.map.fitBounds(bounds);
      const listener = google.maps.event.addListener(this.map, 'bounds_changed', () => {
        if (this.map.getZoom()! > 15) this.map.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }
  }

  limpiarMapa(): void {
    this.markers.forEach(m => m.setMap(null));
    this.markers.clear();
    this.infoWindows.forEach(iw => iw.close());
    this.infoWindows.clear();
  }
}

