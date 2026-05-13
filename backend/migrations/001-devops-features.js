/**
 * Database migrations for enhanced DevOps features
 * Run this script to update your database schema
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

/**
 * Migration 001: Add DevOps features to deployments table
 */
async function migration001() {
  const client = await pool.connect()
  
  try {
    console.log('Running migration 001: Adding DevOps features...')
    
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='deployments' AND column_name='build_id'
    `
    const result = await client.query(checkQuery)
    
    if (result.rows.length > 0) {
      console.log('Migration 001 already applied. Skipping...')
      return
    }
    
    // Add columns for build tracking
    await client.query(`
      ALTER TABLE deployments
      ADD COLUMN IF NOT EXISTS build_id UUID,
      ADD COLUMN IF NOT EXISTS build_type VARCHAR(50) DEFAULT 'zip',
      ADD COLUMN IF NOT EXISTS source TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB,
      ADD COLUMN IF NOT EXISTS error TEXT,
      ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb
    `)
    
    console.log('✓ Migration 001 completed successfully')
    
  } catch (error) {
    console.error('✗ Migration 001 failed:', error.message)
    throw error
  } finally {
    await client.release()
  }
}

/**
 * Migration 002: Add DevOps features to apps table
 */
async function migration002() {
  const client = await pool.connect()
  
  try {
    console.log('Running migration 002: Adding app structure tracking...')
    
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='apps' AND column_name='structure'
    `
    const result = await client.query(checkQuery)
    
    if (result.rows.length > 0) {
      console.log('Migration 002 already applied. Skipping...')
      return
    }
    
    // Add columns for app structure tracking
    await client.query(`
      ALTER TABLE apps
      ADD COLUMN IF NOT EXISTS structure JSONB,
      ADD COLUMN IF NOT EXISTS git_repo VARCHAR(500),
      ADD COLUMN IF NOT EXISTS last_build_id UUID,
      ADD COLUMN IF NOT EXISTS deployment_config JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS health_status VARCHAR(50) DEFAULT 'unknown'
    `)
    
    console.log('✓ Migration 002 completed successfully')
    
  } catch (error) {
    console.error('✗ Migration 002 failed:', error.message)
    throw error
  } finally {
    await client.release()
  }
}

/**
 * Migration 003: Create deployments_logs table for detailed logging
 */
async function migration003() {
  const client = await pool.connect()
  
  try {
    console.log('Running migration 003: Creating deployment logs table...')
    
    // Check if table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'deployment_logs'
      )
    `
    const result = await client.query(checkQuery)
    
    if (result.rows[0].exists) {
      console.log('Migration 003 already applied. Skipping...')
      return
    }
    
    // Create deployment_logs table
    await client.query(`
      CREATE TABLE deployment_logs (
        id SERIAL PRIMARY KEY,
        deployment_id INTEGER NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
        level VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes
    await client.query(`CREATE INDEX idx_deployment_id ON deployment_logs(deployment_id)`)
    await client.query(`CREATE INDEX idx_created_at ON deployment_logs(created_at)`)
    
    console.log('✓ Migration 003 completed successfully')
    
  } catch (error) {
    console.error('✗ Migration 003 failed:', error.message)
    throw error
  } finally {
    await client.release()
  }
}

/**
 * Run all migrations
 */
async function runAllMigrations() {
  try {
    console.log('Starting database migrations...\n')
    
    await migration001()
    await migration002()
    await migration003()
    
    console.log('\n✓ All migrations completed successfully!')
    await pool.end()
  } catch (error) {
    console.error('\n✗ Migrations failed:', error)
    await pool.end()
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  runAllMigrations()
}

module.exports = { migration001, migration002, migration003, runAllMigrations }
