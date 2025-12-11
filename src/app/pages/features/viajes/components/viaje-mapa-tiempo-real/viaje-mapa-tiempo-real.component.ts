import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViajeService } from '../../services/viaje.service';
import { ViajeActivoConUbicacion } from '../../interfaces/viaje-activo-ubicacion.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription, interval, timer } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
  private readonly UPDATE_INTERVAL = 3000; // 3 segundos - más frecuente sin loading
  private isInitialLoad = true;
  connectionStatus: 'connected' | 'disconnected' | 'error' = 'connected';

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
    // Carga inicial con loading
    this.cargarUbicaciones(true);

    // Actualizaciones automáticas sin loading spinner
    this.updateSubscription = timer(this.UPDATE_INTERVAL, this.UPDATE_INTERVAL).pipe(
      switchMap(() => {
        if (!this.mapInitialized) {
          return of(null);
        }
        return this.viajeService.obtenerViajesActivosConUbicacion().pipe(
          catchError(error => {
            this.connectionStatus = 'error';
            // Solo mostrar error si es la primera vez o si lleva mucho tiempo desconectado
            if (this.isInitialLoad) {
              const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al cargar las ubicaciones';
              this.messageService.error(errorMessage, 'Error', 6000);
            }
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (viajes) => {
        if (viajes) {
          this.connectionStatus = 'connected';
          this.isInitialLoad = false;
          this.actualizarDatos(viajes);
        }
      }
    });
  }

  cargarUbicaciones(showLoading: boolean = false): void {
    if (!this.mapInitialized) {
      return;
    }

    if (showLoading) {
      this.loadingService.show();
    }

    this.viajeService.obtenerViajesActivosConUbicacion().subscribe({
      next: (viajes) => {
        this.connectionStatus = 'connected';
        this.isInitialLoad = false;
        this.actualizarDatos(viajes);
        if (showLoading) {
          this.loadingService.hide();
        }
      },
      error: (error) => {
        this.connectionStatus = 'error';
        if (showLoading) {
          this.loadingService.hide();
        }
        const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al cargar las ubicaciones';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
  }

  private actualizarDatos(viajes: ViajeActivoConUbicacion[]): void {
    // Solo actualizar si hay cambios reales
    const nuevosViajes = viajes || [];
    const hayCambios = this.hayCambiosSignificativos(this.viajes, nuevosViajes);

    if (hayCambios || this.isInitialLoad) {
      this.viajes = nuevosViajes;
      this.actualizarListaBuses();
      this.aplicarFiltroBuses();
    }
  }

  private hayCambiosSignificativos(viajesAnteriores: ViajeActivoConUbicacion[], viajesNuevos: ViajeActivoConUbicacion[]): boolean {
    // Comparar cantidad de viajes
    if (viajesAnteriores.length !== viajesNuevos.length) {
      return true;
    }

    // Comparar IDs de viajes
    const idsAnteriores = new Set(viajesAnteriores.map(v => v.idViaje));
    const idsNuevos = new Set(viajesNuevos.map(v => v.idViaje));
    if (idsAnteriores.size !== idsNuevos.size ||
        !Array.from(idsAnteriores).every(id => idsNuevos.has(id))) {
      return true;
    }

    // Comparar posiciones (solo si cambió significativamente - más de 10 metros)
    for (const nuevoViaje of viajesNuevos) {
      const viajeAnterior = viajesAnteriores.find(v => v.idViaje === nuevoViaje.idViaje);
      if (viajeAnterior) {
        if (viajeAnterior.latitude && viajeAnterior.longitude &&
            nuevoViaje.latitude && nuevoViaje.longitude) {
          const distancia = this.calcularDistancia(
            viajeAnterior.latitude, viajeAnterior.longitude,
            nuevoViaje.latitude, nuevoViaje.longitude
          );
          if (distancia > 0.01) { // ~1 km en grados, aproximadamente 10 metros
            return true;
          }
        }
      }
    }

    return false;
  }

  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
        const marker = this.markers.get(viaje.idViaje)!;
        const currentPos = marker.getPosition();

        // Solo actualizar si la posición cambió significativamente
        if (!currentPos ||
            Math.abs(currentPos.lat() - position.lat) > 0.0001 ||
            Math.abs(currentPos.lng() - position.lng) > 0.0001) {
          marker.setPosition(position);
        }

        // Actualizar rotación si cambió
        if (viaje.heading !== undefined && viaje.heading !== null) {
          marker.setIcon({
            ...marker.getIcon(),
            rotation: viaje.heading
          });
        }

        // Actualizar contenido del info window
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

    // Solo ajustar vista en la carga inicial o cuando cambia el número de viajes
    if (this.isInitialLoad && this.viajesFiltrados.length > 0) {
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

