const simpleGit = require('simple-git')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const cloneRepo = async (repoUrl) => {
  const cloneId = crypto.randomUUID()
  const cloneDir = path.join(__dirname, '../../builds', cloneId)

  console.log(`[GIT] Clonage de ${repoUrl}`)
  fs.mkdirSync(cloneDir, { recursive: true })

  const git = simpleGit()

  try {
    await git.clone(repoUrl, cloneDir)
  } catch (err) {
    // Nettoyer le dossier
    fs.rmSync(cloneDir, { recursive: true, force: true })
    
    if (err.message.includes('Authentication') || 
        err.message.includes('Username') ||
        err.message.includes('could not read Username')) {
      throw new Error('REPO_PRIVATE: Ce repository est privé. Utilisez un repository public.')
    }
    if (err.message.includes('not found') || 
        err.message.includes('Repository not found')) {
      throw new Error('REPO_NOT_FOUND: Repository introuvable. Vérifiez l URL.')
    }
    throw new Error(`GIT_ERROR: ${err.message}`)
  }

  console.log(`[GIT] Clone termine dans ${cloneDir}`)
  return { cloneDir, cloneId }
}

module.exports = { cloneRepo }
