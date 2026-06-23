#Tienda de Alimentos para Perritos 🐶

Aplicación web CRUD desplegada en AWS EC2 con Docker, CI/CD automatizado con GitHub Actions y Amazon ECR.

## Tecnologías utilizadas
- Frontend: HTML + JavaScript servido con Nginx
- Backend: Node.js + Express
- Base de datos: MySQL 8
- Contenedores: Docker con multi-stage build
- Registro de imágenes: Amazon ECR
- CI/CD: GitHub Actions
- Infraestructura: AWS EC2

## Arquitectura
- Frontend desplegado en EC2 pública, accesible desde internet en puerto 8080
- Backend desplegado en EC2 privada, puerto 3001
- Base de datos MySQL con volumen named `dbdata` para persistencia

## Decisiones técnicas

### Dockerfile multi-stage
Se implementó multi-stage build en frontend y backend para reducir el tamaño de la imagen final y mejorar la seguridad. Cada imagen corre con usuario sin privilegios root.

### Volúmenes Docker
Se utilizó named volume (`dbdata`) en lugar de bind mount porque es más portable entre sistemas operativos y Docker lo gestiona automáticamente, garantizando que los datos persisten aunque el contenedor se elimine.

### Pipeline CI/CD
Cada push a la rama `deploy` dispara automáticamente el pipeline que construye las imágenes, las publica en ECR y actualiza EC2. Las credenciales AWS se manejan mediante GitHub Secrets.

## Cómo ejecutar localmente

```bash
docker-compose up --build
```

Abrir http://localhost:8080

## Despliegue en AWS EC2

### Frontend
```bash
sudo docker run -d --name tienda-frontend -p 8080:80 \
  .dkr.ecr.us-east-1.amazonaws.com/tienda-frontend:latest
```

### Backend
```bash
sudo docker network create tienda-net
sudo docker run -d --name tienda-db --network tienda-net \
  -e MYSQL_ROOT_PASSWORD=admin123 -e MYSQL_DATABASE=tienda_perritos \
  -v dbdata:/var/lib/mysql mysql:8

sudo docker run -d --name tienda-backend --network tienda-net \
  -e DB_HOST=tienda-db -e DB_USER=root -e DB_PASSWORD=admin123 \
  -e DB_NAME=tienda_perritos -e DB_PORT=3306 -p 3001:3001 \
  .dkr.ecr.us-east-1.amazonaws.com/tienda-backend:latest
```

## Commits
- feat: agrega Dockerfiles multi-stage con usuario no root
- feat: agrega pipeline CI/CD con GitHub Actions para ECR
- fix: actualiza URL del backend a IP de EC2
- docs: agrega README con documentación del proyecto

