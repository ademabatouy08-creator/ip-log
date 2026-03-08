const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; // { sid: { name, pp, ip, friends: [], bio } }
const groups = { "Général": { members: [] } };
const bannedIPs = new Set();

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();
    if (bannedIPs.has(ip)) socket.emit('CORE_MELTDOWN');

    socket.on('init_user', (data) => {
        users[socket.id] = { ...data, ip, sid: socket.id, friends: [], bio: "Nouvel utilisateur" };
        io.emit('update_users', Object.values(users));
    });

    // --- SYSTÈME D'AMIS ---
    socket.on('add_friend', (targetSid) => {
        if(users[targetSid]) {
            users[socket.id].friends.push(targetSid);
            io.to(targetSid).emit('notification', `${users[socket.id].name} vous a ajouté en ami !`);
        }
    });

    // --- SYSTÈME DE GROUPES ---
    socket.on('create_group', (groupName) => {
        if(!groups[groupName]) {
            groups[groupName] = { members: [socket.id] };
            io.emit('update_groups', Object.keys(groups));
        }
    });

    // --- APPEL SYNCHRONISÉ ---
    socket.on('call_user', (toSid) => {
        if(users[toSid]) {
            // On envoie le signal à la cible
            io.to(toSid).emit('incoming_call', { fromName: users[socket.id].name, fromPP: users[socket.id].pp, fromSid: socket.id });
            // On confirme à l'appelant que ça sonne
            socket.emit('calling_state', { toName: users[toSid].name, toPP: users[toSid].pp });
        }
    });

    socket.on('chat_msg', (data) => {
        if (data.text?.startsWith("/bomb ")) {
            const target = data.text.split(" ")[1];
            bannedIPs.add(target);
            Object.values(users).forEach(u => { if(u.ip.includes(target)) io.to(u.sid).emit('CORE_MELTDOWN'); });
        } else {
            io.emit('chat_msg', data);
        }
    });

    socket.on('disconnect', () => { delete users[socket.id]; io.emit('update_users', Object.values(users)); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("OMNIVERSE_V21_READY"));
