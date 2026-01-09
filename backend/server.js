const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration de la Base de Données
const dbConfig = {
    host: 'db', // Nom du service dans docker-compose
    user: 'user',
    password: 'password',
    database: 'healthcheck_db'
};

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig);

    connection.connect(err => {
        if (err) {
            console.error('Erreur de connexion BDD, nouvelle tentative dans 2 secondes...', err);
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log('Connecté à la Base de Données !');
        }
    });

    connection.on('error', err => {
        console.error('Erreur BDD', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

// --- ROUTES ---

// 1. Route de test (Accueil)
app.get('/', (req, res) => {
    res.send('API HealthCheck360 fonctionnelle !');
});

// 2. LOGIN : Vérifier email et mot de passe
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Comparaison simple pour l'exercice (En vrai : utiliser bcrypt)
    const sql = "SELECT * FROM users WHERE email = ? AND password_hash = ?";
    
    connection.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            const user = results[0];
            res.json({ 
                success: true, 
                user: { id: user.id, name: user.first_name, role: user.role } 
            });
        } else {
            res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
        }
    });
});

// 3. GESTION UTILISATEURS (Liste)
app.get('/api/users', (req, res) => {
    connection.query("SELECT id, first_name, last_name, email, role FROM users", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 4. CRÉER UTILISATEUR
app.post('/api/users', (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;
    const sql = "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)";
    
    connection.query(sql, [first_name, last_name, email, password, role], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

// 5. CHANGER RÔLE
app.put('/api/users/:id/role', (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;
    const sql = "UPDATE users SET role = ? WHERE id = ?";
    connection.query(sql, [role, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur Backend démarré sur le port ${PORT}`);
});