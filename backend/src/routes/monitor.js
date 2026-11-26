const express = require('express')
const router = express.Router()
const { spawn } = require('child_process')
const protect = require('../middleware/authMiddleware')

// Recent alerts cache
const receivedAlerts = []

// Webhook endpoint for Prometheus Alertmanager (no auth needed so Alertmanager can POST)
router.post('/alerts', (req, res) => {
  const alertData = req.body
  const timestamp = new Date().toISOString()
  
  if (alertData.alerts && Array.isArray(alertData.alerts)) {
    alertData.alerts.forEach(a => {
      receivedAlerts.unshift({
        receivedAt: timestamp,
        status: a.status,
        alertname: a.labels?.alertname,
        severity: a.labels?.severity,
        summary: a.annotations?.summary,
        description: a.annotations?.description
      })
    })
  } else {
    receivedAlerts.unshift({ receivedAt: timestamp, raw: alertData })
  }

  // Keep last 50 alerts
  if (receivedAlerts.length > 50) receivedAlerts.length = 50

  console.log(`[ALERTMANAGER WEBHOOK] Received ${alertData.alerts?.length || 1} alert(s)`)
  res.status(200).json({ status: 'ok', received: receivedAlerts.length })
})

// Public or dashboard route to read alerts
router.get('/alerts', (req, res) => {
  res.json({
    count: receivedAlerts.length,
    alerts: receivedAlerts
  })
})

// Protected container logs and stats
router.get('/:id/logs', protect, (req, res) => {
  const containerName = `sarah-container-${req.params.id}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const logs = spawn('docker', ['logs', '-f', '--tail', '50', containerName])

  logs.stdout.on('data', (data) => {
    res.write(`data: ${data.toString()}\n\n`)
  })

  logs.stderr.on('data', (data) => {
    res.write(`data: ${data.toString()}\n\n`)
  })

  req.on('close', () => {
    logs.kill()
  })
})

router.get('/:id/stats', protect, (req, res) => {
  const containerName = `sarah-container-${req.params.id}`
  const { execSync } = require('child_process')

  try {
    const stats = execSync(
      `docker stats ${containerName} --no-stream --format "{{.CPUPerc}} {{.MemUsage}}"`
    ).toString().trim()

    const [cpu, mem] = stats.split(' ')
    res.json({ cpu, memory: mem })
  } catch (err) {
    res.status(500).json({ error: 'Conteneur non trouvé' })
  }
})

module.exports = router
