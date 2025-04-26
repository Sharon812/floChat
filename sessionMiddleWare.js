const session = require("express-session");

const sessionMiddleWare = session({
  secret: "chat-session-secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: null, // 🔥 helps with session recognition in dev
  },
});

const wrap = (expressMiddleWare) => (socket, next) =>
  expressMiddleWare(socket.request, {}, next);

module.exports = { sessionMiddleWare, wrap };
