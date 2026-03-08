/**
 * NEBULA ZZ - GALAXY OVERLORD SERVER V36
 * CORE VERSION: 36.0.4-EXTREME
 * AUTHOR: toucheur2pp
 */

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" }});
const fs = require('fs');

const PORT = process.env.PORT || 3000;

// --- REGISTRE AVANCÉ ---
const nebula_registry = {
    users: {},
    blacklist: new Set(),
    ghosts: new Set(), // IDs des utilisateurs en mode invisible
    rooms: { "WAR-ROOM": { id: "WAR", creator: "SYSTEM" } },
    config: {
        globalBG: "https://i.giphy.com/media/l0HlMG1W8f2U08I5G/giphy.gif",
        masterName: "toucheur2pp",
        securityLevel: "MAXIMUM"
    },
    stats: { totalMessages: 0, blocksAvoided: 0, sessionStart: Date.now() }
};

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    const cleanIp = rawIp.includes('::') ? "127.0.0.1" : rawIp.split(',')[0].trim();

    // SÉCURITÉ : Vérification Blacklist
    if (nebula_registry.blacklist.has(cleanIp)) {
        socket.emit('crash_now', 'SYSTEM BLACKLIST');
        return socket.disconnect();
    }

    // LOG DE CONNEXION AVANCÉ
    console.log(`[NETWORK] Nœud entrant : ${cleanIp} | Latence: ${socket.handshake.issued}`);

    socket.on('init_user', (data) => {
        const isMaster = (data.name === nebula_registry.config.masterName);
        nebula_registry.users[socket.id] = {
            sid: socket.id,
            name: data.name || "Drone",
            pp: data.pp || "https://api.dicebear.com/7.x/bottts/svg",
            ip: cleanIp,
            premium: isMaster ? true : false,
            chef: isMaster,
            badge: isMaster ? "EMPEROR" : "PILOT",
            lastSeen: Date.now()
        };
        
        socket.emit('update_bg', nebula_registry.config.globalBG);
        broadcastToChef(`[CONNEXION] ${data.name} a rejoint via ${cleanIp}`);
        syncAll();
    });

    // --- SYSTÈME DE MESSAGERIE CRYPTÉE ---
    socket.on('chat_msg', (msg) => {
        const u = nebula_registry.users[socket.id];
        if (!u) return;

        nebula_registry.stats.totalMessages++;
        const payload = {
            id: Math.random().toString(36).substr(2, 9),
            text: msg.text,
            name: u.name,
            premium: u.premium,
            chef: u.chef,
            badge: u.badge,
            encrypted: msg.isSecret || false
        };

        // Si le message est secret, on brouille le texte pour les non-premium
        Object.keys(nebula_registry.users).forEach(targetSid => {
            const target = nebula_registry.users[targetSid];
            let finalPayload = { ...payload };
            
            if (payload.encrypted && !target.premium) {
                finalPayload.text = "██████ ENCRYPTED BY PREMIUM ██████";
            }
            io.to(targetSid).emit('chat_msg', finalPayload);
        });

        broadcastToChef(`[MSG] ${u.name}: ${msg.text}`);
    });

    // --- COMMANDES DU CHEF (ROOT ACCESS) ---
    socket.on('admin_cmd', (data) => {
        const chef = nebula_registry.users[socket.id];
        if (!chef || !chef.chef) return;

        switch(data.type) {
            case 'BAN_IP':
                const targetIp = nebula_registry.users[data.target]?.ip;
                if (targetIp) {
                    nebula_registry.blacklist.add(targetIp);
                    io.to(data.target).emit('crash_now', 'CHEF BAN');
                    console.log(`[BAN] IP ${targetIp} bannie définitivement.`);
                }
                break;
            
            case 'TOGGLE_GHOST':
                if (nebula_registry.ghosts.has(socket.id)) nebula_registry.ghosts.delete(socket.id);
                else nebula_registry.ghosts.add(socket.id);
                syncAll();
                break;

            case 'SET_BADGE':
                if (nebula_registry.users[data.target]) {
                    nebula_registry.users[data.target].badge = data.badge;
                    syncAll();
                }
                break;

            case 'CLEAR_CHAT':
                io.emit('sys_clear');
                break;
        }
    });

    // --- GESTION PROFIL ---
    socket.on('update_profile', (d) => {
        if (nebula_registry.users[socket.id]) {
            nebula_registry.users[socket.id].pp = d.pp;
            broadcastToChef(`[PROFILE] ${nebula_registry.users[socket.id].name} a changé sa PP`);
            syncAll();
        }
    });

    // --- FONCTIONS SYNC ---
    function syncAll() {
        const allUsers = Object.values(nebula_registry.users);
        Object.keys(nebula_registry.users).forEach(sid => {
            const viewer = nebula_registry.users[sid];
            // On filtre les fantômes pour tout le monde SAUF pour le chef
            const filtered = allUsers.filter(u => {
                if (nebula_registry.ghosts.has(u.sid) && !viewer.chef) return false;
                return true;
            }).map(u => ({
                ...u,
                isGhost: nebula_registry.ghosts.has(u.sid),
                ip: viewer.premium ? u.ip : "HIDDEN"
            }));
            io.to(sid).emit('sync_users', filtered);
        });
    }

    function broadcastToChef(msg) {
        const masterSid = Object.keys(nebula_registry.users).find(id => nebula_registry.users[id].chef);
        if (masterSid) io.to(masterSid).emit('chef_log', { msg, time: new Date().toLocaleTimeString() });
    }

    socket.on('disconnect', () => {
        if (nebula_registry.users[socket.id]) {
            broadcastToChef(`[DEPART] ${nebula_registry.users[socket.id].name} a quitté.`);
            delete nebula_registry.users[socket.id];
            nebula_registry.ghosts.delete(socket.id);
            syncAll();
        }
    });
});

http.listen(PORT, () => console.log(`SYSTEM-ZZ v36 ONLINE ON PORT ${PORT}`));
