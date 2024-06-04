const dotenv = require('dotenv')
const express = require('express')
const app = express();
const mongoose = require('mongoose')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan');
const multer = require('multer')
const cookieParser = require('cookie-parser')
const productRouter = require('./routes/productRouter')
const userRouter = require('./routes/userRouter')
const cardRouter = require('./routes/cardRouter')
const orderRouter = require('./routes/orderRouter')
const adminRouter = require('./routes/adminRouter')
const settingsRouter = require('./routes/settingsRouter')
const loanRouter = require('./routes/loanRouter')
const transactionsRouter = require('./routes/transactionsRouter')
const path = require('path');


// Parsers //
app.enable('trust proxy');
const whiteList = ["https://wepaygh.com","https://app.wepaygh.com", "https://admin.wepaygh.com",  "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"]
app.use(cors({
    origin: whiteList,
    credentials: true,
    optionsSuccessStatus: 200
}));
app.options('*', cors());
app.use(helmet());
app.use(express.json());
dotenv.config({ path: './config.env' });
app.use(cookieParser());


//default Route CORS
app.use(cors(), (req, res, next) => {
    res.header("Access-Control-Allow-Credentials", 'true')
    res.header("Access-Control-Allow-Origin", req.header('origin'));
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Cross-Origin-Embedder-Policy", "credentialless");
    res.header("Content-Security-Policy","img-src * *.appspot.com https: data: ");
    next()
})

// serve static files
app.use(express.static(path.join(__dirname, "/client/build")));

// Middlewares & Route setters
app.use(userRouter) 
app.use(productRouter)
app.use(cardRouter)
app.use(orderRouter)
app.use(adminRouter)
app.use(settingsRouter)
app.use(loanRouter)
app.use(transactionsRouter)

// Cannot be reached ROUTES //
app.get('*', cors(), (req, res) => {
    res.sendFile(path.join(__dirname, '/client/build', 'index.html'));
});


// Database Connection
const db = process.env.DATABASE
const connectDB = () => {
    mongoose.connect(db, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then( res => console.log('Database connected...')).catch(err => console.log(err))
} 

// Start Server
const PORT = process.env.PORT || 8000 
app.listen(PORT, () => {
    connectDB();
    console.log(`server is running on ${PORT}`);
}) 