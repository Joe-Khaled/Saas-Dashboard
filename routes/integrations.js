const express=require('express');
const router=express.Router();
const verifyToken = require('../middlewares/verifyToken');
const controllers=require('../controllers/integrations');
const allowedTo=require('../middlewares/allowedTo');

router.get('/oauth/callback',controllers.OAuthCallback)
router.get('/contacts',verifyToken,controllers.contacts)
router.get('/engagements',verifyToken,controllers.engagements)
router.get('/engagements/tasks',verifyToken,controllers.tasks)
router.post('/users',verifyToken,controllers.users)
router.get('/user/:id',controllers.userById)
router.delete('/:id',verifyToken,allowedTo('ADMIN','MANAGER'),controllers.deleteById)

module.exports=router;