const express = require('express')
const router = express.Router()
const { createProduct, getAllProducts, getOneProduct } = require('../controllers/productController')
const { upload } = require('../controllers/imageController')


// product routes
router.route('/api/v1/product/new').post(upload.array('gallery[]'), createProduct)
router.route('/api/v1/product').get(getAllProducts)
router.route('/api/v1/product/:id').get(getOneProduct)


module.exports = router


