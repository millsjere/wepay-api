const dotenv = require('dotenv')
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
dotenv.config({path:"./config.env"})

cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET 
});

const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: (req, file) => {
      return `wepay/users/${req.params.id ? req.params?.id : req.user?.id}`
    },
    allowedFormats: ["jpeg", "png", "jpg"],
    public_id: (req, file) => `profilePhoto`
  },
});

const ghCardStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: (req, file) => `wepay/users/${req.params.id ? req.params?.id : req.user?.id}`,
      allowedFormats: ["jpeg", "png", "jpg"],
      public_id: (req, file) => `${new Date( Date.now()).getTime()}/Ghana_Card`
    },
  });

  const payslipStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: (req, file) => `wepay/users/${req.params.id ? req.params?.id : req.user?.id}`,
      allowedFormats: ["jpeg", "png", "jpg","pdf"],
      public_id: (req, file) => `${new Date( Date.now()).getTime()}/Pay_Slip`
    },
  });


  const standingOrderStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: (req, file) => `wepay/users/${req.params.id ? req.params?.id : req.user?.id}`,
      allowedFormats: ["jpeg", "png", "jpg","pdf"],
      public_id: (req, file) => `${new Date( Date.now()).getTime()}/Standing_Order`
    },
  });


  module.exports = { photoStorage, ghCardStorage, standingOrderStorage, payslipStorage }

