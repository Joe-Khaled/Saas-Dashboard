const express=require('express');
const router=express.Router();
const verifyToken=require('../middlewares/verifyToken');
const allowedTo=require('../middlewares/allowedTo');
const controllers=require('../controllers/widget');

router.post('/',verifyToken,allowedTo('ADMIN','MANAGER'),controllers.makeNewWidget);
router.get('/',verifyToken,controllers.retriveAllWidgets);
router.get('/:id',verifyToken,controllers.retriveWidgetById);
router.put('/:id',verifyToken,controllers.updateWidgetById);
router.delete('/:id',verifyToken,controllers.deleteWidgetById);

module.exports=router;