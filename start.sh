#!/bin/bash

# Détermine le dossier racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==========================================="
echo "   Démarrage de Sarah Platform (PaaS)      "
echo "==========================================="

# 1. Vérification Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Erreur: Docker n'est pas installé ou n'est pas dans le PATH."
    exit 1
fi

# 2. Démarrage de PostgreSQL si un conteneur existe
echo "👉 Démarrage du conteneur PostgreSQL (sarah-db)..."
if docker ps -a --format '{{.Names}}' | grep -Eq "^sarah-db$"; then
    docker start sarah-db
else
    echo "ℹ️ Conteneur 'sarah-db' non trouvé. Création automatique..."
    docker run --name sarah-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sarah_platform -p 5432:5432 -d postgres:15-alpine
fi

sleep 2

# 3. Installation des dépendances si nécessaire
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo "📦 Installation des dépendances Backend..."
    (cd "$PROJECT_ROOT/backend" && npm install --no-audit --no-fund --legacy-peer-deps)
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "📦 Installation des dépendances Frontend..."
    (cd "$PROJECT_ROOT/frontend" && npm install --no-audit --no-fund --legacy-peer-deps)
fi

# 4. Lancement Backend et Frontend
echo "🚀 Lancement du Backend sur le port 3000..."
(cd "$PROJECT_ROOT/backend" && npm run dev) &
BACKEND_PID=$!

sleep 3

echo "🚀 Lancement du Frontend sur le port 5173 (0.0.0.0)..."
(cd "$PROJECT_ROOT/frontend" && npx vite --host 0.0.0.0 --port 5173) &
FRONTEND_PID=$!

echo ""
echo "==========================================="
echo "✅ Sarah Platform est prête !"
echo "🌐 Frontend : http://localhost:5173"
echo "⚙️ Backend  : http://localhost:3000"
echo "==========================================="
echo "Appuyez sur Ctrl+C pour arrêter les serveurs."

# Gestion de l'arrêt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
