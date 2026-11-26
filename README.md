# NexusDeploy - Modern PaaS with Real-Time Observability & Advanced DevOps

> Automated deployment platform for full-stack web applications with intelligent project detection and Docker orchestration.

## 🚀 Quick Start

### Windows (PowerShell)
```powershell
.\start.ps1
```

### Linux / macOS (Bash)
```bash
chmod +x start.sh
./start.sh
```

> Accédez à l'application : **http://localhost:5173** (API : **http://localhost:3000**)

## 📚 Documentation

- **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** - Guide complet de démonstration et soutenance (Scrum & Sprints)
- **[JENKINS_GUIDE.md](./JENKINS_GUIDE.md)** - Pipeline CI/CD Jenkins (Jenkinsfile & Docker Compose)
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup and first deployment
- **[DEVOPS_GUIDE.md](./DEVOPS_GUIDE.md)** - Complete feature documentation
- **[DEPLOYMENT_EXAMPLES.md](./DEPLOYMENT_EXAMPLES.md)** - Example configurations
- **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Detailed checklist

## ✨ Features

### Core Capabilities
- ✅ Intelligent project detection (frontend/backend/database)
- ✅ One-click ZIP file deployment
- ✅ GitHub repository deployment
- ✅ Automatic Docker Compose generation
- ✅ Multi-tech-stack support
- ✅ Production-ready build optimization
- ✅ Real-time build logging
- ✅ Health check monitoring

### Supported Stacks

#### Frontend
- React, Vue.js, Next.js, Gatsby, Svelte
- Static HTML/CSS/JS

#### Backend
- Express.js, Fastify, Koa, NestJS (Node.js)
- Flask, Django, FastAPI (Python)

#### Databases
- PostgreSQL (default)
- MySQL, MongoDB
- Redis, Elasticsearch (services)

### Vercel-Like Features
- Automatic framework detection
- Built-in health checks
- Multi-stage Docker builds
- Secure environment variable handling
- Comprehensive build artifacts
- Deployment history tracking

## 🛠️ Manual Setup

```bash
# Terminal 1 - Database
docker start sarah-db

# Terminal 2 - Backend
cd ~/sarra/backend
npm install  # Install js-yaml dependency
npm run dev

# Terminal 3 - Frontend
cd ~/sarra/frontend
npm run dev

# Terminal 4 - Migrations (first time only)
cd ~/sarra/backend
node migrations/001-devops-features.js
```

## 🔌 API Endpoints

### Deployment
```bash
# Upload ZIP file
POST /api/apps/:id/upload
Content-Type: multipart/form-data

# Deploy from GitHub
POST /api/apps/:id/git
Content-Type: application/json
{
  "repoUrl": "https://github.com/user/repo.git",
  "branch": "main"
}

# Get deployment details
GET /api/apps/:id/deployment/:deploymentId

# Get project structure
GET /api/apps/:id/structure

# Get deployment history
GET /api/deployments/:id/history
```

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
```

### Application Management
```bash
GET  /api/apps
POST /api/apps
DELETE /api/apps/:id
```

### Monitoring
```bash
GET /api/monitor/:id/logs
GET /api/monitor/:id/stats
```

## 📦 Project Structure Recognition

Sarra automatically detects and deploys:

```
my-app/
├── client/              → Frontend (React, Vue, Next.js, etc.)
├── server/              → Backend (Express, Flask, etc.)
├── .env.example         → Environment template (auto-filled)
└── docker-compose.yml   → Generated automatically
```

Or monorepo patterns:
```
monorepo/
├── apps/web/           → Frontend
├── apps/api/           → Backend
├── packages/           → Shared code
└── docker-compose.yml  → Auto-generated
```

## 🏗️ Generated Configuration

### Multi-Stage Dockerfile
```dockerfile
# Optimized builds with ~70% size reduction
# Health checks included
# Production-ready configurations
# Security headers for frontends
```

### Docker Compose with Services
```yaml
# Full service orchestration
# Automatic networking
# Database setup (PostgreSQL/MySQL/MongoDB)
# Environment variable injection
# Health check monitoring
# Restart policies
```

### Environment Configuration
```bash
# Auto-generated .env
# Secure secret generation
# Database connection strings
# API configuration
# Feature flags
```

## 📊 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React.js + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Containerization | Docker + Docker Compose |
| Build System | Advanced DevOps Pipeline |

## 🔄 Deployment Workflow

### From ZIP File
1. Upload ZIP archive
2. Automatic structure detection
3. Generate Dockerfiles
4. Create docker-compose.yml
5. Build Docker images
6. Deploy services
7. Access via URL

### From GitHub
1. Provide repository URL
2. Select branch (main by default)
3. Shallow clone (--depth=1)
4. Auto-detect structure
5. Generate configuration
6. Build and deploy
7. Get public URL

## 📋 Environment Variables

Platform automatically generates:
- JWT secrets
- Database credentials
- Session secrets
- API configuration
- Feature flags
- Service URLs

Customize via `.env.example` in your repository.

## 🚨 Health Checks

Automatic health endpoints:
```
Frontend: GET http://localhost:3000/
Backend: GET http://localhost:5000/health
Database: PostgreSQL health check
```

## 📈 Monitoring

- **real-time logs** - Build and deployment logs
- **build metrics** - Build time, image size
- **service health** - Health check status
- **deployment history** - Track all deployments
- **error tracking** - Failed build diagnostics

## 🔐 Security

- JWT-based authentication
- Secure secret generation
- CORS configuration
- Security headers (Helmet.js)
- Environment variable isolation
- Database credential handling

## 🚀 Production Deployment

```bash
# Run database migrations
node migrations/001-devops-features.js

# Verify Docker
docker --version
docker-compose --version

# Deploy your app
curl -X POST 'http://localhost:3000/api/apps/1/git' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "repoUrl": "https://github.com/your/repo.git"
  }'
```

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check Docker Compose config
docker-compose config

# View logs
docker logs <container>

# Check health
docker-compose ps
```

### Build Fails
```bash
# Get deployment logs
curl http://localhost:3000/api/apps/:id/deployment/:deploymentId \
  -H 'Authorization: Bearer <token>'

# Common causes:
# - Missing package.json
# - Failed npm install  
# - Docker build error
```

### Database Connection Issues
```bash
# Verify database is running
curl postgresql://localhost:5432

# Check credentials in .env
cat .env | grep DATABASE_URL

# Restart database service
docker restart postgresql
```

## 📝 Environment Examples

### React + Express + PostgreSQL
See [DEPLOYMENT_EXAMPLES.md](./DEPLOYMENT_EXAMPLES.md#example-1-react--express--postgresql)

### Next.js Full-Stack
See [DEPLOYMENT_EXAMPLES.md](./DEPLOYMENT_EXAMPLES.md#example-2-nextjs-full-stack)

### Python + React
See [DEPLOYMENT_EXAMPLES.md](./DEPLOYMENT_EXAMPLES.md#example-3-python--react)

## 🎯 Next Steps

1. **Run migrations** - Update database schema
2. **Deploy first app** - Test ZIP or GitHub deployment
3. **Monitor build logs** - Check deployment details
4. **Access application** - Use assigned URL
5. **Review structure** - See detected tech stack
6. **Plan CI/CD** - Webhook integration (coming soon)

## 🔗 Related Projects

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Vercel Deployment](https://vercel.com/)

## 📄 License

ISC

## 🤝 Contributing

Contributions welcome! See [DEVOPS_GUIDE.md](./DEVOPS_GUIDE.md) for architecture details.

## 📧 Support

For issues and questions, check the troubleshooting section or review deployment logs.

---

**Version**: 2.0.0 (DevOps Enhanced)
**Platform**: Sarra PaaS
**Last Updated**: 2026-05-06
