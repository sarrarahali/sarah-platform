const fs = require('fs')
const path = require('path')

/**
 * Detects project structure and determines deployment strategy
 */
class ProjectDetector {
  constructor(projectPath) {
    this.projectPath = projectPath
    this.structure = {
      frontend: null,
      backend: null,
      database: null,
      services: [],
      type: 'unknown'
    }
  }

  /**
   * Scan project directory structure
   */
  scan() {
    const contents = this.readdirSync(this.projectPath)
    
    // Check for common frontend patterns
    this.detectFrontend(contents)
    
    // Check for common backend patterns
    this.detectBackend(contents)
    
    // Check for database configuration
    this.detectDatabase(contents)
    
    // Determine overall project type
    this.determineProjectType()
    
    return this.structure
  }

  /**
   * Detect frontend framework from package.json or directory structure
   */
  detectFrontend(contents) {
    const frontendDirs = ['client', 'frontend', 'web', 'app', 'ui']
    
    for (const dir of frontendDirs) {
      if (contents.includes(dir)) {
        const frontendPath = path.join(this.projectPath, dir)
        const pkgPath = path.join(frontendPath, 'package.json')
        
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
            const deps = { ...pkg.dependencies, ...pkg.devDependencies }
            
            if (deps.react) {
              this.structure.frontend = {
                type: 'react',
                path: dir,
                buildCmd: 'npm run build',
                framework: 'React',
                port: 3000
              }
            } else if (deps.vue) {
              this.structure.frontend = {
                type: 'vue',
                path: dir,
                buildCmd: 'npm run build',
                framework: 'Vue.js',
                port: 3000
              }
            } else if (deps.next) {
              this.structure.frontend = {
                type: 'nextjs',
                path: dir,
                buildCmd: 'npm run build',
                framework: 'Next.js',
                port: 3000
              }
            } else if (deps.gatsby) {
              this.structure.frontend = {
                type: 'gatsby',
                path: dir,
                buildCmd: 'npm run build',
                framework: 'Gatsby',
                port: 3000
              }
            } else if (deps.svelte) {
              this.structure.frontend = {
                type: 'svelte',
                path: dir,
                buildCmd: 'npm run build',
                framework: 'Svelte',
                port: 3000
              }
            } else {
              // Generic Node.js frontend
              this.structure.frontend = {
                type: 'nodejs',
                path: dir,
                buildCmd: 'npm run build',
                framework: 'Node.js',
                port: 3000
              }
            }
            return
          } catch (e) {
            console.error(`Error parsing ${dir}/package.json:`, e.message)
          }
        }
      }
    }
    
    // Check root package.json for frontend framework
    const rootPkgPath = path.join(this.projectPath, 'package.json')
    if (fs.existsSync(rootPkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        
        if (deps.react) {
          this.structure.frontend = {
            type: 'react',
            path: '.',
            buildCmd: 'npm run build',
            framework: 'React',
            port: 3000
          }
        } else if (deps.next) {
          this.structure.frontend = {
            type: 'nextjs',
            path: '.',
            buildCmd: 'npm run build',
            framework: 'Next.js',
            port: 3000
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  /**
   * Detect backend framework from package.json or directory structure
   */
  detectBackend(contents) {
    const backendDirs = ['server', 'backend', 'api', 'src']
    
    for (const dir of backendDirs) {
      if (contents.includes(dir)) {
        const backendPath = path.join(this.projectPath, dir)
        const pkgPath = path.join(backendPath, 'package.json')
        
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
            const deps = { ...pkg.dependencies, ...pkg.devDependencies }
            
            if (deps.express) {
              this.structure.backend = {
                type: 'express',
                path: dir,
                framework: 'Express.js',
                port: 5000,
                mainFile: pkg.main || 'index.js'
              }
            } else if (deps.fastify) {
              this.structure.backend = {
                type: 'fastify',
                path: dir,
                framework: 'Fastify',
                port: 3000,
                mainFile: pkg.main || 'index.js'
              }
            } else if (deps.koa) {
              this.structure.backend = {
                type: 'koa',
                path: dir,
                framework: 'Koa',
                port: 3000,
                mainFile: pkg.main || 'index.js'
              }
            } else if (deps.nestjs || deps['@nestjs/core']) {
              this.structure.backend = {
                type: 'nestjs',
                path: dir,
                framework: 'NestJS',
                port: 3000,
                mainFile: pkg.main || 'dist/main.js'
              }
            } else {
              this.structure.backend = {
                type: 'nodejs',
                path: dir,
                framework: 'Node.js',
                port: 3000,
                mainFile: pkg.main || 'index.js'
              }
            }
            return
          } catch (e) {
            console.error(`Error parsing ${dir}/package.json:`, e.message)
          }
        }
      }
    }
    
    // Check for Python backend
    for (const dir of backendDirs) {
      if (contents.includes(dir)) {
        const backendPath = path.join(this.projectPath, dir)
        const reqPath = path.join(backendPath, 'requirements.txt')
        const setupPath = path.join(backendPath, 'setup.py')
        
        if (fs.existsSync(reqPath) || fs.existsSync(setupPath)) {
          this.structure.backend = {
            type: 'python',
            path: dir,
            framework: 'Python (Flask/Django/FastAPI)',
            port: 5000,
            mainFile: 'app.py'
          }
          return
        }
      }
    }
  }

  /**
   * Detect database configuration
   */
  detectDatabase(contents) {
    const configPaths = [
      'docker-compose.yml',
      'docker-compose.yaml',
      '.env',
      '.env.example',
      'config/database.js',
      'config/db.js'
    ]
    
    for (const file of configPaths) {
      const filePath = path.join(this.projectPath, file)
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8')
          
          if (content.includes('postgres') || content.includes('postgresql')) {
            this.structure.database = { type: 'postgresql', port: 5432 }
          } else if (content.includes('mysql')) {
            this.structure.database = { type: 'mysql', port: 3306 }
          } else if (content.includes('mongo')) {
            this.structure.database = { type: 'mongodb', port: 27017 }
          } else if (content.includes('redis')) {
            this.structure.services.push({ type: 'redis', port: 6379 })
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Determine overall project type
   */
  determineProjectType() {
    if (this.structure.frontend && this.structure.backend) {
      this.structure.type = 'fullstack'
    } else if (this.structure.frontend) {
      this.structure.type = 'frontend'
    } else if (this.structure.backend) {
      this.structure.type = 'backend'
    } else {
      this.structure.type = 'other'
    }
  }

  /**
   * Safe version of readdirSync
   */
  readdirSync(dir) {
    try {
      return fs.readdirSync(dir)
    } catch (e) {
      console.error(`Cannot read directory ${dir}:`, e.message)
      return []
    }
  }
}

module.exports = ProjectDetector
