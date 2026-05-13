#!/bin/bash

echo "Demarrage de Sarah Platform..."

# Démarrer la base de données
echo "Demarrage PostgreSQL..."
docker start sarah-db
sleep 2

# Démarrer le backend dans un nouveau terminal
echo "Demarrage du backend..."
gnome-terminal -- bash -c "cd /home/$USER/sarra/backend && npm run dev; exec bash" &
sleep 3

# Démarrer le frontend dans un nouveau terminal
echo "Demarrage du frontend..."
gnome-terminal -- bash -c "cd /home/$USER/sarra/frontend && npm run dev; exec bash" &
sleep 2

echo ""
echo "Sarah Platform est prete !"
echo "Frontend : http://localhost:5173"
echo "Backend  : http://localhost:3000"
