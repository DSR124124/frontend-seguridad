export interface ViajeActivoConUbicacion {
  idViaje: number;
  idRuta: number;
  nombreRuta?: string;
  busPlate: string;
  busModel?: string;
  driverName: string;
  estado: string;
  fechaInicioProgramada: string;
  fechaFinProgramada: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  lastUpdate?: string;
}

