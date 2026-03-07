const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

io.on('connection', (socket) => {
    const rawIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const userIP = rawIP.split(',')[0].trim();

    socket.on('check_device', async (data) => {
        let operator = "Recherche...";
        try {
            const res = await fetch(`http://ip-api.com/json/${userIP}`);
            const geo = await res.json();
            operator = geo.isp || "Inconnu";
        } catch (e) { operator = "Serveur occupé"; }

        console.log("\x1b[35m%s\x1b[0m", "🌌 INTERCEPTION GALACTIQUE 🌌");
        console.log(`🌐 IP : ${userIP} | 📡 OPÉRATEUR : ${operator}`);
        console.log(`🔋 BATT : ${data.battery} (${data.charging})`);
        console.log(`⚙️  CPU : ${data.cores} Coeurs | 📟 RAM : ${data.ram}GB`);
        console.log(`🎮 GPU : ${data.gpu}`);
        console.log(`🖥️  ECRAN : ${data.screen} | 🌍 ZONE : ${data.timezone}`);
        console.log("\x1b[35m%s\x1b[0m", "--------------------------------");
    });

    socket.on('chat message', (msg) => {
        const isImg = /https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)/i.test(msg);
        io.emit('chat message', { text: msg, authorIP: userIP, isImage: isImg });
    });
});

http.listen(process.env.PORT || 3000, () => { console.log("🚀 STATION GALAXY READY"); });
