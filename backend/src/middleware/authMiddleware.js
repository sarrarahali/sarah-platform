const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_sarah_platform_2026'

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization
  let token = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (req.query && req.query.token) {
    token = req.query.token
  }

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' })
  }
}

module.exports = protect
