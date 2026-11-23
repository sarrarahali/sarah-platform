const pool = require('../db')
const { execSync } = require('child_process')

const createApp = async (req, res) => {
  const { name } = req.body
  const userId = req.user.id
  try {
    const result = await pool.query(
      'INSERT INTO apps (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, userId]
    )
    res.status(201).json({ app: result.rows[0] })
  } catch (err) {
    res.status(400).json({ error: 'Nom déjà utilisé ou invalide' })
  }
}

const getApps = async (req, res) => {
  const userId = req.user.id
  try {
    const result = await pool.query(
      'SELECT * FROM apps WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    res.json({ apps: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

const getAppById = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    const result = await pool.query(
      'SELECT * FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }
    res.json({ app: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

const deleteApp = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    // 1. Verify app exists and belongs to user
    const appResult = await pool.query(
      'SELECT * FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }

    // 2. Stop and remove Docker containers
    try {
      execSync(`docker rm -f sarah-container-${id}`, { stdio: 'ignore' })
    } catch (e) {}

    try {
      execSync(`docker rm -f sarah-db-${id}`, { stdio: 'ignore' })
    } catch (e) {}

    // 3. Delete database records
    await pool.query('DELETE FROM deployments WHERE app_id = $1', [id])
    await pool.query('DELETE FROM apps WHERE id = $1 AND user_id = $2', [id, userId])

    res.json({ message: 'Application et conteneurs supprimés avec succès' })
  } catch (err) {
    console.error('[DELETE APP ERROR]', err.message)
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' })
  }
}

const stopApp = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    const check = await pool.query(
      'SELECT * FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }

    const containerName = `sarah-container-${id}`
    try {
      execSync(`docker stop ${containerName}`, { stdio: 'ignore' })
    } catch (e) {
      console.warn(`[STOP] Warning: ${e.message}`)
    }

    await pool.query('UPDATE apps SET status = $1 WHERE id = $2', ['stopped', id])
    res.json({ message: 'Application arrêtée', status: 'stopped' })
  } catch (err) {
    console.error('[STOP APP ERROR]', err.message)
    res.status(500).json({ error: 'Erreur lors de l arrêt de l application' })
  }
}

const startApp = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    const check = await pool.query(
      'SELECT * FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }

    const containerName = `sarah-container-${id}`
    try {
      execSync(`docker start ${containerName}`, { stdio: 'ignore' })
    } catch (e) {
      return res.status(400).json({
        error: 'Impossible de redémarrer le conteneur. Il a peut-être été supprimé ou doit être redéployé.'
      })
    }

    await pool.query('UPDATE apps SET status = $1 WHERE id = $2', ['running', id])
    res.json({ message: 'Application démarrée', status: 'running' })
  } catch (err) {
    console.error('[START APP ERROR]', err.message)
    res.status(500).json({ error: 'Erreur lors du démarrage' })
  }
}

const restartApp = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    const check = await pool.query(
      'SELECT * FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }

    const containerName = `sarah-container-${id}`
    try {
      execSync(`docker restart ${containerName}`, { stdio: 'ignore' })
    } catch (e) {
      return res.status(400).json({
        error: 'Impossible de redémarrer le conteneur. Relancez un déploiement.'
      })
    }

    await pool.query('UPDATE apps SET status = $1 WHERE id = $2', ['running', id])
    res.json({ message: 'Application redémarrée', status: 'running' })
  } catch (err) {
    console.error('[RESTART APP ERROR]', err.message)
    res.status(500).json({ error: 'Erreur lors du redémarrage' })
  }
}

const getAppEnv = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    const result = await pool.query(
      'SELECT env_vars FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }
    const envVars = result.rows[0].env_vars || {}
    res.json({ env: envVars })
  } catch (err) {
    console.error('[GET APP ENV ERROR]', err.message)
    res.status(500).json({ error: 'Erreur lors de la récupération des variables d environnement' })
  }
}

const updateAppEnv = async (req, res) => {
  const { id } = req.params
  const { env } = req.body
  const userId = req.user.id
  try {
    const result = await pool.query(
      'UPDATE apps SET env_vars = $1 WHERE id = $2 AND user_id = $3 RETURNING env_vars',
      [JSON.stringify(env || {}), id, userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application introuvable' })
    }
    res.json({ message: 'Variables d environnement enregistrées', env: result.rows[0].env_vars })
  } catch (err) {
    console.error('[UPDATE APP ENV ERROR]', err.message)
    res.status(500).json({ error: 'Erreur lors de l enregistrement des variables d environnement' })
  }
}

module.exports = {
  createApp,
  getApps,
  getAppById,
  deleteApp,
  stopApp,
  startApp,
  restartApp,
  getAppEnv,
  updateAppEnv
}
