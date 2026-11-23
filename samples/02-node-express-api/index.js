const express = require('express')
const app = express()

const PORT = process.env.PORT || 3000
const APP_ENV = process.env.APP_ENV || 'production'
const CUSTOM_MESSAGE = process.env.CUSTOM_MESSAGE || 'Bienvenue sur Sarah Platform PaaS API'

app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: CUSTOM_MESSAGE,
    environment: APP_ENV,
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', cpu_usage: process.cpuUsage() })
})

app.listen(PORT, () => {
  console.log(`[SAMPLE API] Serveur Express à l'écoute sur le port ${PORT}`)
})
