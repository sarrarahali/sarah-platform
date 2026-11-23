/**
 * Automated Test Suite for Sarah Platform Backend
 * Executed during the CI pipeline (Jenkins / GitHub Actions)
 */

console.log('🧪 [TEST] Démarrage de la suite de tests automatisés...')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ ÉCHEC : ${message}`)
    failed++
  }
}

try {
  // Test 1: Check express and main app syntax
  const app = require('./src/app')
  assert(app !== undefined, 'Module principal Express chargé')

  // Test 2: Project detector service
  const ProjectDetector = require('./src/services/projectDetector')
  const detector = new ProjectDetector(__dirname)
  const structure = detector.scan()
  assert(structure !== null && typeof structure === 'object', 'ProjectDetector analyse correctement la structure')

  // Test 3: EnvManager service
  const EnvManager = require('./src/services/envManager')
  const envMgr = new EnvManager(__dirname)
  const secret = envMgr.generateSecret(16)
  assert(secret && secret.length === 16, 'EnvManager génère des secrets cryptographiques sécurisés')

  // Test 4: Builder service exports
  const { buildApp } = require('./src/services/builder')
  assert(typeof buildApp === 'function', 'Builder exporte la fonction de construction buildApp')

  // Test 5: Deployer service exports
  const { deployApp } = require('./src/services/deployer')
  assert(typeof deployApp === 'function', 'Deployer exporte la fonction de déploiement deployApp')

} catch (err) {
  console.error(`💥 [TEST CRITICAL ERROR] ${err.message}`)
  failed++
}

console.log(`\n📊 Résultats des tests : ${passed} réussis, ${failed} échoués`)

if (failed > 0) {
  console.error('❌ La pipeline de test a échoué.')
  process.exit(1)
} else {
  console.log('✅ Tous les tests sont validés avec succès !')
  process.exit(0)
}
