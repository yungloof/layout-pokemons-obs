const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

const port = process.env.PORT || 3000;
const stateFile = path.join(__dirname, 'teams_state.json');

// Initialize state for multiple rooms
let teamsState = { default: Array(6).fill("") };

// Load saved state if exists
if (fs.existsSync(stateFile)) {
    try {
        const data = fs.readFileSync(stateFile, 'utf8');
        teamsState = JSON.parse(data);
    } catch (e) {
        console.error("Erro ao ler teams_state.json", e);
    }
}

function saveState() {
    fs.writeFileSync(stateFile, JSON.stringify(teamsState));
}

io.on('connection', (socket) => {
    console.log('Um socket se conectou!');
    
    // Default room
    socket.room = 'default';

    // Cliente pede para entrar em uma sala específica
    socket.on('joinRoom', (room) => {
        if (!room) room = 'default';
        console.log(`Socket entrou na sala: ${room}`);
        
        // Sai da sala anterior se houver
        if (socket.room) {
            socket.leave(socket.room);
        }
        
        socket.room = room;
        socket.join(room);

        // Se a sala não existe no estado, cria com time vazio
        if (!teamsState[room]) {
            teamsState[room] = Array(6).fill("");
        }

        // Envia o time atual APENAS para quem acabou de entrar
        socket.emit('teamUpdate', teamsState[room]);
    });

    // Friend updates a slot
    socket.on('updateSlot', (data) => {
        const { index, pokemon } = data;
        const room = socket.room;
        
        if (index >= 0 && index < 6) {
            if (!teamsState[room]) teamsState[room] = Array(6).fill("");
            teamsState[room][index] = pokemon;
            saveState();
            // Broadcast the new team ONLY to everyone in this room
            io.to(room).emit('teamUpdate', teamsState[room]);
            console.log(`Sala [${room}] - Slot ${index} atualizado para ${pokemon}`);
        }
    });

    // Friend clears a slot
    socket.on('clearSlot', (index) => {
        const room = socket.room;
        
        if (index >= 0 && index < 6) {
            if (!teamsState[room]) teamsState[room] = Array(6).fill("");
            teamsState[room][index] = "";
            saveState();
            io.to(room).emit('teamUpdate', teamsState[room]);
            console.log(`Sala [${room}] - Slot ${index} limpo`);
        }
    });
});

server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`- OBS Overlay: http://localhost:${port}/obs.html`);
    console.log(`- Admin Panel:     http://localhost:${port}/admin.html`);
});
