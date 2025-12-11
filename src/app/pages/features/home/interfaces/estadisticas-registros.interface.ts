export interface EstadisticasRegistros {
  totalPersonasRegistradas: number;
  personasRegistradasHoy: number;
  datosHeatmap: DatoHeatmap[];
  datosStackedBar: DatoStackedBar[];
  datosLineChart: DatoLineChart[];
}

// 1. HEATMAP: Hora vs Paradero
export interface DatoHeatmap {
  hora: number; // 0-23
  idParadero: number;
  nombreParadero: string;
  cantidadUsuarios: number;
}

// 2. STACKED BAR: Ruta con segmentos por Paradero
export interface DatoStackedBar {
  idRuta: number;
  nombreRuta: string;
  segmentosParaderos: SegmentoParadero[];
  totalUsuarios: number;
}

export interface SegmentoParadero {
  idParadero: number;
  nombreParadero: string;
  cantidadUsuarios: number;
}

// 3. LINE CHART: Hora vs Cantidad por Ruta
export interface DatoLineChart {
  hora: number; // 0-23
  valoresPorRuta: ValorPorRuta[];
}

export interface ValorPorRuta {
  idRuta: number;
  nombreRuta: string;
  cantidadUsuarios: number;
}
