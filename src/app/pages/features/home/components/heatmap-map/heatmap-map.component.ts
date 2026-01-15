import { Component, Input, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DatoHeatmap, DatoStackedBar } from '../../interfaces/estadisticas-registros.interface';

// Declaración de tipos para Google Maps
declare global {
  interface Window {
    google: any;
    googleMapsLoaded: boolean;
    googleMapsError: boolean;
  }
}


@Component({
  selector: 'app-heatmap-map',
  standalone: true,
  imports: [
    CommonModule,
    CardModule
  ],
  templateUrl: './heatmap-map.component.html',
  styleUrl: './heatmap-map.component.css'
})
export class HeatmapMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() datosHeatmap: DatoHeatmap[] = [];
  @Input() datosStackedBar: DatoStackedBar[] = [];
  @Input() paraderos: Array<{idPunto: number, latitud: number, longitud: number, nombreParadero: string}> = [];
  @Input() rutaSeleccionada: number | null = null; // Para filtrar por ruta específica
  @Input() paraderoSeleccionado: number | null = null; // Para filtrar por paradero específico
  @Input() escalaMin: number = 1; // Mínimo de usuarios para la escala
  @Input() escalaMax: number = 2000; // Máximo de usuarios para la escala

  map: any;
  heatmapCircles: any[] = []; // Array de círculos que simulan el heatmap
  markers: any[] = [];
  private mapInitialized = false;

  constructor() {}

  ngOnInit(): void {
    // Esperar a que Google Maps esté cargado
    this.waitForGoogleMaps();
  }

  ngAfterViewInit(): void {
    // Dar tiempo adicional para que el DOM esté listo
    setTimeout(() => {
      this.waitForGoogleMaps();
    }, 200);
  }

  private waitForGoogleMaps(): void {
    if (this.mapInitialized) return;

    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        this.initializeMap();
      } else {
        setTimeout(checkGoogleMaps, 100);
      }
    };

    // Si ya está cargado
    if (window.googleMapsLoaded) {
      setTimeout(checkGoogleMaps, 100);
    } else {
      // Escuchar el evento de carga
      window.addEventListener('googleMapsLoaded', () => {
        setTimeout(checkGoogleMaps, 100);
      });
      // Timeout de seguridad
      setTimeout(checkGoogleMaps, 2000);
    }
  }

  ngOnDestroy(): void {
    // Limpiar círculos del heatmap
    this.heatmapCircles.forEach(circle => circle.setMap(null));
    this.heatmapCircles = [];
    // Limpiar marcadores
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }


  private initializeMap(): void {
    if (this.mapInitialized) return;

    // Centro por defecto (puedes ajustarlo según tus datos)
    const defaultCenter = this.calculateCenter();

    const mapOptions = {
      zoom: 13,
      center: defaultCenter,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      // Optimizaciones de rendimiento
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      // Estilos para mejor visualización del heatmap
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'poi.business',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'labels.icon',
          stylers: [{ visibility: 'off' }]
        }
      ],
      // Optimizaciones de rendimiento
      gestureHandling: 'cooperative', // Requiere Ctrl+scroll para zoom
      optimized: true // Optimización automática de marcadores
    };

    const mapElement = document.getElementById('heatmap-container');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado');
      return;
    }

    this.map = new window.google.maps.Map(mapElement, mapOptions);
    this.mapInitialized = true;

    // Cargar datos del heatmap
    this.loadHeatmapData();
  }

  private calculateCenter(): { lat: number; lng: number } {
    if (this.paraderos.length === 0) {
      // Coordenadas por defecto (ajusta según tu ubicación)
      return { lat: -12.0464, lng: -77.0428 }; // Lima, Perú
    }

    // Calcular el centro basado en los paraderos
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    this.paraderos.forEach(paradero => {
      if (paradero.latitud && paradero.longitud) {
        sumLat += paradero.latitud;
        sumLng += paradero.longitud;
        count++;
      }
    });

    return {
      lat: count > 0 ? sumLat / count : -12.0464,
      lng: count > 0 ? sumLng / count : -77.0428
    };
  }

  private loadHeatmapData(): void {
    if (!this.map || !this.datosHeatmap || this.datosHeatmap.length === 0) {
      return;
    }

    // Limpiar círculos anteriores
    this.heatmapCircles.forEach(circle => circle.setMap(null));
    this.heatmapCircles = [];

    // Preparar datos agrupados por paradero
    const datosPorParadero = this.prepararDatosPorParadero();

    if (datosPorParadero.length === 0) {
      return;
    }

    // Crear círculos que simulan el heatmap
    datosPorParadero.forEach(dato => {
      const color = this.obtenerColorPorIntensidad(dato.cantidadUsuarios);
      const radio = this.calcularRadioPorIntensidad(dato.cantidadUsuarios);

      // Crear círculo con gradiente radial simulado usando múltiples círculos
      const circle = new window.google.maps.Circle({
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: 0.6,
        map: this.map,
        center: { lat: dato.latitud, lng: dato.longitud },
        radius: radio
      });

      // Círculo exterior más transparente para efecto de difusión
      const circleOuter = new window.google.maps.Circle({
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: 0.2,
        map: this.map,
        center: { lat: dato.latitud, lng: dato.longitud },
        radius: radio * 1.5
      });

      this.heatmapCircles.push(circle);
      this.heatmapCircles.push(circleOuter);
    });

    // Agregar marcadores para los paraderos
    this.agregarMarcadores();
  }

  private obtenerColorPorIntensidad(cantidadUsuarios: number): string {
    if (cantidadUsuarios <= 600) {
      return '#4ade80'; // Verde
    } else if (cantidadUsuarios <= 1200) {
      return '#fbbf24'; // Amarillo
    } else if (cantidadUsuarios <= 1800) {
      return '#f97316'; // Naranja
    } else {
      return '#dc2626'; // Rojo
    }
  }

  private calcularRadioPorIntensidad(cantidadUsuarios: number): number {
    // Radio base en metros, ajustado según la intensidad
    const minRadio = 50; // 50 metros para baja intensidad
    const maxRadio = 200; // 200 metros para máxima intensidad

    const minEscala = this.escalaMin;
    const maxEscala = this.escalaMax;
    const usuarios = Math.max(minEscala, Math.min(maxEscala, cantidadUsuarios));

    // Mapeo lineal de usuarios a radio
    const ratio = (usuarios - minEscala) / (maxEscala - minEscala);
    return minRadio + (maxRadio - minRadio) * ratio;
  }

  private prepararDatosPorParadero(): Array<{idParadero: number, latitud: number, longitud: number, cantidadUsuarios: number, nombreParadero: string}> {
    // Agrupar datos por paradero
    const datosPorParadero = new Map<number, { total: number; nombre: string }>();

    this.datosHeatmap.forEach(dato => {
      // Filtrar por paradero si está seleccionado
      if (this.paraderoSeleccionado !== null && dato.idParadero !== this.paraderoSeleccionado) {
        return;
      }

      // Filtrar por ruta si está seleccionada
      if (this.rutaSeleccionada !== null) {
        const rutaEncontrada = this.datosStackedBar.find(r => r.idRuta === this.rutaSeleccionada);
        if (rutaEncontrada) {
          const paraderoEnRuta = rutaEncontrada.segmentosParaderos.find(s => s.idParadero === dato.idParadero);
          if (!paraderoEnRuta) {
            return;
          }
        } else {
          return;
        }
      }

      const existente = datosPorParadero.get(dato.idParadero);
      if (existente) {
        existente.total += dato.cantidadUsuarios;
      } else {
        datosPorParadero.set(dato.idParadero, {
          total: dato.cantidadUsuarios,
          nombre: dato.nombreParadero
        });
      }
    });

    // Convertir a array con coordenadas
    const resultado: Array<{idParadero: number, latitud: number, longitud: number, cantidadUsuarios: number, nombreParadero: string}> = [];

    datosPorParadero.forEach((datos, idParadero) => {
      const paradero = this.paraderos.find(p => p.idPunto === idParadero);

      if (paradero && paradero.latitud && paradero.longitud) {
        resultado.push({
          idParadero,
          latitud: paradero.latitud,
          longitud: paradero.longitud,
          cantidadUsuarios: datos.total,
          nombreParadero: datos.nombre
        });
      }
    });

    return resultado;
  }


  private agregarMarcadores(): void {
    // Limpiar marcadores anteriores
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    // Agregar marcadores para cada paradero con datos
    const paraderosConDatos = new Set<number>();
    this.datosHeatmap.forEach(dato => {
      // Filtrar por paradero si está seleccionado
      if (this.paraderoSeleccionado !== null && dato.idParadero !== this.paraderoSeleccionado) {
        return;
      }

      // Filtrar por ruta si está seleccionada
      if (this.rutaSeleccionada !== null) {
        const rutaEncontrada = this.datosStackedBar.find(r => r.idRuta === this.rutaSeleccionada);
        if (rutaEncontrada) {
          const paraderoEnRuta = rutaEncontrada.segmentosParaderos.find(s => s.idParadero === dato.idParadero);
          if (!paraderoEnRuta) {
            return;
          }
        } else {
          return;
        }
      }

      paraderosConDatos.add(dato.idParadero);
    });

    paraderosConDatos.forEach(idParadero => {
      const paradero = this.paraderos.find(p => p.idPunto === idParadero);

      if (paradero && paradero.latitud && paradero.longitud) {
        const marker = new window.google.maps.Marker({
          position: { lat: paradero.latitud, lng: paradero.longitud },
          map: this.map,
          title: paradero.nombreParadero || `Paradero ${idParadero}`,
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        // Agregar info window con datos
        const infoWindow = new window.google.maps.InfoWindow({
          content: this.crearContenidoInfoWindow(idParadero)
        });

        marker.addListener('click', () => {
          infoWindow.open(this.map, marker);
        });

        this.markers.push(marker);
      }
    });
  }

  private crearContenidoInfoWindow(idParadero: number): string {
    const paradero = this.paraderos.find(p => p.idPunto === idParadero);
    let datosParadero = this.datosHeatmap.filter(d => d.idParadero === idParadero);

    // Filtrar por ruta si está seleccionada
    if (this.rutaSeleccionada !== null) {
      const rutaEncontrada = this.datosStackedBar.find(r => r.idRuta === this.rutaSeleccionada);
      if (rutaEncontrada) {
        const paraderoEnRuta = rutaEncontrada.segmentosParaderos.find(s => s.idParadero === idParadero);
        if (!paraderoEnRuta) {
          datosParadero = [];
        }
      } else {
        datosParadero = [];
      }
    }

    const totalUsuarios = datosParadero.reduce((sum, d) => sum + d.cantidadUsuarios, 0);
    const nombre = paradero?.nombreParadero || `Paradero ${idParadero}`;

    // Determinar nivel de aglomeración según la escala con colores correctos
    let nivelAglomeracion = 'Sin datos';
    let colorNivel = '#666';

    if (totalUsuarios > 0) {
      if (totalUsuarios <= 600) {
        nivelAglomeracion = 'Baja intensidad';
        colorNivel = '#4ade80'; // Verde
      } else if (totalUsuarios <= 1200) {
        nivelAglomeracion = 'Media intensidad';
        colorNivel = '#fbbf24'; // Amarillo
      } else if (totalUsuarios <= 1800) {
        nivelAglomeracion = 'Alta intensidad';
        colorNivel = '#f97316'; // Naranja
      } else {
        nivelAglomeracion = 'Máxima intensidad';
        colorNivel = '#dc2626'; // Rojo
      }
    }

    const rutaTexto = this.rutaSeleccionada !== null
      ? ` (Ruta: ${this.datosStackedBar.find(r => r.idRuta === this.rutaSeleccionada)?.nombreRuta || 'N/A'})`
      : '';
    const paraderoTexto = this.paraderoSeleccionado !== null
      ? ` (Paradero: ${paradero?.nombreParadero || 'N/A'})`
      : '';

    let contenido = `<div style="padding: 12px; min-width: 200px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">${nombre}</h3>
      <div style="margin: 8px 0;">
        <strong style="color: #495057;">Total usuarios:</strong>
        <span style="font-size: 18px; font-weight: 700; color: ${colorNivel}; margin-left: 8px;">${totalUsuarios.toLocaleString()}</span>
      </div>
      <div style="margin: 8px 0;">
        <strong style="color: #495057;">Nivel de aglomeración:</strong>
        <span style="color: ${colorNivel}; font-weight: 600; margin-left: 8px; background-color: ${colorNivel}20; padding: 2px 8px; border-radius: 4px;">${nivelAglomeracion}</span>
      </div>
      <div style="margin: 8px 0; font-size: 12px; color: #6c757d;">
        ${rutaTexto}${paraderoTexto}
      </div>
      <div style="margin: 8px 0; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 8px;">
        Escala: ${this.escalaMin} - ${this.escalaMax} usuarios
      </div>
    </div>`;

    return contenido;
  }

  // Método para actualizar datos
  actualizarDatos(): void {
    if (this.mapInitialized) {
      this.loadHeatmapData();
    }
  }

  // Métodos para cambiar los filtros
  cambiarRuta(idRuta: number | null): void {
    this.rutaSeleccionada = idRuta;
    this.actualizarDatos();
  }

  cambiarParadero(idParadero: number | null): void {
    this.paraderoSeleccionado = idParadero;
    this.actualizarDatos();
  }

  getRutasDisponibles(): DatoStackedBar[] {
    return this.datosStackedBar || [];
  }

  getParaderosDisponibles(): Array<{idPunto: number, nombreParadero: string}> {
    const paraderosMap = new Map<number, string>();

    // Si hay ruta seleccionada, solo mostrar paraderos de esa ruta
    if (this.rutaSeleccionada !== null) {
      const ruta = this.datosStackedBar.find(r => r.idRuta === this.rutaSeleccionada);
      if (ruta) {
        ruta.segmentosParaderos.forEach(seg => {
          paraderosMap.set(seg.idParadero, seg.nombreParadero);
        });
      }
    } else {
      // Mostrar todos los paraderos únicos de datosHeatmap
      this.datosHeatmap.forEach(dato => {
        if (!paraderosMap.has(dato.idParadero)) {
          paraderosMap.set(dato.idParadero, dato.nombreParadero);
        }
      });
    }

    return Array.from(paraderosMap.entries())
      .map(([idPunto, nombreParadero]) => ({ idPunto, nombreParadero }))
      .sort((a, b) => a.nombreParadero.localeCompare(b.nombreParadero));
  }
}

