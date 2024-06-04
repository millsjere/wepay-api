const express = require('express')
const { standingOrderStorage, payslipStorage, ghCardStorage, photoStorage } = require('../cloudinary')
const { getRequest, verifyAdmin,loginAdmin, logoutAdmin, adminOnly, createAdmin, getAllAdmins, getAudits, approvalRequest, userApproval, updateUserDocuments, updateUserDetails, verifyUserEmail, passwordCheck, fetchVerifiedUsersFromRevPlus, fetchUserAccount, updateUserPhoto, updateUserPaySlip, updateUserGhCard, updateUserSDO, sendSMSMessage, smsCreditCheck } = require('../controllers/adminController')
const { getAllUsers } = require('../controllers/authController')
const { upload } = require('../controllers/imageController')
const router = express.Router()
const multer = require('multer');

const uploadUserPhoto = multer({
    storage: photoStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

const uploadUserGHCard = multer({
    storage: ghCardStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

const uploadUserPayslip = multer({
    storage: payslipStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(pdf|jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

const uploadUserStandingOrder = multer({
    storage: standingOrderStorage,
    fileFilter: (req, file, cb) => {
        if(file.originalname.match(/\.(pdf|jpg|jpeg|png)$/)) {
            cb(null, true);
        } else {
            return cb(null, false);
        }
    } 
})

router.route('/api/v1/admin').get(adminOnly, getAllAdmins)
router.route('/api/v1/audit').get(adminOnly, getAudits)
router.route('/admin/request').get(getRequest)
router.route('/admin/register').post(adminOnly, createAdmin)
router.route('/admin/user/:id/edit/:field').patch(adminOnly, updateUserDetails )
router.route('/admin/user/:id/photo').patch(adminOnly, uploadUserPhoto.single('photo'), updateUserPhoto )
router.route('/admin/user/:id/payslip').patch(adminOnly, uploadUserPayslip.single('payslip'), updateUserPaySlip )
router.route('/admin/user/:id/ghcard').patch(adminOnly, uploadUserGHCard.single('ghcard'), updateUserGhCard )
router.route('/admin/user/:id/sdo').patch(adminOnly, uploadUserStandingOrder.single('sdo'), updateUserSDO )
router.route('/admin/user/:id/:field').patch(adminOnly, upload.array('gallery[]'), updateUserDocuments )
router.route('/admin/user/verify-email').post(adminOnly, verifyUserEmail)
router.route('/admin/user/request').post(adminOnly, approvalRequest)
router.route('/admin/user/approval').post(adminOnly, userApproval)
router.route('/admin/user/sms').post(adminOnly, sendSMSMessage)
router.route('/admin/user/sms-credit').get(adminOnly, smsCreditCheck)
router.route('/admin/users/revplus').get(adminOnly, fetchVerifiedUsersFromRevPlus, getAllUsers)
router.route('/admin/users-account/fetch').get(adminOnly, fetchUserAccount, getAllUsers)

router.route('/admin/login').post(loginAdmin)
router.route('/admin/verify').post(adminOnly, verifyAdmin)
router.route('/admin/password-check').post(adminOnly, passwordCheck)
router.route('/admin/logout').get(logoutAdmin)


module.exports = router