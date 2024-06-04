const express = require('express')
const router = express.Router();
const { getAuth, register, protect, verifyUser, logout, login, activateEmail, resendEmailVerification, updateDetails, updateDocuments, getAllUsers, createAdmin, loginAdmin, forgotPassword, resetPassword, updatePassword, setPopup, welcomePopup, updatePhoto, updatePaySlip, updateSDO, updateGhCard, isSubmittedPopup, getUser, resendVerficationCode, activateSMS, sendSMSActivationCode} = require('../controllers/authController')
const { getUserNotifications, markAsRead } = require('../controllers/notificationsController');
const multer = require('multer');

const {  photoStorage, ghCardStorage, standingOrderStorage, payslipStorage} = require('../cloudinary')

const upload = multer({
    storage: photoStorage,
    fileFilter: (req, file, cb) => {
        console.log(file)
        if(file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

const uploadGHCard = multer({
    storage: ghCardStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

const uploadPayslip = multer({
    storage: payslipStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(pdf|jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

const uploadStandingOrder = multer({
    storage: standingOrderStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(pdf|jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

// user routes
router.route('/api/v1/users').get(getAllUsers)

//notifications
router.route('/api/v1/notifications').get(getUserNotifications)
router.route('/api/v1/notifications/:id').patch(protect,markAsRead,getUserNotifications)


// AUTHENTICATE
router.route('/auth/request').get(getAuth)
router.route('/auth/login').post(login)
router.route('/auth/register').post(register)
router.route('/auth/email/:token').get(protect, activateEmail)
router.route('/auth/sms/:token').get(protect, activateSMS)
router.route('/auth/verify').post(protect, verifyUser)
router.route('/auth/code/email').get(protect, resendVerficationCode)
router.route('/auth/code/sms').get(protect, sendSMSActivationCode)


// RESET //
router.route('/auth/forgotpassword').post(forgotPassword)
router.route('/auth/resetpassword/:token').patch(resetPassword)

// USER ACCOUNT
router.route('/u/account/resendEmail').get(protect, resendEmailVerification)
router.route('/u/account/profile/photo').patch(protect, upload.single('photo'), updatePhoto )
router.route('/u/account/profile/ghcard').patch(protect, uploadGHCard.single('ghcard'), updateGhCard )
router.route('/u/account/profile/payslip').patch(protect, uploadPayslip.single('payslip'), updatePaySlip )
router.route('/u/account/profile/sdo').patch(protect, uploadStandingOrder.single('sdo'), updateSDO )
router.route('/u/account/profile/:field').patch(protect, updateDocuments )
router.route('/u/account/profile/edit/:name').patch(protect, updateDetails )
router.route('/u/account/settings').patch(protect, updatePassword )
router.route('/u/account/me').get(protect, getUser )



//USER POPUP
router.route('/u/account/popup/settings').get(protect, setPopup )
router.route('/u/account/popup/welcome').get(protect, welcomePopup )
router.route('/u/account/popup/submit').get(protect, isSubmittedPopup )

// LOGOUT
router.route('/auth/logout').get(logout)

module.exports = router