const pool = require('../db')

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

const deleteApp = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  try {
    await pool.query(
      'DELETE FROM apps WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    res.json({ message: 'Application supprimée' })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

module.exports = { createApp, getApps, deleteApp }
