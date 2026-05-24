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

const getFriendlyError = (rawError) => {
  if (!rawError) return 'Erreur inconnue lors du deploiement.'
  if (rawError.includes('Type error') || rawError.includes('TypeScript')) {
    return 'Erreur TypeScript dans le code source. Le projet contient des erreurs de types qui empechent la compilation.'
  }
  if (rawError.includes('npm install') || rawError.includes('ERESOLVE')) {
    return 'Erreur lors de l installation des dependances npm. Verifiez le fichier package.json.'
  }
  if (rawError.includes('Cannot find module')) {
    return 'Module introuvable. Le projet reference un module qui n existe pas.'
  }
  if (rawError.includes('ENOENT') || rawError.includes('No such file')) {
    return 'Fichier introuvable. Le projet reference un fichier qui n existe pas.'
  }
  if (rawError.includes('permission denied')) {
    return 'Permission refusee. Probleme de droits d acces Docker.'
  }
  if (rawError.includes('port is already')) {
    return 'Le port est deja utilise. Reessayez dans quelques secondes.'
  }
  if (rawError.includes('npm run build') || rawError.includes('build failed') || rawError.includes('exit code: 1')) {
    return 'Erreur lors du build du projet. Le code source contient des erreurs de compilation.'
  }
  if (rawError.includes('docker build')) {
    return 'Erreur lors de la construction de l image Docker. Verifiez la compatibilite du projet.'
  }
  if (rawError.includes('syntax') || rawError.includes('SyntaxError')) {
    return 'Erreur de syntaxe dans le code source du projet.'
  }
  if (rawError.includes('authentication') || rawError.includes('Repository inaccessible')) {
    return 'Repository GitHub inaccessible. Verifiez que le repo est public.'
  }
  if (rawError.includes('utf-8') || rawError.includes('UTF-8')) {
    return 'Le projet contient des fichiers binaires non supportes par Nixpacks. Build Docker utilise a la place.'
  }
  return 'Echec du deploiement. Verifiez que le projet est compatible et ne contient pas d erreurs.'
}

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

    if (result.isCompose) {
      await pool.query(
        'UPDATE apps SET url = $1, port = $2, status = $3 WHERE id = $4',
        [`http://localhost:${exposePort}`, exposePort, 'running', id]
      )
      await pool.query(
        'UPDATE deployments SET status = $1, image_name = $2 WHERE id = $3',
        ['success', result.imageName, deploymentId]
      )
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
    const friendlyError = getFriendlyError(err.message)
    await pool.query(
      'UPDATE deployments SET status = $1, logs = $2 WHERE id = $3',
      ['failed', friendlyError, deploymentId]
    )
    await pool.query(
      'UPDATE apps SET status = $1 WHERE id = $2',
      ['failed', id]
    )
    console.error('[ERROR]', err.message)
  }
})

router.post('/:id/git', async (req, res) => {
  const { repoUrl } = req.body
  if (!repoUrl) return res.status(400).json({ error: 'URL du repo manquante' })

  const { id } = req.params
  const appName = `app-${id}`

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

    if (result.isCompose) {
      await pool.query(
        'UPDATE apps SET url = $1, port = $2, status = $3 WHERE id = $4',
        [`http://localhost:${exposePort}`, exposePort, 'running', id]
      )
      await pool.query(
        'UPDATE deployments SET status = $1, image_name = $2 WHERE id = $3',
        ['success', result.imageName, deploymentId]
      )
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
    const friendlyError = getFriendlyError(err.message)
    await pool.query(
      'UPDATE deployments SET status = $1, logs = $2 WHERE id = $3',
      ['failed', friendlyError, deploymentId]
    )
    await pool.query(
      'UPDATE apps SET status = $1 WHERE id = $2',
      ['failed', id]
    )
    console.error('[GIT ERROR]', err.message)
  }
})

module.exports = router