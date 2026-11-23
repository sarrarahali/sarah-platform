import os
from flask import Flask, jsonify

app = Flask(__name__)

PORT = int(os.environ.get("PORT", 5000))
ENV = os.environ.get("FLASK_ENV", "production")

@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "runtime": "Python Flask",
        "environment": ENV,
        "message": "Application Python conteneurisée et déployée avec succès sur Sarah Platform!"
    })

@app.route("/ping")
def ping():
    return jsonify({"ping": "pong"})

if __name__ == "__main__":
    print(f"[FLASK APP] Démarrage sur le port {PORT}")
    app.run(host="0.0.0.0", port=PORT)
