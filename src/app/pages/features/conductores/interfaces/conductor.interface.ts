export interface Conductor {
  idUsuarioGestion: number;
  licenciaNumero: string;
  categoria?: string;
  telefonoContacto?: string;
  estado: string;
  // Datos del usuario desde backend-gestion
  username?: string;
  email?: string;
  nombreCompleto?: string;
  idRol?: number;
  nombreRol?: string;
  usuarioActivo?: boolean;
}

export interface ConductorRequest {
  idUsuarioGestion: number;
  licenciaNumero: string;
  categoria?: string;
  telefonoContacto?: string;
  estado?: string;
}

