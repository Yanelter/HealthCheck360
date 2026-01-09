const app = {
    // Variable pour stocker l'utilisateur connecté
    currentUser: null,

    // Variables pour l'inspection (Opérateur)
    currentInspectionData: {
        points: [],
        total: 0,
        done: 0
    },

    // ============================================================
    // 1. AUTHENTIFICATION & NAVIGATION
    // ============================================================

    login: function() {
        const email = document.querySelector('input[type="email"]').value;
        const password = document.querySelector('input[type="password"]').value;

        fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.currentUser = data.user;
                console.log("Connecté en tant que :", this.currentUser.role);
                this.setupInterfaceForRole(this.currentUser.role);
            } else {
                alert("Erreur : " + data.message);
            }
        })
        .catch(err => {
            console.error("Erreur connexion backend", err);
            alert("Impossible de contacter le serveur (Vérifie que le backend tourne).");
        });
    },

    setupInterfaceForRole: function(role) {
        // 1. Cacher le login, afficher l'interface principale
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-interface').classList.remove('hidden');
        document.getElementById('admin-interface').classList.add('active');

        // 2. Filtrer le menu selon le rôle
        const adminBtns = document.querySelectorAll('.menu-admin');
        const opBtns = document.querySelectorAll('.menu-operator');

        if (role === 'ADMIN') {
            adminBtns.forEach(el => el.style.display = 'block');
            opBtns.forEach(el => el.style.display = 'none');
            this.showPage('dashboard-admin'); // Page par défaut Admin
        } 
        else if (role === 'OPERATOR') {
            adminBtns.forEach(el => el.style.display = 'none');
            opBtns.forEach(el => el.style.display = 'block');
            this.showPage('checklist-start'); // Page par défaut Opérateur
        }
    },

    showPage: function(pageId) {
        // Cacher toutes les pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.classList.add('hidden'); 
            p.classList.remove('active');
        });
        
        // Afficher la page demandée
        const target = document.getElementById('page-' + pageId);
        if(target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
        
        // CHARGEMENT DES DONNÉES SPÉCIFIQUES
        // C'est ici que la magie opère : si on va sur 'users', on charge la liste !
        if(pageId === 'users') {
            this.loadUsers();
        }
    },

    // ============================================================
    // 2. PARTIE ADMIN : GESTION UTILISATEURS
    // ============================================================

    loadUsers: function() {
        console.log("Chargement des utilisateurs...");
        fetch('http://localhost:3000/api/users')
        .then(res => res.json())
        .then(users => {
            const tbody = document.querySelector('#usersTable tbody');
            if(!tbody) return;
            tbody.innerHTML = ''; // Vider le tableau
            
            users.forEach(user => {
                const tr = document.createElement('tr');
                // Badge de couleur pour le rôle
                const badgeColor = user.role === 'ADMIN' ? '#e74c3c' : '#2ecc71'; 
                const badgeStyle = `background:${badgeColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8em;`;

                tr.innerHTML = `
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td><span style="${badgeStyle}">${user.role}</span></td>
                    <td>
                        <button class="btn-secondary" style="padding:5px 10px; font-size:0.8em;" onclick="alert('Fonctionnalité : Modifier ${user.first_name}')">
                            <i class="fa fa-edit"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error("Erreur chargement users", err));
    },

    createUser: function() {
        // Récupérer les valeurs du formulaire
        const newUser = {
            first_name: document.getElementById('new_firstname').value,
            last_name: document.getElementById('new_lastname').value,
            email: document.getElementById('new_email').value,
            password: document.getElementById('new_password').value,
            role: document.getElementById('new_role').value
        };

        // Vérif rapide
        if(!newUser.email || !newUser.password) {
            alert("Merci de remplir au moins l'email et le mot de passe.");
            return;
        }

        fetch('http://localhost:3000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("Utilisateur créé avec succès !");
                this.closeUserModal();
                this.loadUsers(); // Recharger le tableau
            } else {
                alert("Erreur : " + data.error);
            }
        });
    },

    // Gestion de la fenêtre (Modale) Nouvel Utilisateur
    openUserModal: function() { document.getElementById('modal-user').classList.remove('hidden'); },
    closeUserModal: function() { document.getElementById('modal-user').classList.add('hidden'); },


    // ============================================================
    // 3. PARTIE ADMIN : CONFIGURATION ZONE (Carte)
    // ============================================================

    addPoint: function(event) {
        // Empêcher d'ajouter un point si on clique sur un point existant
        if(event.target.closest('.map-point')) return;

        const mapContainer = document.getElementById('mapContainer');
        const rect = mapContainer.getBoundingClientRect();
        
        // Calcul des % pour que ça reste responsive
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        // Création visuelle du point (Admin)
        const point = document.createElement('div');
        point.className = 'map-point';
        point.style.left = x + '%';
        point.style.top = y + '%';
        point.innerHTML = '<i class="fa fa-star" style="color: #e67e22;"></i>';
        
        // Au clic sur le point, on ouvre la config
        point.onclick = (e) => { e.stopPropagation(); this.openModal(); };
        
        mapContainer.appendChild(point);
        this.openModal(); // Ouvrir le formulaire
    },

    // Gestion de la Modale "Mesure"
    openModal: function() { document.getElementById('modal-measure').classList.remove('hidden'); },
    closeModal: function() { document.getElementById('modal-measure').classList.add('hidden'); },
    saveMeasure: function() { alert("Point enregistré (Simulation)"); this.closeModal(); },


    // ============================================================
    // 4. PARTIE OPÉRATEUR : INSPECTION TERRAIN
    // ============================================================

    startInspection: function() {
        const zoneId = document.getElementById('select-zone-op').value;
        const freq = document.getElementById('select-freq-op').value;
        console.log("Lancement inspection...", zoneId, freq);

        // Aller sur la page d'exécution
        this.showPage('checklist-run');
        // Charger les points (Simulation)
        this.loadMockPoints(zoneId);
    },

    loadMockPoints: function(zoneId) {
        // FAUSSES DONNÉES pour l'exemple
        const mockPoints = [
            { id: 1, x: 20, y: 40, label: "Extincteur Entrée", type: "Extincteur", icon: "fa-fire-extinguisher", question: "Pression OK ?", input: "BOOL", status: "todo" },
            { id: 2, x: 60, y: 20, label: "Néon Allée", type: "Eclairage", icon: "fa-lightbulb", question: "Luxmètre (valeur)", input: "NUMERIC", unit: "Lux", status: "todo" },
            { id: 3, x: 80, y: 80, label: "Porte Sud", type: "Porte", icon: "fa-door-open", question: "Ferme bien ?", input: "BOOL", status: "todo" }
        ];

        // Mettre à jour l'interface
        document.getElementById('operator-map-img').src = "https://placehold.co/800x600/EEE/31343C?text=Plan+Entrepôt+A"; 
        document.getElementById('inspection-title').innerText = "Ronde : Entrepôt A";

        this.currentInspectionData.points = mockPoints;
        this.currentInspectionData.total = mockPoints.length;
        this.currentInspectionData.done = 0;

        this.renderOperatorMap();
        this.updateProgress();
    },

    renderOperatorMap: function() {
        const container = document.getElementById('operatorMapContainer');
        const img = container.querySelector('img');
        container.innerHTML = ''; 
        container.appendChild(img);

        this.currentInspectionData.points.forEach(point => {
            const el = document.createElement('div');
            el.className = `map-point-op status-${point.status}`; // change la couleur (gris/vert/rouge)
            el.style.left = point.x + '%';
            el.style.top = point.y + '%';
            el.innerHTML = `<i class="fa ${point.icon}"></i>`;
            
            el.onclick = (e) => {
                e.stopPropagation();
                this.selectPointForCheck(point);
            };
            container.appendChild(el);
        });
    },

    selectPointForCheck: function(point) {
        // UI : Afficher le formulaire
        document.getElementById('empty-state-msg').classList.add('hidden');
        document.getElementById('active-question-form').classList.remove('hidden');

        // Remplir les textes
        document.getElementById('point-title').innerText = point.label;
        document.getElementById('question-label').innerText = point.question;
        
        // Stocker l'ID pour savoir quoi valider
        document.querySelector('.btn-validate').dataset.pointId = point.id;

        // Générer le champ de réponse adapté
        const inputContainer = document.getElementById('input-container');
        inputContainer.innerHTML = '';

        if (point.input === 'BOOL') {
            inputContainer.innerHTML = `
                <div style="display:flex; gap:10px;">
                    <button class="btn-option" onclick="app.setBoolAnswer(this, true)" style="flex:1; padding:10px; background:#eee; border:none; cursor:pointer;">✅ OUI</button>
                    <button class="btn-option" onclick="app.setBoolAnswer(this, false)" style="flex:1; padding:10px; background:#eee; border:none; cursor:pointer;">❌ NON</button>
                </div>
                <input type="hidden" id="answer-value">
            `;
        } else if (point.input === 'NUMERIC') {
            inputContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="number" id="answer-value" placeholder="Valeur" style="padding:10px; flex:1;">
                    <span>${point.unit || ''}</span>
                </div>
            `;
        }
        document.getElementById('comment-input').value = "";
    },

    setBoolAnswer: function(btn, val) {
        // Visuel bouton actif
        const parent = btn.parentElement;
        parent.querySelectorAll('button').forEach(b => b.style.background = '#eee');
        btn.style.background = val ? '#2ecc71' : '#e74c3c';
        btn.style.color = 'white';
        document.getElementById('answer-value').value = val;
    },

    saveAnswer: function() {
        const btn = document.querySelector('.btn-validate');
        const pointId = parseInt(btn.dataset.pointId);
        const value = document.getElementById('answer-value').value;

        const point = this.currentInspectionData.points.find(p => p.id === pointId);
        
        if (point) {
            // Logique de validation
            let isCompliant = true;
            if (point.input === 'BOOL' && value === 'false') isCompliant = false;

            point.status = isCompliant ? 'ok' : 'nok';
            point.answer = value;

            this.renderOperatorMap(); // Mettre à jour les couleurs sur la carte
            this.currentInspectionData.done++;
            this.updateProgress();

            // Reset UI
            document.getElementById('empty-state-msg').classList.remove('hidden');
            document.getElementById('active-question-form').classList.add('hidden');
        }
    },

    updateProgress: function() {
        const { total, done } = this.currentInspectionData;
        const pct = (done / total) * 100;
        document.getElementById('progress-text').innerText = `${done}/${total}`;
        document.getElementById('progress-fill').style.width = pct + '%';

        if (done === total) {
            document.getElementById('btn-finish-inspection').style.display = 'block';
        }
    },

    finishInspection: function() {
        alert("Bravo ! Inspection terminée et envoyée.");
        this.showPage('dashboard-op');
    }
};