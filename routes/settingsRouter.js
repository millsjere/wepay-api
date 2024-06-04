const express = require('express');
const { adminOnly } = require('../controllers/adminController');
const { updateInterest, editInterest, getInterest } = require('../controllers/settingsController');
const router = express.Router();


//get settings
router.route('/api/v1/settings/interest').get(getInterest).patch( adminOnly, updateInterest)
router.route('/api/v1/settings/interest/edit').patch( adminOnly, editInterest)

module.exports = router