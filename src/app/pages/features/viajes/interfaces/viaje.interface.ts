export interface Viaje {
  idViaje: number;
  idRuta: number;
  nombreRuta?: string;
  idBus: number;
  placaBus?: string;
  idConductor: number;
  fechaInicioProgramada: string; // ISO string
  fechaFinProgramada: string; // ISO string
  fechaInicioReal?: string; // ISO string
  fechaFinReal?: string; // ISO string
  estado: string; // programado, en_curso, completado, cancelado
}

export interface ViajeRequest {
  idRuta: number;
  idBus: number;
  idConductor: number;
  fechaInicioProgramada: string; // ISO string
  fechaFinProgramada: string; // ISO string
  estado?: string;
}

