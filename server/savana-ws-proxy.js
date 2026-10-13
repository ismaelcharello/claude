const net = require("node:net");

/**
 * Pipes the browser's /api/savana/ws WebSocket upgrade to the local Savana
 * backend (savana/server) so the browser only talks to this same origin.
 * The backend validates the Origin header itself.
 */
const createSavanaWsProxy = ({ port = 3100, host = "127.0.0.1" } = {}) => {
  const handleUpgrade = (req, socket, head) => {
    const upstream = net.connect({ port, host }, () => {
      const lines = [`${req.method} /ws HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
      if (head && head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    const close = () => {
      upstream.destroy();
      socket.destroy();
    };
    upstream.on("error", () => {
      if (socket.writable) socket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      close();
    });
    socket.on("error", close);
    upstream.on("close", () => socket.destroy());
    socket.on("close", () => upstream.destroy());
  };
  return { handleUpgrade };
};

module.exports = { createSavanaWsProxy };
