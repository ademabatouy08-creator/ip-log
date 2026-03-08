const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

const users = {}; 
const bannedIPs = new Set();

io.on('connection', (socket) => {
    // CAPTURE DE L'IP (Priorité aux headers de Render/Proxys)
    const ip = (socket.handshake.headers['x-forwarded-for'] || 
                socket.conn.remoteAddress || 
                "0.0.0.0").split(',')[0].trim();

    // AUTO-DESTRUCTION : Si l'IP est dans la liste noire
    if (bannedIPs.has(ip)) {
        console.log(`[STRIKE] Cible bannie détectée : ${ip}`);
        socket.emit('CORE_MELTDOWN');
    }

    socket.on('init_user', (data) => {
        // On enregistre TOUT : IP, Hardware, PP et Nom
        users[ip] = { 
            ...data, 
            sid: socket.id, 
            ip: ip,
            status: "Online" 
        };
        
        console.log(`[+] NOUVELLE CIBLE : ${data.name} | IP: ${ip} | GPU: ${data.hw.gpu}`);
        io.emit('update_users', Object.values(users));
    });

    // GESTION DU CHAT (Texte + Images)
    socket.on('chat_msg', (data) => {
        const text = data.text ? data.text.trim() : "";
        
        if (text.startsWith("/bomb ")) {
            const target = text.split(" ")[1];
            bannedIPs.add(target);
            // On cherche toutes les instances de cette IP
            Object.keys(users).forEach(uIP => {
                if (uIP.includes(target)) io.to(users[uIP].sid).emit('CORE_MELTDOWN');
            });
        } else {
            // On renvoie le message (avec image si présente)
            io.emit('chat_msg', data);
        }
    });

    // SYSTÈME D'APPEL
    socket.on('request_call', (targetIP) => {
        const target = users[targetIP];
        if(target) {
            io.to(target.sid).emit('incoming_call', { 
                fromName: users[ip].name, 
                fromPP: users[ip].pp,
                fromIP: ip 
            });
        }
    });

    socket.on('disconnect', () => {
        delete users[ip];
        io.emit('update_users', Object.values(users));
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`AURORA_V19_RUNNING_ON_PORT_${PORT}`));
