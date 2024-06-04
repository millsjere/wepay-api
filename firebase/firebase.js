const { initializeApp } = require("firebase/app")
const { getStorage } = require("firebase/storage");


const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID
  };
 
  const app = initializeApp(firebaseConfig);
  const firebaseStorage = getStorage(app, "gs://wepay-20e3b.appspot.com");

  
  module.exports = firebaseStorage