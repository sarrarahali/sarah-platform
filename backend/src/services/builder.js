const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const AdmZip = require('adm-zip')

const buildApp = async (sourcePath, appName, isDir = false) => {
  const buildId = crypto.randomUUID()
  const buildDir = isDir ? sourcePath : path.join(__dirname, '../../builds', buildId)

  console.log(`[BUILD] Starting build for ${appName}`)

  if (!isDir) {
    fs.mkdirSync(buildDir, { recursive: true })
    const zip = new AdmZip(sourcePath)
    zip.extractAllTo(buildDir, true)
    console.log(`[BUILD] ZIP extracted to ${buildDir}`)

    const extracted = fs.readdirSync(buildDir)
    if (extracted.length === 1 && fs.statSync(path.join(buildDir, extracted[0])).isDirectory()) {
      const innerDir = path.join(buildDir, extracted[0])
      const innerFiles = fs.readdirSync(innerDir)
      innerFiles.forEach(f => {
        fs.renameSync(path.join(innerDir, f), path.join(buildDir, f))
      })
      fs.rmdirSync(innerDir)
      console.log(`[BUILD] Flattened root directory`)
    }
  } else {
    console.log(`[BUILD] Using cloned directory: ${buildDir}`)
  }

  const files = fs.readdirSync(buildDir)
  const imageName = `sarah-${appName}:latest`
  let exposePort = 3000

  // ─── 1. Docker Compose ───────────────────────────────────────────────────
  const composeFile = files.find(f => f === 'docker-compose.yml' || f === 'docker-compose.yaml')
  if (composeFile) {
    console.log(`[BUILD] Docker Compose detected: ${composeFile}`)

    try {
      const composeContent = fs.readFileSync(path.join(buildDir, composeFile), 'utf8')
      const portMatch = composeContent.match(/["']?(\d+)["']?:\d+/)
      if (portMatch) {
        exposePort = parseInt(portMatch[1])
        console.log(`[BUILD] Port detected from docker-compose: ${exposePort}`)
      }
    } catch (e) {}

    execSync(`docker-compose build`, { stdio: 'inherit', cwd: buildDir })
    execSync(`docker-compose up -d`, {
      stdio: 'inherit',
      cwd: buildDir,
      env: { ...process.env, COMPOSE_PROJECT_NAME: `sarah-${appName}` }
    })

    console.log(`[BUILD] Docker Compose started successfully`)
    return { imageName: `compose-${appName}`, buildDir, buildId, exposePort, projectType: 'compose', isCompose: true }
  }

  // ─── 2. Existing Dockerfile ───────────────────────────────────────────────
  if (files.includes('Dockerfile')) {
    console.log(`[BUILD] Existing Dockerfile detected`)
    try {
      const content = fs.readFileSync(path.join(buildDir, 'Dockerfile'), 'utf8')
      const match = content.match(/EXPOSE\s+(\d+)/i)
      if (match) {
        exposePort = parseInt(match[1])
        console.log(`[BUILD] Port detected from Dockerfile: ${exposePort}`)
      }
    } catch (e) {}

    execSync(`docker build -t ${imageName} ${buildDir}`, { stdio: 'inherit' })
    console.log(`[BUILD] Docker build successful: ${imageName}`)
    return { imageName, buildDir, buildId, exposePort, projectType: 'docker' }
  }

  // ─── 3. Nixpacks ─────────────────────────────────────────────────────────
  try {
    console.log(`[BUILD] Attempting Nixpacks build...`)
    execSync(
      `nixpacks build ${buildDir} --name ${imageName} --no-cache`,
      { stdio: 'inherit', env: { ...process.env, DOCKER_BUILDKIT: '0' } }
    )
    console.log(`[BUILD] Nixpacks build successful: ${imageName}`)

    try {
      const plan = execSync(`nixpacks plan ${buildDir}`, { encoding: 'utf8' })
      const portMatch = plan.match(/"port":\s*"?(\d+)"?/)
      if (portMatch) {
        exposePort = parseInt(portMatch[1])
        console.log(`[BUILD] Port detected from Nixpacks: ${exposePort}`)
      }
    } catch (e) {}

    return { imageName, buildDir, buildId, exposePort, projectType: 'nixpacks' }

  } catch (nixpacksError) {
    console.log(`[BUILD] Nixpacks failed, generating Dockerfile...`)
  }

  // ─── 4. Auto-generate Dockerfile ─────────────────────────────────────────
  console.log(`[BUILD] Generating Dockerfile automatically`)
  let dockerfile = ''

  const hasFrontend = files.includes('frontend') && fs.statSync(path.join(buildDir, 'frontend')).isDirectory()
  const hasBackend = files.includes('backend') && fs.statSync(path.join(buildDir, 'backend')).isDirectory()

  if (hasFrontend && hasBackend) {
    console.log(`[BUILD] Full-stack project detected (frontend + backend)`)

    let frontendDist = 'dist'
    let backendMain = 'index.js'

    if (fs.existsSync(path.join(buildDir, 'frontend', 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(buildDir, 'frontend', 'package.json'), 'utf8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps['react-scripts']) frontendDist = 'build'
    }

    if (fs.existsSync(path.join(buildDir, 'backend', 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(buildDir, 'backend', 'package.json'), 'utf8'))
      backendMain = pkg.main || 'index.js'
    }

    dockerfile = `FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production --legacy-peer-deps
COPY backend/ .
COPY --from=frontend-builder /frontend/${frontendDist} ./public
EXPOSE 3000
CMD ["node", "${backendMain}"]
`
    exposePort = 3000

  } else if (files.includes('index.html')) {
    console.log(`[BUILD] Static HTML project detected`)
    dockerfile = `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`
    exposePort = 80

  } else if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(buildDir, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const mainFile = pkg.main || 'index.js'

    if (deps['next']) {
      dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`
    } else if (deps['vite'] || deps['react-scripts']) {
      const dist = deps['react-scripts'] ? 'build' : 'dist'
      dockerfile = `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/${dist} /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`
      exposePort = 80
    } else {
      dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production --legacy-peer-deps
COPY . .
EXPOSE 3000
CMD ["node", "${mainFile}"]
`
    }

  } else if (files.includes('requirements.txt')) {
    const req = fs.readFileSync(path.join(buildDir, 'requirements.txt'), 'utf8')
    if (req.includes('django')) {
      dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
`
      exposePort = 8000
    } else if (req.includes('fastapi')) {
      dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`
      exposePort = 8000
    } else {
      dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
`
      exposePort = 5000
    }

  } else {
    dockerfile = `FROM nginx:alpine
WORKDIR /app
COPY . .
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`
    exposePort = 80
  }

  fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfile)
  execSync(`docker build -t ${imageName} ${buildDir}`, { stdio: 'inherit' })
  console.log(`[BUILD] Docker build successful: ${imageName}`)

  return { imageName, buildDir, buildId, exposePort, projectType: 'docker-generated' }
}

module.exports = { buildApp }