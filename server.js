const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Specific route for test mode
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory rooms: Map<code, { host: ws, guest: ws, board: null }>
const rooms = new Map();

function generateCode() {
    let code;
    do {
        code = String(Math.floor(10000 + Math.random() * 90000));
    } while (rooms.has(code));
    return code;
}

function send(ws, type, data) {
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type, data }));
    }
}

wss.on('connection', (ws) => {
    ws._roomCode = null;
    ws._role = null; // 'host' or 'guest'

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        const { type, data } = msg;

        switch (type) {
            case 'host': {
                const code = generateCode();
                rooms.set(code, { 
                    host: ws, 
                    guest: null, 
                    isTestMode: !!data.isTestMode 
                });
                ws._roomCode = code;
                ws._role = 'host';
                send(ws, 'hosted', { code });
                console.log(`Room ${code} created (Test Mode: ${!!data.isTestMode})`);
                break;
            }

            case 'join': {
                const code = data.code;
                const room = rooms.get(code);
                if (!room) {
                    send(ws, 'error', { message: 'Room not found' });
                    break;
                }
                if (room.isTestMode !== !!data.isTestMode) {
                    console.log(`Room ${code} join REJECTED: Mode mismatch (Room: ${room.isTestMode}, Guest: ${!!data.isTestMode})`);
                    send(ws, 'error', { message: 'mode_mismatch' });
                    break;
                }
                if (room.guest) {
                    send(ws, 'error', { message: 'Room is full' });
                    break;
                }
                room.guest = ws;
                ws._roomCode = code;
                ws._role = 'guest';

                // Notify both players the game is starting
                // Host is BLACK (1), Guest is WHITE (2)
                send(room.host, 'start', { color: 1, isTestMode: room.isTestMode });
                send(room.guest, 'start', { color: 2, isTestMode: room.isTestMode });
                console.log(`Room ${code}: game started (Test Mode: ${room.isTestMode})`);
                break;
            }

            case 'move':
            case 'pass':
            case 'resign':
            case 'mark_dead':
            case 'accept_score':
            case 'resume_game':
            case 'skill':
            case 'skill_pick':
            case 'draw_round': {
                const room = rooms.get(ws._roomCode);
                if (!room) break;
                // Relay to the other player
                const opponent = ws._role === 'host' ? room.guest : room.host;
                send(opponent, type, data);
                break;
            }
        }
    });

    ws.on('close', () => {
        if (ws._roomCode) {
            const room = rooms.get(ws._roomCode);
            if (room) {
                // Notify the other player
                const opponent = ws._role === 'host' ? room.guest : room.host;
                send(opponent, 'opponent_left', {});
                rooms.delete(ws._roomCode);
                console.log(`Room ${ws._roomCode} closed`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Go game server running at http://localhost:${PORT}`);
});
