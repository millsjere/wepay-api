const express = require('express');
const { addTransactions } = require('../controllers/transactionsController');
const router = express.Router();

//USER TRANSACTIONS
router.route('/transactions/users').post(addTransactions )



module.exports = router