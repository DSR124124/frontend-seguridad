# Frontend Seguridad

Sistema de administración de seguridad y transporte integrado como microservicio dentro del sistema de gestión.

## Desarrollo

### Requisitos
- Node.js 20+
- npm

### Instalación
```bash
npm install
```

### Ejecutar en desarrollo
```bash
npm start
```

La aplicación estará disponible en `http://localhost:4201`

### Build para producción
```bash
npm run build
```

El build se generará en `dist/frontend-seguridad/browser`

## Despliegue con Docker

### Construir la imagen
```bash
docker build -t frontend-seguridad .
```

### Ejecutar el contenedor
```bash
docker run -d -p 4201:80 --name frontend-seguridad frontend-seguridad
```

### Con docker-compose
```bash
docker-compose up -d
```

Esto construirá y ejecutará el contenedor en el puerto 4201.

## Integración con Sistema de Gestión

Este sistema está diseñado para ser integrado dentro del `frontend-gestion` como un sistema externo.

### Configuración

El sistema recibe el token JWT como query parameter cuando es cargado desde el sistema de gestión:

```
http://localhost:4201?token=JWT_TOKEN
```

El token se guarda automáticamente en localStorage y se usa para todas las peticiones HTTP.

### Variables de Entorno

Configurar en `src/environment/environment.ts`:

```typescript
export const environment = {
  urlAuth: 'https://edugen.brianuceda.xyz/gestion/',
  urlServicios: 'http://localhost:8080/',
};
```

**Nota**: Ajustar las URLs según tu entorno de producción.

### Configuración en frontend-gestion

En `frontend-gestion/src/app/core/services/external-system.service.ts`, actualizar la URL del sistema:

```typescript
{
  id: 'seguridad',
  name: 'Gestión de Seguridad',
  url: 'http://tu-servidor:4201', // URL de producción
  // ...
}
```

## Estructura del Proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── interceptors/     # Interceptores HTTP (JWT)
│   │   ├── services/         # Servicios core (token-handler)
│   │   └── interfaces/       # Interfaces compartidas
│   ├── pages/
│   │   ├── features/         # Módulos de funcionalidades
│   │   └── full-pages/       # Páginas completas (auth, layout)
│   ├── shared/               # Componentes y servicios compartidos
│   └── prime-ng/             # Configuración de PrimeNG
├── assets/                   # Recursos estáticos
├── environment/              # Configuración de entornos
└── theme/                    # Tema personalizado
```

## Tecnologías

- Angular 19
- PrimeNG
- Bootstrap 5
- TypeScript
- RxJS

## Despliegue en Producción

### Opción 1: Docker (Recomendado)

1. Construir la imagen:
```bash
docker build -t frontend-seguridad:latest .
```

2. Ejecutar el contenedor:
```bash
docker run -d \
  -p 4201:80 \
  --name frontend-seguridad \
  --restart unless-stopped \
  frontend-seguridad:latest
```

### Opción 2: Docker Compose

```bash
docker-compose up -d
```

### Opción 3: Nginx Directo

1. Construir la aplicación:
```bash
npm run build
```

2. Copiar los archivos a tu servidor Nginx:
```bash
cp -r dist/frontend-seguridad/browser/* /usr/share/nginx/html/
```

3. Configurar Nginx con el archivo `nginx.conf` proporcionado

## Configuración de Base-Href

El sistema está configurado con `base-href: /sistema-seguridad/` en el Dockerfile.

Si necesitas cambiar el base-href, edita el Dockerfile:

```dockerfile
RUN npm run build -- --configuration production --base-href /tu-ruta/
```

Y actualiza la configuración de Nginx si es necesario.

## Notas

- El sistema está configurado para funcionar como iframe dentro del sistema de gestión
- El base-href está configurado como `/sistema-seguridad/` para el despliegue
- Ajustar la URL en `external-system.service.ts` del frontend-gestion según el despliegue
- El puerto por defecto es 4201, pero puede cambiarse en docker-compose.yml o en el comando docker run
