const Cart = require('../models/cartModel')
const jwt = require('jsonwebtoken')
const Product = require('../models/productModel')



exports.getUserCart = async(req, res) => {
    try {

        if(req.cookies.user_jwt) {
            //verify the token
            const decoded = jwt.verify(req.cookies.user_jwt, process.env.JWT_SECRET) 

            //find user in DB using 
            const userCart = await Cart.find({user: decoded.id}).select('-__v');
            if(userCart){
                //send res to client
                res.status(200).json({
                    status : "success",
                    data : userCart
                });

            }else{
                //send res to client
                res.status(200).json({
                    status : "no user cart",
                });
            }
          
        }else {
            //send res to client
            res.status(200).json({
                status : "no user found"
            })
        }

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.addToCart = async(req, res, next) => {
    //console.log(req.body)
    try {
        const user = req.user._id;
        const {product, quantity, paymentOption} = req.body

        //find the product & update
        const addProduct = await Product.findById({_id: product}).select('-__v')
        //create a cart
        const cart = await Cart.create({ 
             user,
             product: addProduct,
             payment: paymentOption, 
             quantity 
            });

        if(!cart){
            throw Error('Sorry, could not add product to cart')
        }
        //call next middleware
        next()

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.removeFromCart = async(req, res) => {
    try {
        await Cart.findByIdAndDelete({_id:req.params.id})
        // res sent to client
        res.status(204).json({
            status: 'success'
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.updateCart = async(req, res, next) => {
    try {
        // console.log(req.body)
        const {id, quantity} = req.body
        const cartItem = await Cart.findById({_id: id})
        
        if(!cartItem){
            throw Error('Sorry, something went wrong. Try again')
        } 
        cartItem.quantity = quantity
        await cartItem.save()

        next()

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}