# ============ ETAPA 1: construcción ============
FROM nginx:alpine AS builder
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html

# ============ ETAPA 2: producción ============
FROM nginx:alpine AS production
COPY --from=builder /usr/share/nginx/html /usr/share/nginx/html

# Configurar nginx para escuchar en puerto 8080 (no requiere root)
RUN sed -i 's/listen\s*80;/listen 8080;/g' /etc/nginx/conf.d/default.conf \
    && addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]