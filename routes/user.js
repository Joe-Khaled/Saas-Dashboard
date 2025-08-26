const express=require('express');
const router=express.Router();
const verifyToken = require('../middlewares/verifyToken');
const upload=require('../middlewares/multer');
const controller=require('../controllers/user');
const allowedTo = require('../middlewares/allowedTo');

router.get('/',verifyToken,allowedTo('ADMIN','MANAGER'),controller.getUsers);
router.get('/:id',verifyToken,controller.getUserById)
router.post('/profile',upload.single('profilePic'),verifyToken,controller.updateProfilePic)


module.exports=router;