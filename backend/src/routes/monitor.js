const express = require('express')
const router = express.Router()
const { spawn } = require('child_process')
const protect = require('../middleware/authMiddleware')

router.use(protect)

router.get('/:id/logs', (req, res) => {
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

router.get('/:id/stats', (req, res) => {
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
