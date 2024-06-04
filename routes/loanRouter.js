const express = require('express');
const multer = require('multer');
const { standingOrderStorage, payslipStorage } = require('../cloudinary');
const { adminOnly } = require('../controllers/adminController');
const { protect } = require('../controllers/authController');
const { getAllLoans, editLoan, requestLoan, makeLoanPayment, getUserPayments, getAllPayments, confirmUserPayment, deleteUserPayment, updateSDO, approveDeniedLoan, denyLoan, reverseLoan } = require('../controllers/loanController');
const router = express.Router();

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



//get settings
router.route('/api/v1/loans').get(adminOnly, getAllLoans)
router.route('/api/v1/loan').patch(protect, uploadStandingOrder.single('sdo'), updateSDO, requestLoan)
router.route('/api/v1/topup').patch(protect, requestLoan)
router.route('/api/v1/loan/deny').patch(adminOnly, denyLoan)
router.route('/api/v1/loan/reverse').patch(adminOnly, reverseLoan)
router.route('/api/v1/loan/reject').patch(adminOnly, approveDeniedLoan)
router.route('/api/v1/loan/payment').post(adminOnly, makeLoanPayment)
router.route('/api/v1/payment').get(protect, getUserPayments)
router.route('/api/v1/allpayments').get(adminOnly, getAllPayments)
router.route('/api/v1/user-payment').patch(adminOnly, confirmUserPayment).delete(adminOnly, deleteUserPayment)
router.route('/api/v1/user-payment/:id').delete(adminOnly, deleteUserPayment)

module.exports = router