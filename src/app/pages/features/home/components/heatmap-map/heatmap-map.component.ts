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

interface GoogleMapsLatLng {
  lat(): number;
  lng(): number;
}

interface HeatmapDataPoint {
  location: GoogleMapsLatLng;
  weight: number;
}

interface ParaderoConDatos {
  idParadero: number;
  nombreParadero: string;
  latitud: number;
  longitud: number;
  cantidadUsuarios: number;
  peso: number; // Peso normalizado para el heatmap (0-1)
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
  heatmap: any;
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
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.visualization) {
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
    if (this.heatmap) {
      this.heatmap.setMap(null);
    }
    this.markers.forEach(marker => marker.setMap(null));
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

    // Preparar datos para el heatmap
    const heatmapData = this.prepararDatosHeatmap();

    if (heatmapData.length === 0) {
      return;
    }

    // Limpiar heatmap anterior si existe
    if (this.heatmap) {
      this.heatmap.setMap(null);
    }

    // Crear nuevo heatmap con colores según la leyenda
    // Rangos: 1-600 (Verde), 600-1200 (Amarillo), 1200-1800 (Naranja), 1800-2000 (Rojo)
    // El gradiente usa 11 valores (0-10) que corresponden a 0%, 10%, 20%, ..., 100% de intensidad
    // Mapeo: 0-30% Verde, 30-60% Amarillo, 60-90% Naranja, 90-100% Rojo
    this.heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: this.map,
      radius: 80, // Radio aumentado para mejor visualización
      opacity: 0.8, // Opacidad aumentada para mejor contraste y visibilidad del verde
      maxIntensity: 1, // Intensidad máxima normalizada
      dissipating: true, // Permite que el heatmap se disipe en los bordes
      gradient: [
        'rgba(74, 222, 128, 0)',        // 0% (0.0) - Transparente (sin datos)
        'rgba(74, 222, 128, 0.3)',      // 10% (0.1) - Verde visible (para 1-200 usuarios)
        'rgba(74, 222, 128, 0.5)',      // 20% (0.2) - Verde medio (para 200-400 usuarios)
        'rgba(74, 222, 128, 0.7)',      // 30% (0.3) - Verde intenso (para 400-600 usuarios) - FIN VERDE
        'rgba(251, 191, 36, 0.7)',      // 40% (0.4) - Transición Verde-Amarillo (600-800)
        'rgba(251, 191, 36, 0.9)',      // 50% (0.5) - Amarillo medio (800-1000)
        'rgba(251, 191, 36, 1)',        // 60% (0.6) - Amarillo intenso (1000-1200) - FIN AMARILLO
        'rgba(249, 115, 22, 0.9)',      // 70% (0.7) - Transición Amarillo-Naranja (1200-1400)
        'rgba(249, 115, 22, 1)',        // 80% (0.8) - Naranja medio (1400-1600)
        'rgba(249, 115, 22, 1)',        // 90% (0.9) - Naranja intenso (1600-1800) - FIN NARANJA
        'rgba(220, 38, 38, 1)'          // 100% (1.0) - Rojo (Máxima: 1800-2000)
      ]
    });

    // Agregar marcadores para los paraderos
    this.agregarMarcadores();
  }

  private prepararDatosHeatmap(): HeatmapDataPoint[] {
    const paraderosConDatos: ParaderoConDatos[] = [];

    // Agrupar datos por paradero
    const datosPorParadero = new Map<number, { total: number; nombre: string }>();

    this.datosHeatmap.forEach(dato => {
      // Filtrar por paradero si está seleccionado
      if (this.paraderoSeleccionado !== null && dato.idParadero !== this.paraderoSeleccionado) {
        return;
      }

      // Filtrar por ruta si está seleccionada (necesitamos verificar en datosStackedBar)
      if (this.rutaSeleccionada !== null) {
        const rutaEncontrada = this.datosStackedBar.find(r => r.idRuta === this.rutaSeleccionada);
        if (rutaEncontrada) {
          const paraderoEnRuta = rutaEncontrada.segmentosParaderos.find(s => s.idParadero === dato.idParadero);
          if (!paraderoEnRuta) {
            return; // Este paradero no pertenece a la ruta seleccionada
          }
        } else {
          return; // Ruta no encontrada
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

    // Usar escala fija de 1 a 2000 usuarios
    const minEscala = this.escalaMin;
    const maxEscala = this.escalaMax;

    // Función para mapear cantidad de usuarios a peso normalizado según rangos de la leyenda
    // Rangos: 1-600 (Verde: 0.05-0.3), 600-1200 (Amarillo: 0.3-0.6), 1200-1800 (Naranja: 0.6-0.9), 1800-2000 (Rojo: 0.9-1.0)
    const calcularPeso = (cantidadUsuarios: number): number => {
      // Clampear el valor entre minEscala y maxEscala
      const usuarios = Math.max(minEscala, Math.min(maxEscala, cantidadUsuarios));

      if (usuarios <= 600) {
        // Mapear 1-600 a 0.05-0.3 (usar 0.05 como mínimo para que sea visible en verde)
        if (usuarios === minEscala) {
          return 0.05; // Peso mínimo visible para verde
        }
        return 0.05 + ((usuarios - minEscala) / (600 - minEscala)) * 0.25;
      } else if (usuarios <= 1200) {
        // Mapear 600-1200 a 0.3-0.6
        return 0.3 + ((usuarios - 600) / (1200 - 600)) * 0.3;
      } else if (usuarios <= 1800) {
        // Mapear 1200-1800 a 0.6-0.9
        return 0.6 + ((usuarios - 1200) / (1800 - 1200)) * 0.3;
      } else {
        // Mapear 1800-2000 a 0.9-1.0
        return 0.9 + ((usuarios - 1800) / (maxEscala - 1800)) * 0.1;
      }
    };

    // Crear array de datos para el heatmap
    const heatmapData: HeatmapDataPoint[] = [];

    datosPorParadero.forEach((datos, idParadero) => {
      const paradero = this.paraderos.find(p => p.idPunto === idParadero);

      if (paradero && paradero.latitud && paradero.longitud) {
        const cantidadUsuarios = datos.total;
        const peso = calcularPeso(cantidadUsuarios);

        // Calcular número de puntos basado en la cantidad de usuarios
        // Para baja intensidad (1-600), usar más puntos para mejor visibilidad del verde
        let puntosBase: number;
        if (cantidadUsuarios <= 600) {
          // Para baja intensidad, usar más puntos para acumular el efecto visual
          puntosBase = Math.max(3, Math.ceil(cantidadUsuarios / 50)); // Más puntos para verde
        } else {
          puntosBase = Math.max(1, Math.ceil(cantidadUsuarios / 100)); // 1 punto por cada 100 usuarios
        }
        const puntos = Math.min(puntosBase, 20); // Máximo 20 puntos por paradero para optimización

        for (let i = 0; i < puntos; i++) {
          // Variación aleatoria más pequeña para mejor agrupación
          const latOffset = (Math.random() - 0.5) * 0.0005; // Reducido de 0.001 a 0.0005
          const lngOffset = (Math.random() - 0.5) * 0.0005;

          heatmapData.push({
            location: new window.google.maps.LatLng(
              paradero.latitud + latOffset,
              paradero.longitud + lngOffset
            ) as any,
            weight: peso // Peso normalizado según los rangos de la leyenda
          });
        }
      }
    });

    return heatmapData;
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

