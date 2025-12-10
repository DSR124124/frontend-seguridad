# Stage 1: Build de la aplicación Angular
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production=false

# Copiar el código fuente
COPY . .

# Construir la aplicación en modo producción con base-href
RUN npm run build -- --configuration production --base-href /sistema-seguridad/

# Stage 2: Servir con Nginx
FROM nginx:alpine

# Copiar la configuración de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar los archivos construidos desde el stage anterior
COPY --from=build /app/dist/frontend-seguridad/browser /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando por defecto para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

