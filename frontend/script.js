const app = {
    // ============================================================
    // VARIABLES D'ÉTAT
    // ============================================================
    currentUser: null,
    kpiChartInstance: null,

    // Données temporaires pour la ronde de l'opérateur
    currentInspectionData: {
        points: [],
        total: 0,
        done: 0
    },

    // ============================================================
    // 1. AUTHENTIFICATION
    // ============================================================

    login: function() {
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');

        if (!emailInput || !passInput) {
            console.error("Champs introuvables");
            return;
        }

        const email = emailInput.value;
        const password = passInput.value;

        // On appelle le backend
        fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log("Connexion réussie !");
                this.currentUser = data.user;
                // C'est cette fonction qui manquait 👇
                this.setupInterfaceForRole(this.currentUser.role);
            } else {
                alert("Erreur : " + data.message);
            }
        })
        .catch(err => {
            console.error("Erreur backend", err);
            alert("Impossible de contacter le serveur.");
        });
    },

    // 👇 C'EST LA FONCTION QUI MANQUAIT 👇
    setupInterfaceForRole: function(role) {
        console.log("Configuration de l'interface pour le rôle :", role);
        
        // 1. Cacher l'écran de login
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('hidden');
        
        // 2. Afficher l'interface principale
        document.getElementById('admin-interface').classList.remove('hidden');
        document.getElementById('admin-interface').classList.add('active');

        // 3. Filtrer le menu gauche selon le rôle
        const adminBtns = document.querySelectorAll('.menu-admin');
        const opBtns = document.querySelectorAll('.menu-operator');

        if (role === 'ADMIN') {
            adminBtns.forEach(el => el.style.display = 'block');
            opBtns.forEach(el => el.style.display = 'none');
            this.showPage('dashboard-admin'); 
        } 
        else if (role === 'OPERATOR') {
            adminBtns.forEach(el => el.style.display = 'none');
            opBtns.forEach(el => el.style.display = 'block');
            this.showPage('checklist-start'); 
        }
    },

    // ============================================================
    // 2. NAVIGATION ET PAGES
    // ============================================================

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

        // Si on va sur le Dashboard Admin -> Dessiner le graphique
        if(pageId === 'dashboard-admin') {
            setTimeout(() => { this.initDashboardChart(); }, 100);
        }

        // Si on va sur la liste users -> charger les users
        if(pageId === 'users') {
            this.loadUsers();
        }
    },

    // ============================================================
    // 3. GRAPHIQUE DASHBOARD (Chart.js)
    // ============================================================

    initDashboardChart: function() {
        const ctx = document.getElementById('kpiChart');
        if(!ctx) return;

        if (this.kpiChartInstance) {
            this.kpiChartInstance.destroy();
        }

        this.kpiChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Conforme', 'Non Conforme', 'À vérifier'],
                datasets: [{
                    data: [12, 3, 5],
                    backgroundColor: ['#2ecc71', '#e74c3c', '#f1c40f'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    },

    // ============================================================
    // 4. ADMIN : UTILISATEURS & CARTE
    // ============================================================

    loadUsers: function() {
        fetch('http://localhost:3000/api/users')
        .then(res => res.json())
        .then(users => {
            const tbody = document.querySelector('#usersTable tbody');
            if(!tbody) return;
            tbody.innerHTML = ''; 
            
            users.forEach(user => {
                const tr = document.createElement('tr');
                const badgeColor = user.role === 'ADMIN' ? '#e74c3c' : '#2ecc71'; 
                tr.innerHTML = `
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td><span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8em;">${user.role}</span></td>
                    <td><button class="btn-secondary"><i class="fa fa-edit"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        });
    },

    // Fonctions Modales et Carte Admin
    openUserModal: function() { document.getElementById('modal-user').classList.remove('hidden'); },
    closeUserModal: function() { document.getElementById('modal-user').classList.add('hidden'); },
    
    createUser: function() {
        // Code simplifié pour la création
        alert("Utilisateur créé ! (Simulation rafraîchissement)");
        this.closeUserModal();
        this.loadUsers();
    },

    addPoint: function(event) {
        if(event.target.closest('.map-point')) return;
        const mapContainer = document.getElementById('mapContainer');
        const rect = mapContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        const point = document.createElement('div');
        point.className = 'map-point';
        point.style.left = x + '%';
        point.style.top = y + '%';
        point.innerHTML = '<i class="fa fa-star" style="color: #e67e22;"></i>';
        mapContainer.appendChild(point);
    },
    
    openModal: function() { document.getElementById('modal-measure').classList.remove('hidden'); },
    closeModal: function() { document.getElementById('modal-measure').classList.add('hidden'); },
    saveMeasure: function() { alert("Point enregistré"); this.closeModal(); },

    // ============================================================
    // 5. OPÉRATEUR : RONDE
    // ============================================================

    startInspection: function() {
        this.showPage('checklist-run');
        this.loadMockPoints();
    },

    loadMockPoints: function() {
        // Fausses données
        this.currentInspectionData.points = [
            { id: 1, x: 20, y: 40, label: "Extincteur", status: "todo" },
            { id: 2, x: 60, y: 20, label: "Lumière", status: "todo" }
        ];
        this.renderOperatorMap();
    },

    renderOperatorMap: function() {
        const container = document.getElementById('operatorMapContainer');
        const img = document.getElementById('operator-map-img');
        container.innerHTML = ''; 
        container.appendChild(img);

        this.currentInspectionData.points.forEach(point => {
            const el = document.createElement('div');
            el.className = `map-point-op status-${point.status}`; 
            el.style.left = point.x + '%';
            el.style.top = point.y + '%';
            el.onclick = () => alert("Contrôle du point : " + point.label);
            container.appendChild(el);
        });
    },

    finishInspection: function() {
        alert("Ronde terminée !");
        this.showPage('dashboard-op');
    }
};