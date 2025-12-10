export interface PuntoRuta {
  idPunto?: number;
  orden: number;
  latitud: number;
  longitud: number;
  nombreParadero?: string;
  esParaderoOficial?: boolean;
}

export interface Ruta {
  idRuta: number;
  nombre: string;
  descripcion?: string;
  colorMapa?: string;
  estado: boolean;
  puntos?: PuntoRuta[];
}

export interface RutaRequest {
  nombre: string;
  descripcion?: string;
  idVehiculoDefault: number;
  colorMapa?: string;
  puntos: PuntoRuta[];
}

