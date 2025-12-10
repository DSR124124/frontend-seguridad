export interface Bus {
  idBus: number;
  placa: string;
  modelo?: string;
  capacidad: number;
  imeiGps?: string;
  estado: string;
}

export interface BusRequest {
  placa: string;
  modelo?: string;
  capacidad?: number;
  imeiGps?: string;
  estado?: string;
}

