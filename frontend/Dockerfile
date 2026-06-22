# ============ PRODUCCIÓN ============
FROM nginx:alpine

# Limpiar archivos por defecto de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar el frontend
COPY . /usr/share/nginx/html

# Nginx escucha por defecto en puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]