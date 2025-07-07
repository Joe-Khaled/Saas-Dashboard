require('dotenv').config();
const express=require('express');
const app=express()
const PORT=process.env.PORT
const authControllers=require('./controllers/auth')
const userControllers=require('./controllers/user')
const widgetControllers=require('./controllers/widget')
const reportControllers=require('./controllers/report')
const integrationsControllers=require('./controllers/integrations');
const passport=require('passport');
const passportSetup=require('./config/passport-setup');
const session=require('express-session');
const {checkReportsJobsNextRun}=require('./jobs/generate_report');
app.set('view engine','ejs')

app.use(express.json());
app.use(express.urlencoded({ limit:'32mb',extended: true }));

app.use(session({
    secret: process.env.SESSION_KEY, 
    resave: false,
    saveUninitialized: false
}));

//initialize passport 
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth',authControllers)
app.use('/api/user',userControllers)
app.use('/api/widget',widgetControllers)
app.use('/api/report',reportControllers.router)
app.use('/api/crm',integrationsControllers);

checkReportsJobsNextRun();
app.listen(PORT,()=>{
    console.log(`app listening on port ${PORT}`);
})