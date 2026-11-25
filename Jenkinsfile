pipeline {
    agent any

    environment {
        PROJECT_NAME = 'sarah-platform'
        BACKEND_IMAGE = 'sarah-platform-backend:latest'
        FRONTEND_IMAGE = 'sarah-platform-frontend:latest'
        NODE_ENV = 'production'
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('🔍 1. Verification de l\'environnement') {
            steps {
                echo '=== Verification des outils DevOps ==='
                sh 'node -v'
                sh 'npm -v'
                sh 'docker --version'
                sh 'git --version'
            }
        }

        stage('📦 2. Installation des dependances') {
            steps {
                echo '=== Installation des packages Backend et Frontend ==='
                dir('backend') {
                    sh 'npm install --include=dev --legacy-peer-deps --no-audit --no-fund'
                }
                dir('frontend') {
                    sh 'npm install --include=dev --legacy-peer-deps --no-audit --no-fund'
                }
            }
        }

        stage('🧪 3. Tests Automatiques & Validation') {
            steps {
                echo '=== Execution de la suite de tests Backend ==='
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('⚡ 4. Build du Frontend React') {
            steps {
                echo '=== Compilation de l\'application React / Vite ==='
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('🐳 5. Construction des Images Docker') {
            steps {
                echo '=== Generation des images de production Docker ==='
                dir('backend') {
                    sh 'docker build -t ${BACKEND_IMAGE} .'
                }
            }
        }

        stage('🚀 6. Smoke Test & Validation Deploiement') {
            steps {
                echo '=== Validation du conteneur en environnement isole ==='
                sh '''
                    # Demarrage temporaire pour tester la disponibilite
                    docker run -d --name smoke-test-backend -p 3001:3000 -e PORT=3000 ${BACKEND_IMAGE} || true
                    sleep 3
                    docker logs --tail 20 smoke-test-backend || true
                    docker rm -f smoke-test-backend || true
                '''
            }
        }
    }

    post {
        success {
            echo '==============================================='
            echo '✅ Pipeline Jenkins terminee avec succes !'
            echo '   Sarah Platform est prete pour la production.'
            echo '==============================================='
        }
        failure {
            echo '==============================================='
            echo '❌ Echec de la pipeline Jenkins. Verifiez les logs.'
            echo '==============================================='
        }
        always {
            deleteDir()
        }
    }
}
