const multer = require("multer");
const path = require("path");

// Set storage engine
const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'uploads');
    },
    filename: (req, file, cb) => {
        const ext=file.mimetype.split('/')[1];
        cb(null, file.originalname.split('.')[0]+'-'+Date.now().toString().substring(9)+'.'+ext);
    }
});

// File filter (optional: only accept images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"), false);
    }
};

// Upload middleware
const upload = multer({ 
    storage: storage, 
    limits: {
        fileSize: 5*1024*1024,           
        files: 1,               
        fieldNameSize: 100*1024,      
        fieldSize: Infinity,          
        fieldSize: 50 * 1024 * 1024,  
        fields: 1000,                 
        parts: 2000,                  
        headerPairs: 2000               
      },
    fileFilter: fileFilter
});
module.exports = upload;