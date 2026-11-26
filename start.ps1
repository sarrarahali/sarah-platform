# Script PowerShell de démarrage automatique pour Windows
$ProjectRoot = $PSScriptRoot

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Démarrage de Sarah Platform (Windows)   " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 1. Vérification de Docker
try {
    $dockerCheck = docker --version
    Write-Host "✓ Docker détecté : $dockerCheck" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: Docker n'est pas accessible. Assurez-vous que Docker Desktop est lancé." -ForegroundColor Red
    pause
    exit 1
}

# 2. Démarrage de PostgreSQL
Write-Host "`n👉 Démarrage du conteneur PostgreSQL (sarah-db)..." -ForegroundColor Yellow
$containerExists = docker ps -a --filter "name=^sarah-db$" --format "{{.Names}}"
if ($containerExists -eq "sarah-db") {
    docker start sarah-db | Out-Null
    Write-Host "✓ Conteneur sarah-db démarré" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Création du conteneur sarah-db..." -ForegroundColor Yellow
    docker run --name sarah-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sarah_platform -p 5432:5432 -d postgres:15-alpine
    Write-Host "✓ Conteneur sarah-db créé et démarré" -ForegroundColor Green
}

# 3. Installation des dépendances si nécessaire
if (-not (Test-Path "$ProjectRoot\backend\node_modules")) {
    Write-Host "`n📦 Installation des dépendances Backend..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "install" -WorkingDirectory "$ProjectRoot\backend" -Wait -NoNewWindow
}

if (-not (Test-Path "$ProjectRoot\frontend\node_modules")) {
    Write-Host "`n📦 Installation des dépendances Frontend..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "install" -WorkingDirectory "$ProjectRoot\frontend" -Wait -NoNewWindow
}

# 4. Lancement dans des terminaux séparés
Write-Host "`n🚀 Lancement du Backend (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "🚀 Lancement du Frontend (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\frontend'; npm run dev"

Write-Host "`n📊 Démarrage de la suite de monitoring (Prometheus, Alertmanager, Grafana)..." -ForegroundColor Yellow
try {
    docker compose up -d prometheus alertmanager grafana 2>$null
    Write-Host "✓ Conteneurs de monitoring démarrés" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Monitoring non démarré (facultatif)" -ForegroundColor Gray
}

Write-Host "`n===========================================" -ForegroundColor Green
Write-Host "✅ Sarah Platform est en cours d'exécution !" -ForegroundColor Green
Write-Host "🌐 Frontend     : http://localhost:5173" -ForegroundColor White
Write-Host "⚙️ Backend API   : http://localhost:3000" -ForegroundColor White
Write-Host "📈 Grafana      : http://localhost:3001 (admin/admin)" -ForegroundColor White
Write-Host "🔥 Prometheus   : http://localhost:9090" -ForegroundColor White
Write-Host "🚨 Alertmanager : http://localhost:9093" -ForegroundColor White
Write-Host "===========================================" -ForegroundColor Green
