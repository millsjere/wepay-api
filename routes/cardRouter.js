const express = require('express')
const { adminOnly } = require('../controllers/adminController')
const { protect } = require('../controllers/authController')
const { getAllCards, newCard, getOneCard, updateCard } = require('../controllers/cardController')
const router = express.Router()


router.route('/api/v1/cards').get(adminOnly, getAllCards)
router.route('/api/v1/cards/user').get(protect, getOneCard)
router.route('/api/v1/cards').post(adminOnly, newCard).patch(adminOnly, updateCard)


module.exports = router
