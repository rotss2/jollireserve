const { WebSocketServer } = require("ws");

let wss;

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("🔌 WS client connected");

    ws.on("close", () => {
      console.log("🔌 WS client disconnected");
    });
  });

  return wss;
}

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

module.exports = { initWebSocket, broadcast };