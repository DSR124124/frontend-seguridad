export interface Notificacion {
  idNotificacion: number;
  titulo: string;
  mensaje: string;
  tipoNotificacion: string; // info, warning, error, success, critical
  prioridad: string; // baja, normal, alta, urgente
  idAplicacion: number;
  nombreAplicacion: string | null;
  creadoPor: number;
  creadorNombre: string | null;
  fechaCreacion: string;
  fechaExpiracion: string | null;
  fechaEnvio: string | null;
  requiereConfirmacion: boolean;
  mostrarComoRecordatorio: boolean;
  activo: boolean;
  datosAdicionales: any | null;
  fechaModificacion: string;
  totalDestinatarios?: number | null;
  totalLeidas?: number | null;
  totalConfirmadas?: number | null;
}

export interface NotificacionDTO {
  titulo: string;
  mensaje: string;
  tipoNotificacion?: string;
  prioridad?: string;
  idAplicacion: number;
  creadoPor: number;
  fechaExpiracion?: string | null;
  fechaEnvio?: string | null;
  requiereConfirmacion?: boolean;
  mostrarComoRecordatorio?: boolean;
  activo?: boolean;
  datosAdicionales?: any | null;
  idUsuarios?: number[];
}

export interface NotificacionUsuarioDTO {
  idNotificacion: number;
  titulo: string;
  mensaje: string;
  tipoNotificacion: string;
  prioridad: string;
  fechaCreacion: string;
  fechaExpiracion: string | null;
  requiereConfirmacion: boolean;
  datosAdicionales: any | null;
  nombreAplicacion: string | null;
  leida: boolean;
  fechaLectura: string | null;
  confirmada: boolean;
  fechaConfirmacion: string | null;
}

