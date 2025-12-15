export const environment = {
  // En desarrollo, usar rutas relativas para que el proxy las maneje
  // El proxy redirige /servicios y /gestion a https://edugen.brianuceda.xyz
  urlAuth: '/gestion/',
  urlServicios: '/servicios/',
  // ID fijo de la aplicación a usar para las notificaciones del sistema de seguridad
  // Ajusta este valor al id_aplicacion real que tengas en la BD de backend-gestion
  idAplicacionNotificaciones: 8,
};

