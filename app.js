require('dotenv').config();
const express=require('express');
const app=express()
const PORT=process.env.PORT
const authRoutes=require('./routes/auth')
const userRoutes=require('./routes/user')
const widgetRoutes=require('./routes/widget')
const reportRoutes=require('./routes/report')
const integrationsRoutes=require('./routes/integrations');
const subscriptionControllers=require('./controllers/subscriptions')
const passport=require('passport');
const passportSetup=require('./config/passport-setup');
const session=require('express-session');
const cookieParser=require('cookie-parser');
const cors = require('cors');
const path =require('path');
const { PrismaClient }=require('@prisma/client');
const prisma=new PrismaClient()
const {checkReportsJobsNextRun}=require('./jobs/generate_report');
const { Server }=require('socket.io')
const http = require("http");
const subscriptionRoutes=require('./routes/subscriptions');
const webhook=require('./controllers/subscriptions').webhook;
const bodyParser=require('body-parser');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5000",
    credentials: true,
  },
});

io.on("connection", (socket) => {

  console.log("🔥 New client connected:", socket.id);

    socket.on("trackEvent", async (data) => {
    console.log("Event received:", data);
    let created = null;
    const metaData=JSON.stringify(data.MetaData);
    try {
      created = await prisma.analytics.create({
        data: {
          UserId: data.UserId ?? 0,
          EventType: data.EventType,
          MetaData: metaData
        }
      });
    } catch (err) {
      console.error("Failed to save analytics:", err.message);
    }

    io.emit("newEvent", created ?? { ...data, saved: false, ts: new Date().toISOString() });
  });


  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
  
});

app.set('view engine','ejs')


app.use(cors({
  origin: `http://localhost:5000`,
  credentials: true 
}));

app.use('/api/subscriptions/webhook',bodyParser.raw({ type: "application/json" }),webhook)
app.use(express.json());
app.use(express.urlencoded({ limit:'32mb',extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'views')));

app.use(session({
    secret: process.env.SESSION_KEY, 
    resave: false,
    saveUninitialized: false
}));
app.use(cookieParser());
//initialize passport 
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth',authRoutes)
app.use('/api/user',userRoutes)
app.use('/api/widget',widgetRoutes)
app.use('/api/report',reportRoutes);
app.use('/api/crm',integrationsRoutes);
app.use('/api/subscriptions',subscriptionRoutes);

checkReportsJobsNextRun();
server.listen(PORT,()=>{
    console.log(`app listening on port ${PORT}`);
})