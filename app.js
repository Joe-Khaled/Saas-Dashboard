require('dotenv').config();
const express=require('express');
const app=express()
const PORT=process.env.PORT
const authRoutes=require('./routes/auth')
const userRoutes=require('./routes/user')
const widgetRoutes=require('./routes/widget')
const reportRoutes=require('./routes/report')
const integrationsRoutes=require('./routes/integrations');
const passport=require('passport');
const passportSetup=require('./config/passport-setup');
const session=require('express-session');
const cookieParser=require('cookie-parser');
const cors = require('cors');
const path =require('path');
const {checkReportsJobsNextRun}=require('./jobs/generate_report');
app.set('view engine','ejs')

app.use(cors({
  origin: `http://localhost:${process.env.PORT}`,
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ limit:'32mb',extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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

checkReportsJobsNextRun();
app.listen(PORT,()=>{
    console.log(`app listening on port ${PORT}`);
})