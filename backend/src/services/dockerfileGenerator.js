const fs = require('fs')
const path = require('path')

/**
 * Generate optimized, multi-stage Dockerfiles for different tech stacks
 */
const generateNodejsDockerfile = (pkg, mainFile = 'index.js', isProduction = true) => {
  if (isProduction) {
    return `# Multi-stage build for Node.js
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build if needed (e.g., TypeScript, bundling)
RUN npm run build --if-present

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app . 
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error()})"
CMD ["node", "${mainFile}"]
`
  }
  return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error()})" || exit 1
CMD ["node", "${mainFile}"]
`
}

const generateReactDockerfile = (isProduction = true) => {
  if (isProduction) {
    return `# Multi-stage build for React
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost || exit 1
CMD ["nginx", "-g", "daemon off;"]
`
  }
  return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
`
}

const generateVueDockerfile = (isProduction = true) => {
  if (isProduction) {
    return `# Multi-stage build for Vue
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost || exit 1
CMD ["nginx", "-g", "daemon off;"]
`
  }
  return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
`
}

const generateNextjsDockerfile = (isProduction = true) => {
  return `FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error()})" || exit 1
CMD ["node", "server.js"]
`
}

const generatePythonDockerfile = (hasRequirements = true, isProduction = true) => {
  if (hasRequirements) {
    return `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD python -c "import requests; requests.get('http://localhost:5000', timeout=2).raise_for_status()" || exit 1
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0"]
`
  }
  return `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -e .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD python -c "import requests; requests.get('http://localhost:5000', timeout=2).raise_for_status()" || exit 1
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0"]
`
}

const generateStaticDockerfile = (indexPath = 'index.html') => {
  return `FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost || exit 1
CMD ["nginx", "-g", "daemon off;"]
`
}

const generateNginxConf = () => {
  return `server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`
}

module.exports = {
  generateNodejsDockerfile,
  generateReactDockerfile,
  generateVueDockerfile,
  generateNextjsDockerfile,
  generatePythonDockerfile,
  generateStaticDockerfile,
  generateNginxConf
}
