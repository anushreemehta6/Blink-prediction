// socket-server.cjs
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Your Next.js app URL
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('👤 Trader connected:', socket.id);

  socket.on('join-asset-room', (symbol) => {
    // 1. Leave all previous asset rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
        updateRoomCount(room);
      }
    });

    // 2. Join the new asset room
    socket.join(symbol);
    console.log(`🚀 User joined room: ${symbol}`);
    updateRoomCount(symbol);
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        // We set a tiny timeout to calculate count after they leave
        setTimeout(() => updateRoomCount(room), 100);
      }
    });
  });

  function updateRoomCount(room) {
    const count = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('room-count-update', count);
  }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`📡 Socket Server live on http://localhost:${PORT}`);
});