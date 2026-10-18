# DEPLOYMENT_GUIDE.md — Production Deployment & Hardening

---

## 1. Docker Multi-Stage Build (Server)

```dockerfile
# server/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json .
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodeuser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
RUN mkdir -p logs uploads && chown -R nodeuser:nodejs /app
USER nodeuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "dist/server.js"]
```

---

## 2. Nginx Configuration

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name exam.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name exam.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:MozSSL:10m;
    ssl_stapling        on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=()" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;

    # Serve React SPA
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 15M;
    }

    # Stricter rate limit for login
    location /api/v1/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://api:5000;
    }
}
```

---

## 3. Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - client_build:/usr/share/nginx/html:ro
    depends_on: [api, client]
    restart: always

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    env_file: ./server/.env.production
    environment:
      - NODE_ENV=production
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - mongo-primary
      - redis
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  client:
    build:
      context: ./client
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=https://exam.example.com
    volumes:
      - client_build:/app/dist
    restart: "no"

  mongo-primary:
    image: mongo:7
    command: ["--replSet", "rs0", "--keyFile", "/etc/mongo-keyfile", "--bind_ip_all"]
    volumes:
      - mongo_data:/data/db
      - ./mongo/keyfile:/etc/mongo-keyfile:ro
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASS}

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    restart: always

volumes:
  mongo_data:
  redis_data:
  uploads:
  logs:
  client_build:
```

---

## 4. Environment Variables (Production)

```env
# server/.env.production — NEVER commit to git
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://dbuser:password@mongo-primary:27017/exam_platform?replicaSet=rs0&authSource=admin
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
JWT_ACCESS_SECRET=<generate: openssl rand -base64 48>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 48>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid api key>
SMTP_FROM="Exam Platform <no-reply@exam.example.com>"
CLIENT_ORIGIN=https://exam.example.com
MFA_ENCRYPTION_KEY=<generate: openssl rand -base64 32>
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=/app/uploads
```

**Generate secrets**:
```bash
openssl rand -base64 48   # for JWT secrets
openssl rand -base64 32   # for MFA encryption key
```

---

## 5. MongoDB Replica Set Init (Production)

```bash
# Generate keyfile for replica set auth
openssl rand -base64 756 > mongo/keyfile
chmod 400 mongo/keyfile

# Initialise replica set (run once)
docker exec -it exam-platform-mongo-primary-1 mongosh \
  -u root -p "$MONGO_ROOT_PASS" \
  --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo-primary:27017' }] })"

# Create application DB user
docker exec -it exam-platform-mongo-primary-1 mongosh \
  -u root -p "$MONGO_ROOT_PASS" \
  --eval "
    use exam_platform;
    db.createUser({
      user: 'dbuser',
      pwd: 'strongpassword',
      roles: [{ role: 'readWrite', db: 'exam_platform' }]
    });
  "
```

---

## 6. Deployment Steps

```bash
# 1. Clone and configure
git clone https://github.com/your-org/exam-platform.git
cd exam-platform
cp server/.env.example server/.env.production
# Fill in all values

# 2. Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 3. Initialise MongoDB replica set (first time only)
# (see section 5 above)

# 4. Seed super admin
docker exec exam-platform-api-1 node dist/scripts/seed.js

# 5. Health check
curl https://exam.example.com/health
```

---

## 7. Graceful Shutdown (`server/server.ts`)

```typescript
import { createApp } from './src/app';
import { connectDB } from './src/config/db';
import { redisClient } from './src/config/redis';
import { startAttemptTimeoutJob } from './src/jobs/attemptTimeout.job';
import { env } from './src/config/env';
import { logger } from './src/config/logger';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  const app = createApp();
  startAttemptTimeoutJob();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await mongoose.disconnect();
      await redisClient.quit();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Startup error', err);
  process.exit(1);
});
```

---

## 8. Backup Strategy

```bash
# MongoDB daily backup (run via cron on host)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec exam-platform-mongo-primary-1 mongodump \
  --uri="mongodb://dbuser:password@localhost:27017/exam_platform" \
  --gzip \
  --archive=/backup/exam_$DATE.gz
# Sync to S3
aws s3 cp /backup/exam_$DATE.gz s3://your-backup-bucket/exam/
# Retain last 30 days
find /backup -mtime +30 -delete
```

---

## 9. Monitoring (Production)

```yaml
# Add to docker-compose.prod.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASS}
    volumes:
      - grafana_data:/var/lib/grafana
```

**Key metrics to alert on**:
- API error rate > 1%
- p95 response time > 500ms
- MongoDB connection pool > 80%
- Disk usage > 80%
- Failed login spike (> 50/min from single IP)

---

## 10. Pre-Launch Checklist

```
Infrastructure:
[ ] TLS certificate valid + auto-renew configured (Let's Encrypt / certbot)
[ ] MongoDB replica set healthy
[ ] Redis persistence enabled (AOF)
[ ] Backup job tested and verified
[ ] Monitoring + alerting active

Application:
[ ] NODE_ENV=production; no debug routes
[ ] All env secrets rotated from defaults
[ ] Super admin MFA enabled
[ ] Seed script removed or access-controlled
[ ] File upload directory not publicly accessible
[ ] Logs not exposing PII or secrets

Testing:
[ ] All unit tests pass
[ ] All API integration tests pass
[ ] Security checklist complete
[ ] Load test at 500 concurrent users passes
[ ] E2E exam flow verified in staging

Sign-off:
[ ] Business owner approved
[ ] Assessment content owner approved
[ ] Technical/security reviewer approved
```
