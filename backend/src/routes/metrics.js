const express = require('express')
const router = express.Router()
const pool = require('../db')

// In-memory metrics storage
const httpRequestsTotal = {}
let requestDurations = []
const startTime = Date.now()

// Middleware to collect HTTP metrics
const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') return next()
  
  const start = process.hrtime()
  res.on('finish', () => {
    const duration = process.hrtime(start)
    const durationSeconds = duration[0] + duration[1] / 1e9
    
    // Normalize path to avoid high cardinality (e.g. /api/apps/12 -> /api/apps/:id)
    const route = req.baseUrl || req.path.replace(/\/\d+/g, '/:id')
    const key = `${req.method}_${route}_${res.statusCode}`
    
    httpRequestsTotal[key] = (httpRequestsTotal[key] || 0) + 1
    
    requestDurations.push(durationSeconds)
    if (requestDurations.length > 500) {
      requestDurations.shift()
    }
  })
  next()
}

// Prometheus scrape endpoint
router.get('/', async (req, res) => {
  try {
    const mem = process.memoryUsage()
    const cpu = process.cpuUsage()
    const uptime = (Date.now() - startTime) / 1000

    // Fetch DB counts safely
    let appsCount = 0
    let deploymentStats = []
    try {
      const appsRes = await pool.query('SELECT COUNT(*) AS count FROM apps')
      appsCount = parseInt(appsRes.rows[0]?.count || '0', 10)

      const depRes = await pool.query(
        'SELECT status, COUNT(*) AS count FROM deployments GROUP BY status'
      )
      deploymentStats = depRes.rows
    } catch (dbErr) {
      // If DB is busy or unreachable, keep defaults
    }

    // Calculate response time percentiles
    const sortedDurations = [...requestDurations].sort((a, b) => a - b)
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0
    const p90 = sortedDurations[Math.floor(sortedDurations.length * 0.9)] || 0
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0

    let output = ''

    // 1. Process metrics
    output += `# HELP paas_process_uptime_seconds Total seconds the PaaS API backend has been running\n`
    output += `# TYPE paas_process_uptime_seconds gauge\n`
    output += `paas_process_uptime_seconds ${uptime.toFixed(2)}\n\n`

    output += `# HELP paas_process_resident_memory_bytes Resident memory size in bytes\n`
    output += `# TYPE paas_process_resident_memory_bytes gauge\n`
    output += `paas_process_resident_memory_bytes ${mem.rss}\n\n`

    output += `# HELP paas_process_heap_used_bytes Heap memory used in bytes\n`
    output += `# TYPE paas_process_heap_used_bytes gauge\n`
    output += `paas_process_heap_used_bytes ${mem.heapUsed}\n\n`

    output += `# HELP paas_process_heap_total_bytes Heap memory total allocated in bytes\n`
    output += `# TYPE paas_process_heap_total_bytes gauge\n`
    output += `paas_process_heap_total_bytes ${mem.heapTotal}\n\n`

    output += `# HELP paas_process_cpu_user_seconds_total Total user CPU time spent in seconds\n`
    output += `# TYPE paas_process_cpu_user_seconds_total counter\n`
    output += `paas_process_cpu_user_seconds_total ${(cpu.user / 1e6).toFixed(4)}\n\n`

    output += `# HELP paas_process_cpu_system_seconds_total Total system CPU time spent in seconds\n`
    output += `# TYPE paas_process_cpu_system_seconds_total counter\n`
    output += `paas_process_cpu_system_seconds_total ${(cpu.system / 1e6).toFixed(4)}\n\n`

    // 2. PaaS Business metrics
    output += `# HELP paas_apps_total Total number of applications created on the platform\n`
    output += `# TYPE paas_apps_total gauge\n`
    output += `paas_apps_total ${appsCount}\n\n`

    output += `# HELP paas_deployments_total Total deployments registered by status\n`
    output += `# TYPE paas_deployments_total counter\n`
    if (deploymentStats.length === 0) {
      output += `paas_deployments_total{status="none"} 0\n`
    } else {
      deploymentStats.forEach(d => {
        output += `paas_deployments_total{status="${d.status}"} ${d.count}\n`
      })
    }
    output += `\n`

    // 3. HTTP Request metrics
    output += `# HELP paas_http_requests_total Total number of HTTP requests processed by the API\n`
    output += `# TYPE paas_http_requests_total counter\n`
    const requestKeys = Object.keys(httpRequestsTotal)
    if (requestKeys.length === 0) {
      output += `paas_http_requests_total{method="GET",route="/",status="200"} 1\n`
    } else {
      requestKeys.forEach(k => {
        const [method, route, status] = k.split('_')
        output += `paas_http_requests_total{method="${method}",route="${route}",status="${status}"} ${httpRequestsTotal[k]}\n`
      })
    }
    output += `\n`

    // 4. Latency summary
    output += `# HELP paas_http_request_duration_seconds Response latency percentiles in seconds\n`
    output += `# TYPE paas_http_request_duration_seconds summary\n`
    output += `paas_http_request_duration_seconds{quantile="0.5"} ${p50.toFixed(4)}\n`
    output += `paas_http_request_duration_seconds{quantile="0.9"} ${p90.toFixed(4)}\n`
    output += `paas_http_request_duration_seconds{quantile="0.99"} ${p99.toFixed(4)}\n`

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.send(output)
  } catch (err) {
    res.status(500).send(`# ERROR: ${err.message}\n`)
  }
})

module.exports = {
  router,
  metricsMiddleware
}
