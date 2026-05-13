const fs = require('fs')
const path = require('path')

/**
 * Manages environment variables and configuration for deployments
 */
class EnvManager {
  constructor(buildDir) {
    this.buildDir = buildDir
  }

  /**
   * Generate .env file from existing .env.example or create defaults
   */
  generateEnv(appName) {
    const envExamplePath = path.join(this.buildDir, '.env.example')
    const envPath = path.join(this.buildDir, '.env')
    
    let envContent = ''
    
    if (fs.existsSync(envExamplePath)) {
      // Use .env.example as template
      const example = fs.readFileSync(envExamplePath, 'utf8')
      envContent = this.fillEnvTemplate(example)
    } else {
      // Create default environment
      envContent = this.getDefaultEnv(appName)
    }
    
    // Write .env file if it doesn't exist (don't overwrite)
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envContent)
    }
    
    return envContent
  }

  /**
   * Fill .env template with default values
   */
  fillEnvTemplate(template) {
    return template.split('\n').map(line => {
      // Skip comments and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        return line
      }
      
      const [key] = line.split('=')
      if (!key) return line
      
      // Add default values for common variables
      const defaults = {
        'NODE_ENV': 'production',
        'PORT': '3000',
        'DEBUG': 'false',
        'DATABASE_URL': 'postgresql://app_user:app_password@localhost:5432/app_db',
        'REDIS_URL': 'redis://localhost:6379',
        'JWT_SECRET': this.generateSecret(32),
        'API_KEY': this.generateSecret(32),
        'ADMIN_PASSWORD': this.generateSecret(16),
        'SESSION_SECRET': this.generateSecret(32)
      }
      
      return `${key}=${defaults[key] || ''}`
    }).join('\n')
  }

  /**
   * Get default environment variables
   */
  getDefaultEnv(appName) {
    return `# Application Configuration
NODE_ENV=production
PORT=3000
APP_NAME=${appName}

# Database Configuration
DATABASE_URL=postgresql://app_user:app_password@postgresql:5432/app_db
DATABASE_HOST=postgresql
DATABASE_PORT=5432
DATABASE_NAME=app_db
DATABASE_USER=app_user
DATABASE_PASSWORD=app_password

# Cache Configuration
REDIS_URL=redis://redis:6379
CACHE_TTL=3600

# Authentication
JWT_SECRET=${this.generateSecret(32)}
JWT_EXPIRES_IN=7d
SESSION_SECRET=${this.generateSecret(32)}

# API Configuration
API_RATE_LIMIT=100
API_TIMEOUT=30000

# Logging
LOG_LEVEL=info
SENTRY_DSN=

# Security
CORS_ORIGIN=*
HELMET_ENABLED=true

# Email (if needed)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

# External Services
STRIPE_KEY=
STRIPE_SECRET=
GITHUB_TOKEN=

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_MONITORING=true
`
  }

  /**
   * Extract environment variables from package.json scripts
   */
  extractFromPackageJson(pkgPath) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      const env = {}
      
      // Extract from scripts (look for environment variable patterns)
      if (pkg.scripts) {
        Object.values(pkg.scripts).forEach(script => {
          const matches = script.match(/([A-Z_]+)=([^\s]+)/g)
          if (matches) {
            matches.forEach(match => {
              const [key, value] = match.split('=')
              env[key] = value
            })
          }
        })
      }
      
      return env
    } catch (e) {
      return {}
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnv(envPath, requiredVars = []) {
    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${envPath}`)
    }
    
    const content = fs.readFileSync(envPath, 'utf8')
    const missing = []
    
    requiredVars.forEach(varName => {
      if (!content.includes(`${varName}=`)) {
        missing.push(varName)
      }
    })
    
    if (missing.length > 0) {
      console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`)
    }
    
    return missing.length === 0
  }

  /**
   * Generate secure random secret
   */
  generateSecret(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
    let secret = ''
    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }

  /**
   * Create .env file for docker-compose
   */
  generateDockerComposeEnv(buildDir) {
    const content = `
# Docker Compose Environment Variables
NODE_ENV=production
POSTGRES_DB=app_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=app_password
MYSQL_DATABASE=app_db
MYSQL_USER=app_user
MYSQL_PASSWORD=app_password
MYSQL_ROOT_PASSWORD=root_password
MONGO_INITDB_DATABASE=app_db
MONGO_INITDB_ROOT_USERNAME=app_user
MONGO_INITDB_ROOT_PASSWORD=app_password
`.trim()
    
    const envPath = path.join(buildDir, '.env.compose')
    fs.writeFileSync(envPath, content)
    return envPath
  }

  /**
   * Create production environment overrides
   */
  generateProductionEnv(baseEnv) {
    const prodOverrides = {
      'NODE_ENV': 'production',
      'DEBUG': 'false',
      'LOG_LEVEL': 'warn',
      'HELMET_ENABLED': 'true'
    }
    
    let envContent = baseEnv
    Object.entries(prodOverrides).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm')
      envContent = envContent.replace(regex, `${key}=${value}`)
    })
    
    return envContent
  }
}

module.exports = EnvManager
