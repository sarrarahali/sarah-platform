const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const detectDatabase = (buildDir) => {
  const files = fs.readdirSync(buildDir)

  if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(buildDir, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps['mysql'] || deps['mysql2'] || deps['knex']) return 'mysql'
    if (deps['pg'] || deps['postgres']) return 'postgres'
    if (deps['mongoose'] || deps['mongodb']) return 'mongodb'
  }

  if (files.includes('requirements.txt')) {
    const req = fs.readFileSync(path.join(buildDir, 'requirements.txt'), 'utf8')
    if (req.includes('mysqlclient') || req.includes('PyMySQL')) return 'mysql'
    if (req.includes('psycopg2') || req.includes('asyncpg')) return 'postgres'
    if (req.includes('pymongo') || req.includes('motor')) return 'mongodb'
  }

  return null
}

const startDatabase = (dbType, appId) => {
  const networkName = `sarah-network-${appId}`
  const dbContainerName = `sarah-db-${appId}`

  try {
    execSync(`docker network create ${networkName}`, { stdio: 'ignore' })
    console.log(`[DB] Réseau Docker créé: ${networkName}`)
  } catch (e) {}

  try {
    execSync(`docker rm -f ${dbContainerName}`, { stdio: 'ignore' })
  } catch (e) {}

  let dbEnv = {}

  switch (dbType) {
    case 'mysql':
      console.log(`[DB] Lancement MySQL pour app-${appId}`)
      execSync(`docker run -d \
        --name ${dbContainerName} \
        --network ${networkName} \
        -e MYSQL_ROOT_PASSWORD=sarah123 \
        -e MYSQL_DATABASE=appdb \
        -e MYSQL_USER=sarah \
        -e MYSQL_PASSWORD=sarah123 \
        mysql:8`, { stdio: 'inherit' })

      dbEnv = {
        DATABASE_HOST: dbContainerName,
        DATABASE_PORT: '3306',
        DATABASE_NAME: 'appdb',
        DATABASE_USERNAME: 'sarah',
        DATABASE_PASSWORD: 'sarah123',
        DATABASE_CLIENT: 'mysql',
        DB_HOST: dbContainerName,
        DB_PORT: '3306',
        DB_NAME: 'appdb',
        DB_USER: 'sarah',
        DB_PASSWORD: 'sarah123',
        MYSQL_HOST: dbContainerName,
        MYSQL_PORT: '3306',
        MYSQL_DATABASE: 'appdb',
        MYSQL_USER: 'sarah',
        MYSQL_PASSWORD: 'sarah123'
      }
      break

    case 'postgres':
      console.log(`[DB] Lancement PostgreSQL pour app-${appId}`)
      execSync(`docker run -d \
        --name ${dbContainerName} \
        --network ${networkName} \
        -e POSTGRES_DB=appdb \
        -e POSTGRES_USER=sarah \
        -e POSTGRES_PASSWORD=sarah123 \
        postgres:15`, { stdio: 'inherit' })

      dbEnv = {
        DATABASE_URL: `postgresql://sarah:sarah123@${dbContainerName}:5432/appdb`,
        DATABASE_HOST: dbContainerName,
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'appdb',
        DATABASE_USERNAME: 'sarah',
        DATABASE_PASSWORD: 'sarah123',
        PGHOST: dbContainerName,
        PGPORT: '5432',
        PGDATABASE: 'appdb',
        PGUSER: 'sarah',
        PGPASSWORD: 'sarah123'
      }
      break

    case 'mongodb':
      console.log(`[DB] Lancement MongoDB pour app-${appId}`)
      execSync(`docker run -d \
        --name ${dbContainerName} \
        --network ${networkName} \
        -e MONGO_INITDB_ROOT_USERNAME=sarah \
        -e MONGO_INITDB_ROOT_PASSWORD=sarah123 \
        -e MONGO_INITDB_DATABASE=appdb \
        mongo:6`, { stdio: 'inherit' })

      dbEnv = {
        MONGODB_URI: `mongodb://sarah:sarah123@${dbContainerName}:27017/appdb`,
        MONGO_URI: `mongodb://sarah:sarah123@${dbContainerName}:27017/appdb`,
        DATABASE_URL: `mongodb://sarah:sarah123@${dbContainerName}:27017/appdb`
      }
      break
  }

  console.log(`[DB] Attente démarrage de la base de données...`)
  execSync('sleep 10')

  return { dbEnv, networkName, dbContainerName }
}

module.exports = { detectDatabase, startDatabase }
