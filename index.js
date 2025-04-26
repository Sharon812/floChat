const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { sessionMiddleWare, wrap } = require("./sessionMiddleWare");
const env = require("dotenv").config();

// Secret code for accessing the chat
const SECRET_CODE = "jayarajan";

// Initialize app
const app = express();
const server = http.createServer(app);
// Set up session

// app.use(cookieParser("chat-session-secret")); // Match this with your session secret

app.use(sessionMiddleWare);
// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});
// Connected users
const users = {};

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.authenticated) {
    return next();
  }
  res.redirect("/");
}

// Routes
app.get("/", (req, res) => {
  req.session.destroy();
  res.render("login");
});

app.post("/verify", (req, res) => {
  const { code, username } = req.body;

  if (code === SECRET_CODE) {
    req.session.authenticated = true;
    req.session.username = username;

    req.session.save((err) => {
      if (err) {
        return res.render("login", { error: "Something went wrong" });
      }
      res.redirect("/chat");
    });
  } else {
    res.render("login", { error: "Invalid secret code" });
  }
});

app.get("/chat", isAuthenticated, (req, res) => {
  res.render("chat", { username: req.session.username });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

const io = socketIo(server);

io.use(wrap(sessionMiddleWare));

// Socket.io setup
io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.username) {
    next();
  } else {
    next(new Error("Unauthorized"));
  }
});

// io.use((socket, next) => {
//   console.log("📎 Socket connection init");
//   console.log("📎 Cookies from socket:", socket.handshake.headers.cookie);

//   if (socket.request.session) {
//     console.log(
//       "📎 Session exists! Username:",
//       socket.request.session.username
//     );
//     next();
//   } else {
//     console.log("❌ No session found on socket.");
//     next(new Error("Unauthorized"));
//   }
// });

// io.use((socket, next) => {
//   const rawCookie = socket.handshake.headers.cookie || "";
//   const parsedCookies = cookie.parse(rawCookie);
//   console.log("🍪 Parsed cookies:", parsedCookies);

//   next(); // continue to sharedSession
// });

io.on("connection", (socket) => {
  const username = socket.request.session?.username;

  if (!username) {
    socket.disconnect();
    return;
  }

  users[socket.id] = username;

  socket.broadcast.emit("message", {
    username: "System",
    text: `${username} has joined the chat`,
    time: new Date().toLocaleTimeString(),
  });

  io.emit("userList", Object.values(users));

  socket.on("chatMessage", (msg) => {
    io.emit("message", {
      username,
      text: msg,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on("disconnect", () => {
    io.emit("message", {
      username: "System",
      text: `${username} has left the chat`,
      time: new Date().toLocaleTimeString(),
    });

    delete users[socket.id];
    io.emit("userList", Object.values(users));
  });
});
// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
