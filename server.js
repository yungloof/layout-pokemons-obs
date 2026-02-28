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
const stateFile = path.join(__dirname, 'team_state.json');

// Initialize state
let teamState = Array(6).fill("");

// Load saved state if exists
if (fs.existsSync(stateFile)) {
    try {
        const data = fs.readFileSync(stateFile, 'utf8');
        teamState = JSON.parse(data);
    } catch (e) {
        console.error("Erro ao ler team_state.json", e);
    }
}

function saveState() {
    fs.writeFileSync(stateFile, JSON.stringify(teamState));
}

io.on('connection', (socket) => {
    console.log('Um visualizador se conectou!');
    
    // When someone connects, send them the current team immediately
    socket.emit('teamUpdate', teamState);

    // Friend updates a slot
    socket.on('updateSlot', (data) => {
        const { index, pokemon } = data;
        if (index >= 0 && index < 6) {
            teamState[index] = pokemon;
            saveState();
            // Broadcast the new team to everyone (OBS and other Admin panels)
            io.emit('teamUpdate', teamState);
            console.log(`Slot ${index} atualizado para ${pokemon}`);
        }
    });

    // Friend clears a slot
    socket.on('clearSlot', (index) => {
        if (index >= 0 && index < 6) {
            teamState[index] = "";
            saveState();
            io.emit('teamUpdate', teamState);
            console.log(`Slot ${index} limpo`);
        }
    });
});

server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`- OBS Overlay: http://localhost:${port}/obs.html`);
    console.log(`- Admin Panel:     http://localhost:${port}/admin.html`);
});
