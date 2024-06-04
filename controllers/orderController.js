const Order = require("../models/orderModel")
const Card = require("../models/cardModel")
const User = require("../models/userModel")
const Cart = require("../models/cartModel")
const Notification = require("../models/notificationModel")
const Audit = require("../models/auditModel")



exports.getAllOrders = async(req,res) => {
    try {
        const orders = await Order.find().populate('user').sort('-createdAt');
        if(!orders){
            throw Error('No orders found')
        }

        // res to client
        res.status(200).json({
            status: 'success',
            data: orders
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.getOneOrder = async(req,res) => {
    try {
        const { id } = req.params.id
        const order = await Order.findById({_id: id}.populate('user'));
        if(!order){
            throw Error('No orders found')
        }

        // res to client
        res.status(200).json({
            status: 'success',
            data: order
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}


exports.getUserOrders = async(req,res, next) => {
    try {
        const orders = await Order.find({userID: req.user.id}).populate('user').sort('-createdAt');
       // console.log(orders)
        if(!orders){
            throw Error('No orders found')
        }

        // res to client
        res.status(200).json({
            status: 'success',
            data: orders
        })
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }
}

exports.newOrder = async(req,res) => {
    
    try {
        const code = Math.floor(Math.random() * 90000) + 10000

        // check the card details
        const { cardName, cardNumber, expiryMonth, expiryYear, cvv} = req.body
        const card = await Card.find({number: cardNumber});
        console.log(card)
        if(!card[0]){
            throw Error('Invalid credentials, no card found')
        }
        if(card[0].expiry.month != expiryMonth || card[0].expiry.year != expiryYear || card[0].cvv != cvv ){
            throw Error('Invalid card details')
        }
        if(card[0].status === 'inactive'){
            throw Error('Sorry, card is inactive. Contact WePayGh support')
        }

        if(card[0].amount < req.body.total){
            throw Error('Sorry, insufficient balance. Topup your account')
        }

        // check for card user
        const user = await User.findById({_id: card[0].user})
        console.log(user)
        if(!user){ throw Error('No user: Invalid card details')}
        if(user.fullname !== cardName){ throw Error('Invalid card details') }

        // create a new order
        const order = await Order.create({
            transactionID: 'WPG' + code,
            userID: user._id,
            shipping: {
                name: req.body.name,
                address: req.body.address,
                city: req.body.city,
                phone: req.body.phone
            },
            delivery: req.body.delivery,
            cart: req.body.cart,
            total: req.body.total
        })
        if(!order){
            throw Error('Sorry, order could not be created')
        }

        // do reduction from card amount
        card[0].amount = card[0].amount - req.body.total
        await card[0].save()
        
        // remove items from cart
        for (let i = 0; i < req.body.cart.length; i++) {
            const element = req.body.cart[i];
            await Cart.findByIdAndDelete({_id: element._id})
            console.log('Cart item removed')   
        }
        
        
        // send an email to user & admins

        // create a Notification
        await Notification.create({
            user: user._id,
            title: 'New Order',
            body: 'Thank you for placing your order. We are currently processing your order. You will be notified when we are done processing'
        })

        //send Audit Trail
        await Audit.create({
            user: user._id,
            title: 'New Order',
            name: user.name,
            email: user.email,
            role: user.role
        })

        //res to client
        res.status(200).json({
            status: 'success',
            data: order
        })

    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error,
            message: error.message
        })
    }

}