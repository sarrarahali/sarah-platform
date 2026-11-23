# 🏗️ Guide d'Intégration Jenkins - CI/CD Pipeline
## Sarah Platform (Mini Heroku Clone)

> Ce guide explique comment **Jenkins** est intégré dans le projet pour automatiser la pipeline CI/CD de **Sarah Platform** (Pipeline as Code).

---

## 🎯 1. Rôle de Jenkins dans l'Architecture

Dans un environnement DevOps complet, deux niveaux de CI/CD coexistent :

1. **La CI/CD Interne (PaaS Engine) :**
   * Gérée par le backend Node.js (`ProjectDetector` + `builder.js` + `deployer.js`).
   * Rôle : Détecter et conteneuriser les applications des utilisateurs en temps réel (ZIP/Git).
2. **La CI/CD Globale avec Jenkins (Pipeline as Code) :**
   * Gérée par le fichier [`Jenkinsfile`](./Jenkinsfile).
   * Rôle : Tester, valider, construire et conteneuriser **la plateforme Sarah Platform elle-même** avant toute mise en production.

---

## 🔄 2. Les Étapes de la Pipeline Jenkins (`Jenkinsfile`)

La pipeline déclarative contient 6 étapes clés :

```
[ Git Checkout ]
       │
       ▼
[ 1. Vérification Outils ] ──> Node.js, npm, Docker, Git
       │
       ▼
[ 2. Installation Deps ]   ──> npm install (Backend + Frontend)
       │
       ▼
[ 3. Tests Automatisés ]   ──> npm test (Suite de validation Backend)
       │
       ▼
[ 4. Build Frontend ]      ──> Compilation Vite / React (Production bundle)
       │
       ▼
[ 5. Build Docker Image ]  ──> Construction de l'image `sarah-platform-backend:latest`
       │
       ▼
[ 6. Smoke Test Déploiement] ──> Test du conteneur en environnement isolé
```

---

## 🚀 3. Démarrer Jenkins en 1 Clic avec Docker

Un fichier Docker Compose prêt à l'emploi est inclus dans le projet :

```bash
# Démarrer le serveur Jenkins
docker compose -f docker-compose.jenkins.yml up -d
```

* **Interface Web Jenkins :** [http://localhost:8088](http://localhost:8088)
* Le socket Docker (`/var/run/docker.sock`) est automatiquement partagé avec Jenkins pour lui permettre d'exécuter des builds Docker.

---

## 📋 4. Configurer le Job dans Jenkins

1. Ouvrez [http://localhost:8088](http://localhost:8088).
2. Entrez le mot de passe initial administrateur généré : `36951347b97e4f97a33784600c6102e9` (ou obtenu via `docker exec sarah-jenkins cat /var/jenkins_home/secrets/initialAdminPassword`).
3. Cliquez sur **Install suggested plugins**.
4. Cliquez sur **Nouveau Item** > Donnez le nom `sarah-platform-pipeline` > Sélectionnez **Pipeline** > Cliquez sur **OK**.
3. Dans la section **Pipeline** tout en bas :
   * Définition : **Pipeline script from SCM**
   * SCM : **Git**
   * Repository URL : `https://github.com/sarrarahali/sarah-platform.git`
   * Branch Specifier : `*/main`
   * Script Path : `Jenkinsfile`
4. Cliquez sur **Enregistrer** puis sur **Lancer un build (Build Now)**.
5. Observez la vue graphique de la pipeline (**Stage View**) avec toutes les étapes validées en vert !

---

## 🎤 5. Ce que vous pouvez dire au Jury de Stage

> *"Pour démontrer une maturité DevOps complète, nous avons mis en place une double chaîne CI/CD :*
> *1. D'un côté, notre propre moteur interne en Node.js/Docker assure le déploiement instantané des applications clientes (comme le ferait Heroku).*
> *2. De l'autre, nous avons rédigé un **Jenkinsfile** déclaratif pour automatiser la pipeline d'intégration continue de la plateforme elle-même : tests automatisés (`npm test`), build du frontend React, validation de sécurité et packaging de l'image Docker de production."*
