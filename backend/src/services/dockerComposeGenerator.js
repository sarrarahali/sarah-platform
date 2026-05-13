const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

/**
 * Generate docker-compose.yml for full-stack applications
 */
class DockerComposeGenerator {
  constructor(structure, buildId) {
    this.structure = structure
    this.buildId = buildId
    this.services = {}
  }

  /**
   * Generate complete docker-compose configuration
   */
  generate() {
    if (this.structure.type === 'fullstack') {
      this.generateFullStack()
    } else if (this.structure.type === 'frontend') {
      this.generateFrontend()
    } else if (this.structure.type === 'backend') {
      this.generateBackend()
    }
    
    return this.buildCompose()
  }

  /**
   * Generate full-stack configuration
   */
  generateFullStack() {
    const appName = `app-${this.buildId.substring(0, 8)}`
    
    // Frontend service
    if (this.structure.frontend) {
      this.services.frontend = {
        build: {
          context: '.',
          dockerfile: 'Dockerfile.frontend'
        },
        ports: [`${this.structure.frontend.port}:${this.structure.frontend.port}`],
        environment: {
          REACT_APP_API_URL: 'http://backend:5000',
          VITE_API_URL: 'http://backend:5000'
        },
        depends_on: ['backend'],
        networks: ['app-network'],
        healthcheck: {
          test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', `http://localhost:${this.structure.frontend.port}`],
          interval: '30s',
          timeout: '10s',
          retries: 3,
          start_period: '10s'
        },
        restart: 'unless-stopped'
      }
    }
    
    // Backend service
    if (this.structure.backend) {
      this.services.backend = {
        build: {
          context: '.',
          dockerfile: 'Dockerfile.backend'
        },
        ports: [`${this.structure.backend.port}:${this.structure.backend.port}`],
        environment: {
          NODE_ENV: 'production',
          PORT: this.structure.backend.port,
          DATABASE_URL: this.structure.database ? this.getDatabaseUrl() : null
        },
        depends_on: [],
        networks: ['app-network'],
        healthcheck: {
          test: ['CMD', 'node', '-e', `require('http').get('http://localhost:${this.structure.backend.port}/health', (r) => {if (r.statusCode !== 200) throw new Error()})`],
          interval: '30s',
          timeout: '10s',
          retries: 3,
          start_period: '10s'
        },
        restart: 'unless-stopped',
        volumes: ['./logs:/app/logs']
      }
    }
    
    // Database service
    if (this.structure.database) {
      this.generateDatabaseService()
      if (this.services.backend) {
        this.services.backend.depends_on.push(this.structure.database.type)
      }
    }
    
    // Additional services
    this.structure.services.forEach(service => {
      this.generateServiceConfig(service)
    })
  }

  /**
   * Generate frontend-only configuration
   */
  generateFrontend() {
    this.services.frontend = {
      build: {
        context: '.',
        dockerfile: 'Dockerfile'
      },
      ports: ['80:80'],
      networks: ['app-network'],
      healthcheck: {
        test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost'],
        interval: '30s',
        timeout: '10s',
        retries: 3
      },
      restart: 'unless-stopped'
    }
  }

  /**
   * Generate backend-only configuration
   */
  generateBackend() {
    const port = this.structure.backend?.port || 3000
    
    this.services.backend = {
      build: {
        context: '.',
        dockerfile: 'Dockerfile'
      },
      ports: [`${port}:${port}`],
      environment: {
        NODE_ENV: 'production',
        PORT: port
      },
      networks: ['app-network'],
      healthcheck: {
        test: ['CMD', 'node', '-e', `require('http').get('http://localhost:${port}', (r) => {if (r.statusCode !== 200) throw new Error()})`],
        interval: '30s',
        timeout: '10s',
        retries: 3
      },
      restart: 'unless-stopped'
    }
    
    if (this.structure.database) {
      this.generateDatabaseService()
      this.services.backend.depends_on = [this.structure.database.type]
    }
  }

  /**
   * Generate database service configuration
   */
  generateDatabaseService() {
    const dbType = this.structure.database.type
    
    switch (dbType) {
      case 'postgresql':
        this.services.postgresql = {
          image: 'postgres:15-alpine',
          environment: {
            POSTGRES_DB: 'app_db',
            POSTGRES_USER: 'app_user',
            POSTGRES_PASSWORD: 'app_password'
          },
          volumes: ['./data/postgres:/var/lib/postgresql/data'],
          ports: ['5432:5432'],
          networks: ['app-network'],
          healthcheck: {
            test: ['CMD-SHELL', 'pg_isready -U app_user'],
            interval: '10s',
            timeout: '5s',
            retries: 5
          },
          restart: 'unless-stopped'
        }
        break
        
      case 'mysql':
        this.services.mysql = {
          image: 'mysql:8.0',
          environment: {
            MYSQL_DATABASE: 'app_db',
            MYSQL_USER: 'app_user',
            MYSQL_PASSWORD: 'app_password',
            MYSQL_ROOT_PASSWORD: 'root_password'
          },
          volumes: ['./data/mysql:/var/lib/mysql'],
          ports: ['3306:3306'],
          networks: ['app-network'],
          healthcheck: {
            test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost'],
            interval: '10s',
            timeout: '5s',
            retries: 5
          },
          restart: 'unless-stopped'
        }
        break
        
      case 'mongodb':
        this.services.mongodb = {
          image: 'mongo:6.0',
          environment: {
            MONGO_INITDB_DATABASE: 'app_db',
            MONGO_INITDB_ROOT_USERNAME: 'app_user',
            MONGO_INITDB_ROOT_PASSWORD: 'app_password'
          },
          volumes: ['./data/mongo:/data/db'],
          ports: ['27017:27017'],
          networks: ['app-network'],
          healthcheck: {
            test: ['CMD', 'mongosh', '--eval', 'db.runCommand("ping")'],
            interval: '10s',
            timeout: '5s',
            retries: 5
          },
          restart: 'unless-stopped'
        }
        break
    }
  }

  /**
   * Generate configuration for additional services
   */
  generateServiceConfig(service) {
    if (service.type === 'redis') {
      this.services.redis = {
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
        volumes: ['./data/redis:/data'],
        networks: ['app-network'],
        healthcheck: {
          test: ['CMD', 'redis-cli', 'ping'],
          interval: '10s',
          timeout: '5s',
          retries: 5
        },
        restart: 'unless-stopped'
      }
    }
  }

  /**
   * Get database URL for environment variable
   */
  getDatabaseUrl() {
    const type = this.structure.database.type
    const host = type // service name in docker-compose
    const port = this.structure.database.port
    
    switch (type) {
      case 'postgresql':
        return `postgresql://app_user:app_password@${host}:${port}/app_db`
      case 'mysql':
        return `mysql://app_user:app_password@${host}:${port}/app_db`
      case 'mongodb':
        return `mongodb://app_user:app_password@${host}:${port}/app_db`
      default:
        return null
    }
  }

  /**
   * Build final docker-compose YAML
   */
  buildCompose() {
    const compose = {
      version: '3.8',
      services: this.services,
      networks: {
        'app-network': {
          driver: 'bridge'
        }
      },
      volumes: {}
    }
    
    // Add volume definitions
    if (this.services.postgresql) compose.volumes['postgres_data'] = null
    if (this.services.mysql) compose.volumes['mysql_data'] = null
    if (this.services.mongodb) compose.volumes['mongo_data'] = null
    if (this.services.redis) compose.volumes['redis_data'] = null
    
    return yaml.dump(compose, { lineWidth: -1, noRefs: true })
  }
}

module.exports = DockerComposeGenerator
