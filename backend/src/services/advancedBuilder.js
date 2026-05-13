const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const ProjectDetector = require('./projectDetector')
const DockerComposeGenerator = require('./dockerComposeGenerator')
const EnvManager = require('./envManager')
const {
  generateNodejsDockerfile,
  generateReactDockerfile,
  generateVueDockerfile,
  generateNextjsDockerfile,
  generatePythonDockerfile,
  generateStaticDockerfile,
  generateNginxConf
} = require('./dockerfileGenerator')

/**
 * Enhanced builder for full-stack applications
 */
class AdvancedBuilder {
  constructor(buildDir, appName, buildId) {
    this.buildDir = buildDir
    this.appName = appName
    this.buildId = buildId
    this.projectStructure = null
    this.logs = []
  }

  /**
   * Main build process
   */
  async build() {
    try {
      this.log(`[BUILDER] Starting build for ${this.appName}`)
      
      // Step 1: Detect project structure
      this.log('[STEP 1] Detecting project structure...')
      const detector = new ProjectDetector(this.buildDir)
      this.projectStructure = detector.scan()
      this.log(`[STRUCTURE] Type: ${this.projectStructure.type}`)
      this.log(`[STRUCTURE] Frontend: ${this.projectStructure.frontend?.framework || 'None'}`)
      this.log(`[STRUCTURE] Backend: ${this.projectStructure.backend?.framework || 'None'}`)
      this.log(`[STRUCTURE] Database: ${this.projectStructure.database?.type || 'None'}`)
      
      // Step 2: Generate environment files
      this.log('[STEP 2] Generating environment configuration...')
      const envManager = new EnvManager(this.buildDir)
      envManager.generateEnv(this.appName)
      envManager.generateDockerComposeEnv(this.buildDir)
      this.log('[ENV] Environment files created')
      
      // Step 3: Build based on project type
      if (this.projectStructure.type === 'fullstack') {
        await this.buildFullStack()
      } else if (this.projectStructure.type === 'frontend') {
        await this.buildFrontend()
      } else if (this.projectStructure.type === 'backend') {
        await this.buildBackend()
      } else {
        // Default: static files
        await this.buildStatic()
      }
      
      this.log('[BUILDER] Build completed successfully')
      
      return {
        success: true,
        structure: this.projectStructure,
        imageName: `${this.appName}:latest`,
        buildId: this.buildId,
        logs: this.logs
      }
    } catch (error) {
      this.log(`[ERROR] ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * Build full-stack application
   */
  async buildFullStack() {
    this.log('[STEP 3] Building full-stack application with Docker Compose...')
    
    // Generate docker-compose.yml
    const composeGen = new DockerComposeGenerator(this.projectStructure, this.buildId)
    const composeContent = composeGen.generate()
    const composePath = path.join(this.buildDir, 'docker-compose.yml')
    fs.writeFileSync(composePath, composeContent)
    this.log('[COMPOSE] docker-compose.yml generated')
    
    // Build frontend Dockerfile
    if (this.projectStructure.frontend) {
      await this.buildComponentDockerfile(
        this.projectStructure.frontend,
        'Dockerfile.frontend',
        true
      )
    }
    
    // Build backend Dockerfile
    if (this.projectStructure.backend) {
      await this.buildComponentDockerfile(
        this.projectStructure.backend,
        'Dockerfile.backend',
        false
      )
    }
    
    // Build all services with docker-compose
    this.log('[DOCKER-COMPOSE] Building services...')
    try {
      execSync(`cd ${this.buildDir} && docker-compose build`, { stdio: 'inherit' })
      this.log('[DOCKER-COMPOSE] Services built successfully')
    } catch (err) {
      this.log(`[ERROR] Docker Compose build failed: ${err.message}`, 'error')
      throw err
    }
  }

  /**
   * Build frontend-only application
   */
  async buildFrontend() {
    this.log('[STEP 3] Building frontend application...')
    await this.buildComponentDockerfile(this.projectStructure.frontend, 'Dockerfile', true)
  }

  /**
   * Build backend-only application
   */
  async buildBackend() {
    this.log('[STEP 3] Building backend application...')
    await this.buildComponentDockerfile(this.projectStructure.backend, 'Dockerfile', false)
  }

  /**
   * Build static website
   */
  async buildStatic() {
    this.log('[STEP 3] Building static website...')
    const dockerfile = generateStaticDockerfile()
    const dockerfilePath = path.join(this.buildDir, 'Dockerfile')
    fs.writeFileSync(dockerfilePath, dockerfile)
    
    // Generate nginx config
    const nginxConf = generateNginxConf()
    const nginxPath = path.join(this.buildDir, 'nginx.conf')
    fs.writeFileSync(nginxPath, nginxConf)
    
    await this.buildDockerImage(`${this.appName}:latest`)
  }

  /**
   * Build Dockerfile for a specific component
   */
  async buildComponentDockerfile(component, dockerfileName, isFrontend) {
    let dockerfile = ''
    
    if (isFrontend) {
      switch (component.type) {
        case 'react':
          dockerfile = generateReactDockerfile(true)
          break
        case 'vue':
          dockerfile = generateVueDockerfile(true)
          break
        case 'nextjs':
          dockerfile = generateNextjsDockerfile(true)
          break
        default:
          dockerfile = generateStaticDockerfile()
      }
      
      // Generate nginx config for frontend
      const nginxConf = generateNginxConf()
      const nginxPath = path.join(this.buildDir, 'nginx.conf')
      if (!fs.existsSync(nginxPath)) {
        fs.writeFileSync(nginxPath, nginxConf)
      }
    } else {
      // Backend
      switch (component.type) {
        case 'express':
        case 'fastify':
        case 'koa':
        case 'nestjs':
        case 'nodejs':
          const pkgPath = path.join(this.buildDir, component.path, 'package.json')
          const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {}
          dockerfile = generateNodejsDockerfile(pkg, component.mainFile, true)
          break
        case 'python':
          dockerfile = generatePythonDockerfile(true, true)
          break
        default:
          dockerfile = generateNodejsDockerfile({}, 'index.js', true)
      }
    }
    
    const dockerfilePath = path.join(this.buildDir, dockerfileName)
    fs.writeFileSync(dockerfilePath, dockerfile)
    this.log(`[DOCKERFILE] ${dockerfileName} generated for ${component.framework}`)
  }

  /**
   * Build Docker image
   */
  async buildDockerImage(imageName) {
    this.log(`[DOCKER] Building image: ${imageName}`)
    try {
      execSync(`docker build -t ${imageName} ${this.buildDir}`, { stdio: 'inherit' })
      this.log(`[DOCKER] Image built successfully: ${imageName}`)
    } catch (err) {
      this.log(`[ERROR] Docker build failed: ${err.message}`, 'error')
      throw err
    }
  }

  /**
   * Generate comprehensive metadata
   */
  generateMetadata() {
    return {
      appName: this.appName,
      buildId: this.buildId,
      type: this.projectStructure.type,
      frontend: this.projectStructure.frontend,
      backend: this.projectStructure.backend,
      database: this.projectStructure.database,
      services: this.projectStructure.services,
      builtAt: new Date().toISOString(),
      logs: this.logs
    }
  }

  /**
   * Log messages
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    this.logs.push({ timestamp, message, level })
    console.log(logEntry)
  }
}

module.exports = AdvancedBuilder
