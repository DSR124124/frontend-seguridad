export interface MessageResponse<T = any> {
  success:      boolean;
  message:      string | null;
  mensajeAviso: string | null;
  data:         T;
}
