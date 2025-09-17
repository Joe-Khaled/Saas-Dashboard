const { io } = require("socket.io-client");
const socket = io("http://localhost:5000"); 

socket.on("connect", () => {
  console.log("connected:", socket.id);

  socket.emit("trackEvent", { UserId: 1, EventType: "login", MetaData: { device: "cli" }});
});

socket.on("newEvent", (ev) => {
  console.log("newEvent:", ev);
});

socket.on("disconnect", () => console.log("disconnected"));
