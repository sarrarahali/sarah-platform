# 📋 Guide de Démonstration et Documentation Technique
## Projet : Sarah Platform (Mini Heroku Clone / PaaS DevOps)

> Ce document résume l'architecture technique, les instructions de démarrage et le scénario complet de démonstration pour la soutenance / le rapport de stage.

---

## 🏗️ 1. Architecture Système

La plateforme implémente une architecture découplée et orientée conteneurs conforme au cahier des charges :

```
+--------------------------------------------------------------------------+
|                               FRONTEND                                   |
|                React 18 + Vite + Material UI (Port 5173)                 |
+--------------------------------------------------------------------------+
                                     │  (REST API & EventSource SSE)
                                     ▼
+--------------------------------------------------------------------------+
|                             BACKEND API                                  |
|                 Node.js + Express (Port 3000)                            |
|                                                                          |
|  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────────┐  |
|  │  Auth & JWT       │  │ Project Detector  │  │ Dynamic Docker Engine│  |
|  └───────────────────┘  └───────────────────┘  └──────────────────────┘  |
+--------------------------------------------------------------------------+
            │                                             │
            ▼                                             ▼
+──────────────────────────+             +─────────────────────────────────+
|     POSTGRESQL (DB)      |             |          DOCKER HOST            |
| Conteneur `sarah-db`     |             |  Conteneurs isolés déployés     |
| Tables: users, apps,     |             |  (Ports dynamiques 4000-6000)   |
| deployments              |             |  Streaming logs & Docker stats  |
+──────────────────────────+             +─────────────────────────────────+
```

---

## 🚀 2. Démarrage Rapide

### Option A : Sous Windows
Assurez-vous que **Docker Desktop** est ouvert et en cours d'exécution, puis lancez PowerShell :
```powershell
.\start.ps1
```

### Option B : Sous Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

Le script démarre automatiquement :
1. Le conteneur PostgreSQL `sarah-db`
2. L'API Backend Node.js sur `http://localhost:3000`
3. L'application Frontend React sur `http://localhost:5173`

---

## 🧪 3. Scénario de Démonstration Pas-à-Pas (Démo Jury)

Des applications d'exemple prêtes à être déployées sont disponibles dans le dossier `samples/` :
* `samples/sample-01-static.zip` : Site web HTML5 statique (détection Nginx).
* `samples/sample-02-node.zip` : API Node.js / Express avec route `/health`.
* `samples/sample-03-python.zip` : Application Python Flask.

### Étape 1 : Inscription et Authentification Sécurisée
1. Ouvrez `http://localhost:5173`.
2. Cliquez sur **Register** pour créer un compte (ex: `sarah@test.com` / `password123`).
3. Vous êtes automatiquement connecté avec un jeton sécurisé **JWT**.

### Étape 2 : Déploiement via Archive ZIP
1. Dans le Dashboard, sous **Create application** :
   * Nom : `demo-node-api`
   * Fichier : sélectionnez `samples/sample-02-node.zip`
   * Cliquez sur **Create & deploy**.
2. Observez le statut passer de `building` à `running`.
3. Cliquez sur **Details** :
   * **URL d'accès** : Cliquez sur le lien généré (ex: `http://localhost:4123`) pour voir votre API en direct.
   * **Stack détectée** : Observez le badge `⚡ Backend: Express.js` identifié automatiquement.

### Étape 3 : Monitoring et Logs en Temps Réel
1. Sur la page de détails de l'application :
   * **Logs en temps réel** : Le terminal affiche en direct les sorties de l'application via streaming SSE (`docker logs -f`).
   * **Métriques système** : Les compteurs CPU et Mémoire se mettent à jour en direct (`docker stats`).
   * **Historique des déploiements** : La liste complète des builds et leur statut.

### Étape 4 : Variables d'Environnement (.env)
1. Dans la section **Variables d'environnement (.env)** :
   * Ajoutez la clé `CUSTOM_MESSAGE` avec la valeur `Mon Message Personnalisé`.
   * Cliquez sur **+ Ajouter**.
2. Cliquez sur le bouton **🔄 Redémarrer**.
3. Rafraîchissez l'URL de votre application : la variable d'environnement a été injectée dans le conteneur Docker !

### Étape 5 : Contrôle du Cycle de Vie du Conteneur
1. Cliquez sur **⏹ Arrêter** : le conteneur Docker passe en état `STOPPED`.
2. Cliquez sur **▶ Démarrer** : le conteneur redémarre instantanément.
3. Retournez au Dashboard et cliquez sur **Delete** : l'application ainsi que ses conteneurs Docker associés sont automatiquement et proprement détruits.

---

## 📊 4. Matrice de Réalisation des Sprints (Méthodologie Scrum)

| Sprint | Intitulé | Fonctionnalités livrées | Statut |
| :--- | :--- | :--- | :---: |
| **Sprint 1** | Initialisation & Auth | Setup Express, JWT Token, base PostgreSQL, tables `users` & `apps` | ✅ Terminé |
| **Sprint 2** | Gestion des applications | CRUD applications, upload ZIP (`multer`), import GitHub (`simple-git`) | ✅ Terminé |
| **Sprint 3** | Docker Basics | Docker Engine API, conteneurisation isolée, mapping de ports | ✅ Terminé |
| **Sprint 4** | Automatisation Build | Détection automatique de runtime (`ProjectDetector`), génération Dockerfile | ✅ Terminé |
| **Sprint 5** | Déploiement automatique | Allocation dynamique de ports (4000-6000), restart policy, cycle de vie (start/stop/restart) | ✅ Terminé |
| **Sprint 6** | Monitoring & Observabilité | Logs temps réel en streaming (SSE), métriques CPU / RAM (`docker stats`), historique | ✅ Terminé |
| **Sprint 7** | Interface Utilisateur | Dashboard React, badges de technologies détectées, éditeur de variables `.env` | ✅ Terminé |
| **Sprint 8** | Stabilisation & Livrables | Scripts Windows (`start.ps1`) et Linux (`start.sh`), échantillons de démo, documentation | ✅ Terminé |
