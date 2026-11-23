const { execSync } = require('child_process')
const pool = require('../db')

const deployApp = async (imageName, appId, exposePort = 3000, dbEnv = {}, networkName = null) => {
  const containerName = `sarah-container-${appId}`

  console.log(`[DEPLOY] Lancement conteneur ${containerName}`)

  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' })
  } catch (e) {}

  // Fetch custom env vars for this app
  let customEnv = {}
  try {
    const res = await pool.query('SELECT env_vars FROM apps WHERE id = $1', [appId])
    if (res.rows[0] && res.rows[0].env_vars) {
      customEnv = typeof res.rows[0].env_vars === 'string'
        ? JSON.parse(res.rows[0].env_vars)
        : res.rows[0].env_vars
    }
  } catch (err) {
    console.warn(`[DEPLOY] Could not fetch custom env vars: ${err.message}`)
  }

  const mergedEnv = { ...dbEnv, ...customEnv }

  const envVars = Object.entries(mergedEnv)
    .filter(([k]) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k))
    .map(([key, value]) => `-e ${key}="${String(value).replace(/"/g, '\\"')}"`)
    .join(' ')

  const networkFlag = networkName ? `--network ${networkName}` : ''

  let port = Math.floor(Math.random() * 2000) + 4000
  let launched = false

  for (let i = 0; i < 10; i++) {
    try {
      execSync(
        `docker run -d --name ${containerName} -p ${port}:${exposePort} --restart unless-stopped ${networkFlag} -e PORT=${exposePort} ${envVars} ${imageName}`,
        { stdio: 'inherit' }
      )
      launched = true
      break
    } catch (e) {
      if (e.message.includes('already allocated') || e.message.includes('address already in use')) {
        port = Math.floor(Math.random() * 2000) + 4000
        console.log(`[DEPLOY] Port busy, trying port ${port}`)
      } else {
        throw e
      }
    }
  }

  if (!launched) throw new Error('No available port found')

  const url = `http://localhost:${port}`
  console.log(`[DEPLOY] Application disponible sur ${url}`)

  await pool.query(
    'UPDATE apps SET status = $1 WHERE id = $2',
    ['running', appId]
  )

  return { url, port, containerName }
}

module.exports = { deployApp }