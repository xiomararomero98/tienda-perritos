# ============ ETAPA 1: construcción ============
FROM nginx:alpine AS builder
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html

# ============ ETAPA 2: producción ============
FROM nginx:alpine AS production

# Copiar archivos desde etapa builder
COPY --from=builder /usr/share/nginx/html /usr/share/nginx/html

# Crear usuario sin privilegios
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]