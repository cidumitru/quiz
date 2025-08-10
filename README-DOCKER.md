# Docker Setup for AQB Backend

This guide explains how to run the AQB backend with PostgreSQL using Docker.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed (comes with Docker Desktop)

## Quick Start

### 1. Development Database Only

To run just PostgreSQL and pgAdmin for local development:

```bash
# Start PostgreSQL and pgAdmin
npm run docker:db

# Stop the database
npm run docker:db:down
```

Access:
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

### 2. Full Stack (API + Database)

To run the complete backend with PostgreSQL:

```bash
# Build and start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Rebuild from scratch
npm run docker:rebuild
```

Access:
- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Environment Variables

1. Copy the Docker environment template:
```bash
cp .env.docker .env
```

2. Update the `.env` file with your settings:
- Email SMTP credentials
- JWT secrets (for production)
- Database passwords (for production)

## Docker Commands

```bash
# Build Docker images
npm run docker:build

# Start services in detached mode
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Rebuild everything from scratch
npm run docker:rebuild

# Development database only
npm run docker:db        # Start
npm run docker:db:down   # Stop
```

## Database Connection

When running with Docker:
- Host: `postgres` (from API container)
- Host: `localhost` (from host machine)
- Port: `5432`
- Database: `aqb_dev`
- Username: `postgres`
- Password: `password`

## Troubleshooting

### Port Already in Use
If port 5432 or 3000 is already in use:
```bash
# Stop the conflicting service or change ports in docker-compose.yml
docker-compose down
lsof -i :5432  # Check what's using the port
```

### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker-compose ps
docker-compose logs postgres
```

### Clear Everything
```bash
# Remove all containers and volumes
docker-compose down -v
docker system prune -a
```

## Production Deployment

For production, update the following:
1. Set strong passwords in `.env`
2. Use proper JWT secrets
3. Configure email service credentials
4. Consider using managed database services
5. Set `NODE_ENV=production`