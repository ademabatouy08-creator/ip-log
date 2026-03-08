const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const WHITELIST = ["TonPseudo"]; 
const users = {}; 

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        users[socket.id] = { 
            ...data, 
            ip, 
            sid: socket.id, 
            elite: WHITELIST.includes(data.name),
            friends: [] 
        };
        broadcastSync();
    });

    function broadcastSync() {
        Object.keys(users).forEach(sid => {
            const requester = users[sid];
            const safeList = Object.values(users).map(u => ({
                name: u.name, pp: u.pp, sid: u.sid, elite: u.elite,
                aura: u.aura || "#8e2de2", bio: u.bio || "",
                ip: requester.elite ? u.ip : "SÉCURISÉ"
            }));
            io.to(sid).emit('update_users', safeList);
        });
    }

    // --- MESSAGERIE PRIVÉE ---
    socket.on('private_msg', (d) => {
        const msg = { from: socket.id, name: users[socket.id].name, text: d.text, to: d.to };
        io.to(d.to).emit('private_msg', msg);
        socket.emit('private_msg', msg); // Retour pour l'expéditeur
    });

    // --- APPEL & SIGNALING ---
    socket.on('call_request', (d) => io.to(d.to).emit('incoming_call', { signal: d.signal, from: socket.id, name: users[socket.id].name, pp: users[socket.id].pp }));
    socket.on('call_accept', (d) => io.to(d.to).emit('call_finalized', d.signal));
    socket.on('ice_candidate', (d) => io.to(d.to).emit('ice_candidate', d.candidate));

    socket.on('chat_msg', (d) => io.emit('chat_msg', d));
    socket.on('disconnect', () => { delete users[socket.id]; broadcastSync(); });
});

http.listen(3000, () => console.log("NEBULA_SUPREME_V29"));
