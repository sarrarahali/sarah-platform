const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const appRoutes = require('./routes/apps')
const monitorRoutes = require('./routes/monitor')
const deploymentRoutes = require('./routes/deployments')
const { router: metricsRoutes, metricsMiddleware } = require('./routes/metrics')

const app = express()
app.use(cors())
app.use(express.json())
app.use(metricsMiddleware)

app.use('/api/auth', authRoutes)
app.use('/api/apps', appRoutes)
app.use('/api/monitor', monitorRoutes)
app.use('/api/deployments', deploymentRoutes)
app.use('/metrics', metricsRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'NexusDeploy API is running', platform: 'NexusDeploy', version: '2.0.0', status: 'healthy' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
