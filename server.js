const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

let db;

(async () => {
    db = await open({ filename: './securite.db', driver: sqlite3.Database });
    await db.exec("CREATE TABLE IF NOT EXISTS blacklist (ip TEXT PRIMARY KEY)");
    await db.exec("CREATE TABLE IF NOT EXISTS banned_devices (device_id TEXT PRIMARY KEY)");
    
    console.log("\x1b[35m%s\x1b[0m", "========================================");
    console.log("\x1b[32m%s\x1b[0m", "   🚀 DEEP SCANNER OMNISCIENT ONLINE 🚀");
    console.log("\x1b[36m%s\x1b[0m", "      SURVEILLANCE TOTALE ACTIVÉE");
    console.log("\x1b[35m%s\x1b[0m", "========================================");
})();

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

io.on('connection', async (socket) => {
    const userIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    socket.on('check_device', async (data) => {
        socket.deviceId = data.id;

        // --- AFFICHAGE DE TOUTES LES INFOS POSSIBLES ---
        console.log("\x1b[35m%s\x1b[0m", "╔════════════ IDENTIFICATION CIBLE ════════════╗");
        console.log("\x1b[36m%s\x1b[0m", "  🌐 RESEAU IP     : " + userIP);
        console.log("\x1b[33m%s\x1b[0m", "  🆔 SIGNATURE UID : " + data.id);
        console.log("\x1b[32m%s\x1b[0m", "  📱 SYSTEME (OS)  : " + data.platform); 
        console.log("\x1b[32m%s\x1b[0m", "  🌐 NAVIGATEUR    : " + data.browser);
        console.log("\x1b[37m%s\x1b[0m", "  🖥️ RESOLUTION    : " + data.screen);
        console.log("\x1b[37m%s\x1b[0m", "  🌍 LANGUE        : " + data.lang);
        console.log("\x1b[34m%s\x1b[0m", "  ⏳ FUSEAU HORAIRE: " + data.timezone);
        console.log("\x1b[34m%s\x1b[0m", "  ⚙️  CPU CORES     : " + data.cores);
        console.log("\x1b[34m%s\x1b[0m", "  💾 RAM ESTIMÉE   : " + (data.ram || "Inconnue") + " GB");
        console.log("\x1b[35m%s\x1b[0m", "╚══════════════════════════════════════════════╝");

        const isBannedIP = await db.get("SELECT ip FROM blacklist WHERE ip = ?", [userIP]);
        const isBannedDevice = await db.get("SELECT device_id FROM banned_devices WHERE device_id = ?", [data.id]);

        if (isBannedIP || isBannedDevice) {
            console.log("\x1b[31m%s\x1b[0m", "  [!] CIBLE BANNIE DÉTECTÉE -> ÉJECTION IMMÉDIATE");
            socket.emit('erreur_critique', "ACCÈS RÉSEAU RÉVOQUÉ.");
            socket.disconnect();
            return;
        }
    });

    socket.on('chat message', async (msg) => {
        if (msg.startsWith('/ban ')) {
            const targetIP = msg.split(' ')[1];
            await db.run("INSERT OR IGNORE INTO blacklist (ip) VALUES (?)", [targetIP]);
            const allSockets = await io.fetchSockets();
            for (const s of allSockets) {
                const sIP = s.handshake.headers['x-forwarded-for'] || s.handshake.address;
                if (sIP === targetIP && s.deviceId) {
                    await db.run("INSERT OR IGNORE INTO banned_devices (device_id) VALUES (?)", [s.deviceId]);
                    s.emit('erreur_critique', "BAN DÉFINITIF.");
                    s.disconnect();
                }
            }
            io.emit('info', `CIBLE ${targetIP} NEUTRALISÉE.`);
            return;
        }
        io.emit('chat message', { text: msg, authorIP: userIP });
    });
});

http.listen(3000, () => { console.log(">>> Scanner prêt sur port 3000"); });