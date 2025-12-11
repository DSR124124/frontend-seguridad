import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { EstadisticasService } from '../../services/estadisticas.service';
import { EstadisticasRegistros, DatoStackedBar } from '../../interfaces/estadisticas-registros.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { RutaService } from '../../../rutas/services/ruta.service';
import { HeatmapMapComponent } from '../heatmap-map/heatmap-map.component';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ChartModule,
    HeatmapMapComponent,
    ...PrimeNGModules
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  estadisticas: EstadisticasRegistros | null = null;
  loading: boolean = false;
  paraderos: Array<{idPunto: number, latitud: number, longitud: number, nombreParadero: string}> = [];
  private loadingSubscription?: Subscription;

  // Datos para el gráfico
  chartDataStackedBar: any;

  chartOptions: any;
  chartOptionsStackedBar: any;

  constructor(
    private estadisticasService: EstadisticasService,
    private messageService: MessageService,
    private loadingService: LoadingService,
    private rutaService: RutaService
  ) {}

  ngOnInit(): void {
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => this.loading = loading
    );
    this.cargarEstadisticas();
    this.configurarOpcionesGrafico();
  }

  ngOnDestroy(): void {
    this.loadingSubscription?.unsubscribe();
  }

  cargarEstadisticas(): void {
    this.loadingService.show();

    // Cargar estadísticas y rutas en paralelo
    forkJoin({
      estadisticas: this.estadisticasService.obtenerEstadisticas(),
      rutas: this.rutaService.listarRutas()
    }).subscribe({
      next: ({ estadisticas, rutas }) => {
        this.estadisticas = estadisticas;
        this.extraerParaderos(rutas);
        this.prepararDatosGraficos();
        this.loadingService.hide();
      },
      error: (error: any) => {
        this.loadingService.hide();
        const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al cargar las estadísticas';
        this.messageService.error(errorMessage, 'Error', 6000);
      }
    });
  }

  private extraerParaderos(rutas: any[]): void {
    const paraderosMap = new Map<number, {idPunto: number, latitud: number, longitud: number, nombreParadero: string}>();

    rutas.forEach(ruta => {
      if (ruta.puntos && Array.isArray(ruta.puntos)) {
        ruta.puntos.forEach((punto: any) => {
          if (punto.idPunto && punto.latitud && punto.longitud) {
            paraderosMap.set(punto.idPunto, {
              idPunto: punto.idPunto,
              latitud: typeof punto.latitud === 'number' ? punto.latitud : parseFloat(punto.latitud),
              longitud: typeof punto.longitud === 'number' ? punto.longitud : parseFloat(punto.longitud),
              nombreParadero: punto.nombreParadero || `Paradero ${punto.idPunto}`
            });
          }
        });
      }
    });

    this.paraderos = Array.from(paraderosMap.values());
  }

  configurarOpcionesGrafico(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--p-text-color') || '#495057';
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color') || '#6c757d';
    const surfaceBorder = documentStyle.getPropertyValue('--p-surface-border') || '#dee2e6';

    // Opciones base
    const baseOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false
        }
      }
    };

    // Opciones para Stacked Bar
    this.chartOptionsStackedBar = {
      ...baseOptions,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Ruta',
            color: textColor
          },
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad de Usuarios',
            color: textColor
          },
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder
          }
        }
      }
    };
  }

  prepararDatosGraficos(): void {
    if (!this.estadisticas) return;

    // STACKED BAR: Ruta con segmentos por Paradero
    this.prepararStackedBar();
  }

  prepararStackedBar(): void {
    if (!this.estadisticas) return;
    const datos = this.estadisticas.datosStackedBar;

    // Obtener todos los paraderos únicos para crear los segmentos
    const paraderosUnicos = new Set<number>();
    datos.forEach((ruta: DatoStackedBar) => {
      ruta.segmentosParaderos.forEach(seg => {
        paraderosUnicos.add(seg.idParadero);
      });
    });

    const paraderosArray = Array.from(paraderosUnicos);

    // Crear datasets para cada paradero
    const datasets = paraderosArray.map((idParadero, index) => {
      const segmentoEncontrado = datos
        .flatMap(r => r.segmentosParaderos)
        .find(s => s.idParadero === idParadero);
      const nombreParadero = segmentoEncontrado?.nombreParadero || `Paradero ${idParadero}`;

      const data = datos.map((ruta: DatoStackedBar) => {
        const segmento = ruta.segmentosParaderos.find(s => s.idParadero === idParadero);
        return segmento ? segmento.cantidadUsuarios : 0;
      });

      return {
        label: nombreParadero,
        data: data,
        backgroundColor: this.getColorForIndex(index, paraderosArray.length, 0.7),
        borderColor: this.getColorForIndex(index, paraderosArray.length, 1),
        borderWidth: 1
      };
    });

    this.chartDataStackedBar = {
      labels: datos.map((r: DatoStackedBar) => r.nombreRuta),
      datasets: datasets
    };
  }


  getColorForIndex(index: number, total: number, opacity: number): string {
    const hue = (index * 360 / total) % 360;
    return `hsla(${hue}, 70%, 50%, ${opacity})`;
  }

  actualizar(): void {
    this.cargarEstadisticas();
  }
}
