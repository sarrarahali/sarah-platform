const express = require('express')
const router = express.Router()
const { createApp, getApps, deleteApp } = require('../controllers/appController')
const protect = require('../middleware/authMiddleware')
const upload = require('../middleware/upload')
const { buildApp } = require('../services/builder')
const { deployApp } = require('../services/deployer')
const { cloneRepo } = require('../services/gitCloner')
const { detectDatabase, startDatabase } = require('../services/dbManager')
const pool = require('../db')

router.use(protect)

router.post('/', createApp)
router.get('/', getApps)
router.delete('/:id', deleteApp)

router.post('/:id/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu' })

  const { id } = req.params
  const appName = `app-${id}`

  res.json({ message: 'Upload recu, build et deploiement en cours...' })

  const deployment = await pool.query(
    'INSERT INTO deployments (app_id, status) VALUES ($1, $2) RETURNING *',
    [id, 'building']
  )
  const deploymentId = deployment.rows[0].id

  try {
    const result = await buildApp(req.file.path, appName)
    const { imageName, exposePort, buildDir } = result

    // Handle Docker Compose projects
    if (result.isCompose) {
      await pool.query(
        'UPDATE apps SET url = $1, port = $2, status = $3 WHERE id = $4',
        [`http://localhost:${exposePort}`, exposePort, 'running', id]
      )
      await pool.query(
        'UPDATE deployments SET status = $1, image_name = $2 WHERE id = $3',
        ['success', result.imageName, deploymentId]
      )
      console.log(`[DEPLOY] Compose app available at http://localhost:${exposePort}`)
      return
    }

    let dbEnv = {}
    let networkName = null

    const dbType = detectDatabase(buildDir)
    if (dbType) {
      console.log(`[DB] Base de données détectée: ${dbType}`)
      const dbResult = startDatabase(dbType, id)
      dbEnv = dbResult.dbEnv
      networkName = dbResult.networkName
    }

    const { url, port } = await deployApp(imageName, id, exposePort, dbEnv, networkName)

    await pool.query(
      'UPDATE apps SET url = $1, port = $2 WHERE id = $3',
      [url, port, id]
    )

    await pool.query(
      'UPDATE deployments SET status = $1, image_name = $2 WHERE id = $3',
      ['success', imageName, deploymentId]
    )

    console.log(`[DEPLOY] App ${appName} disponible sur ${url}`)
  } catch (err) {
    await pool.query(
      'UPDATE deployments SET status = $1 WHERE id = $2',
      ['failed', deploymentId]
    )
    console.error('[ERROR]', err.message)
  }
})

router.post('/:id/git', async (req, res) => {
  const { repoUrl } = req.body
  if (!repoUrl) return res.status(400).json({ error: 'URL du repo manquante' })

  const { id } = req.params
  const appName = `app-${id}`

  // Check if repo is accessible
  try {
    const { execSync } = require('child_process')
    execSync(`git ls-remote ${repoUrl}`, { stdio: 'pipe', timeout: 10000 })
  } catch (e) {
    return res.status(400).json({ error: 'Repository inaccessible. Verifiez que le repo est public et que l URL est correcte.' })
  }

  res.json({ message: 'Clone git en cours, build et deploiement...' })

  const deployment = await pool.query(
    'INSERT INTO deployments (app_id, status) VALUES ($1, $2) RETURNING *',
    [id, 'building']
  )
  const deploymentId = deployment.rows[0].id

  try {
    const { cloneDir } = await cloneRepo(repoUrl)
    const result = await buildApp(cloneDir, appName, true)
    const { imageName, exposePort, buildDir } = result

    // Handle Docker Compose projects
    if (result.isCompose) {
      await pool.query(
        'UPDATE apps SET url = $1, port = $2, status = $3 WHERE id = $4',
        [`http://localhost:${exposePort}`, exposePort, 'running', id]
      )
      await pool.query(
        'UPDATE deployments SET status = $1, image_name = $2 WHERE id = $3',
        ['success', result.imageName, deploymentId]
      )
      console.log(`[DEPLOY] Compose app available at http://localhost:${exposePort}`)
      return
    }

    let dbEnv = {}
    let networkName = null

    const dbType = detectDatabase(buildDir)
    if (dbType) {
      console.log(`[DB] Base de données détectée: ${dbType}`)
      const dbResult = startDatabase(dbType, id)
      dbEnv = dbResult.dbEnv
      networkName = dbResult.networkName
    }

    const { url, port } = await deployApp(imageName, id, exposePort, dbEnv, networkName)

    await pool.query(
      'UPDATE apps SET url = $1, port = $2 WHERE id = $3',
      [url, port, id]
    )

    await pool.query(
      'UPDATE deployments SET status = $1, image_name = $2 WHERE id = $3',
      ['success', imageName, deploymentId]
    )

    console.log(`[DEPLOY] App ${appName} disponible sur ${url}`)
  } catch (err) {
    await pool.query(
      'UPDATE deployments SET status = $1 WHERE id = $2',
      ['failed', deploymentId]
    )
    await pool.query(
      'UPDATE apps SET status = $1 WHERE id = $2',
      ['failed', id]
    )
    console.error('[GIT ERROR]', err.message)
  }
})

module.exports = router