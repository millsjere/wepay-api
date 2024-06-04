const express = require('express');
const { adminOnly } = require('../controllers/adminController');
const { protect } = require('../controllers/authController');
const { getOneOrder, getUserOrders, getAllOrders, newOrder } = require('../controllers/orderController');
const router = express.Router()



//routes all orders for admins
router.route('/api/v1/orders').get(adminOnly, getAllOrders)

router.route('/api/v1/orders').post(protect, newOrder)

router.route('/api/v1/orders/:id').get(protect, getOneOrder)
router.route('/orders/user').get(protect, getUserOrders)


module.exports = router