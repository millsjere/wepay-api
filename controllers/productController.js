const Product = require('../models/productModel')
const slugify = require('slugify')
const firebaseStorage = require('../firebase/firebase');
const { ref, getDownloadURL, uploadBytesResumable } = require('firebase/storage')


exports.createProduct = async(req, res, next) => {
    console.log('Product hits')
    try {
    const { name, description, sku, tags, price, salePrice, instock } = req.body
    const category = slugify(req.body.category, {lower: true})
    const slug = slugify(name, {lower: true, remove: /[&*+~.()'"!:@]/g})
    const product = await Product.create({
            name, 
            description, 
            sku, instock,
            category, 
            tags, 
            salePrice,
            slug
        })
 

        if(!product){
            throw Error('Sorry something went wrong')
        }

    // 15% hire-purchase pricing
    let amount = parseInt(price)
    const threeMonths = ((amount * 0.15) + amount) / 3
    const sixMonths = ((amount * 0.25) + amount) / 6
    
    // update product data //
    product.sku = "WPG-PRD-" + sku.toUpperCase()
    product.price.oneMonth = price
    product.price.threeMonths = threeMonths * 3
    product.price.sixMonths = sixMonths * 6


        // upload images to FireStore
    for(let i = 0; i < req.files.length; i++){
        const storageRef = ref(firebaseStorage, `products/${product.id}/${product.name}/image-${i}`)
        const task = uploadBytesResumable(storageRef, req.files[i].buffer, {contentType: req.files[i].mimetype});
            task.on("state_changed", {
                'snapshot': null,
                'error': (err) => {
                    console.log(err)
                },
                'complete': async () => {
                    let url = await getDownloadURL(task.snapshot.ref)
                    // console.log(url)
                        product.images.push(url);
                        product.save()
                        }
                    })
                }
                console.log('its RATHER here')
        // send res to admin
        res.status(201).json({
            status: 'success',
            data: product
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
} 

exports.getAllProducts = async(req, res, next) => {
    try {
        const allProducts = await Product.find();
        if(!allProducts){
            throw Error('Sorry cannot fetch products')
        }

        // send res to Admin
        res.status(200).json({
            status: 'success',
            data: allProducts
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.getOneProduct = async(req, res, next) => {
    try {
        const product = await Product.find({_id: req.params.id});
        if(!product){
            throw Error('Sorry cannot fetch products')
        }

        // send res to Admin
        res.status(200).json({
            status: 'success',
            data: product
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}