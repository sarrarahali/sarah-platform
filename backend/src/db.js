const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

// Auto-ensure required tables and columns exist
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS apps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'created',
        url VARCHAR(255),
        port INTEGER,
        structure JSONB,
        env_vars JSONB DEFAULT '{}'::jsonb,
        git_repo VARCHAR(500),
        last_build_id UUID,
        deployment_config JSONB DEFAULT '{}'::jsonb,
        health_status VARCHAR(50) DEFAULT 'unknown',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'building',
        image_name VARCHAR(255),
        build_id UUID,
        build_type VARCHAR(50) DEFAULT 'zip',
        source TEXT,
        metadata JSONB,
        error TEXT,
        logs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE apps ADD COLUMN IF NOT EXISTS env_vars JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE apps ADD COLUMN IF NOT EXISTS structure JSONB;
    `)
    console.log('[DB] Schéma PostgreSQL initialisé avec succès.')
  } catch (e) {
    console.warn('[DB] Init Warning:', e.message)
  }
}
initDb()

module.exports = pool
