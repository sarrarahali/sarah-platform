const pool = require('../db')

const getDeployments = async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      'SELECT * FROM deployments WHERE app_id = $1 ORDER BY created_at DESC',
      [id]
    )
    res.json({ deployments: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

module.exports = { getDeployments }
