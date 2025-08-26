const express=require('express');
const router=express.Router();
const controllers=require('../controllers/report');

router.post('/',controllers.generateNewReport);

module.exports=router;