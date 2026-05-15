# ============ ETAPA 1: construcción ============
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# ============ ETAPA 2: producción ============
FROM node:18-alpine AS production
WORKDIR /app

# Copiar solo lo necesario desde la etapa de build
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Crear usuario sin privilegios (no root)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Cambiar al usuario sin privilegios
USER appuser

EXPOSE 3001
CMD ["node", "server.js"]