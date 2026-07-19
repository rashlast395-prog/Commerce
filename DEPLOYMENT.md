# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Firebase project with Authentication and Firestore enabled
- GitHub repository connected to deployment platform

## Environment Variables

### Server (.env)
```env
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
REDIS_URL=redis://localhost:6379
```

### Python Service (.env)
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/yussif-eats.git
cd yussif-eats

# Create .env files
cp server/.env.example server/.env
cp python-service/.env.example python-service/.env

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Option 2: Firebase Hosting (Frontend Only)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only hosting
```

### Option 3: Render

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push to main

### Option 4: Railway

1. Connect GitHub repository
2. Configure services in railway.json
3. Deploy automatically

## Production Checklist

- [ ] Environment variables configured
- [ ] Firebase security rules deployed
- [ ] SSL certificates configured
- [ ] Domain names configured
- [ ] CDN configured for static assets
- [ ] Monitoring and logging enabled
- [ ] Backup strategy in place
- [ ] Health checks passing

## Monitoring

- Health endpoints: `/health` (API), `/health` (Python), `/health` (Frontend)
- Logs: Docker logs or platform-specific logging
- Metrics: Response times, error rates, user activity

## Scaling

- Use Redis for session storage and caching
- Deploy multiple API instances behind a load balancer
- Use Firebase Firestore for horizontal scaling
- Monitor with Prometheus + Grafana
