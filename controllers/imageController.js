const multer = require('multer')

// Image Processing MULTER //
const storage = multer.memoryStorage();

// create upload method to handle files
exports.upload = multer({
    storage : storage,
    // fileFilter : (req, file, cb) => {
    //     if(file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg'){
    //         cb(null, true)
    //     }else{
    //         cb(null, false)
    //         req.fileError = 'Only .png, .jpg and .jpeg files allowed!';
    //     }
        
    // },
    // limits : {fileSize : 500000} //max-file size 0.5MB
});


// exports.resizeImage = (req, res, next) => {
//         // check for file upload error from Multer
//         if(req.fileError){
//             res.status(500).json({
//                 status : 'failed',
//                 error : 'Image file format',
//                 message : req.fileError
//             })
//         }
    
//         // set file name and storage using Sharp 
//         // console.log(req.files)
//         sharp(req.files[0].buffer)
//         .resize(500, 500)
//         .toFormat('jpeg')
//         .jpeg({quality: 90})
//         //    .toFile(`public/uploads/users/${req.file.filename}`);
    
//         next();

    
//  }