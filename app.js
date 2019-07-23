const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer =require('multer');
const app = express();
const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const fileStorage = multer.diskStorage({
  destination:'images/',
  filename:(req,file,cb)=>{ 
    cb(null, Date.now().toString() + '-' +path.extname(file.originalname));
  }
})
const fileFilter =(req,file,cb)=>{
  if(file.mimetype ==='image/png' || file.mimetype ==='image/jpg' ||file.mimetype ==='image/jpeg'){
    cb(null,true);
  }else{
    cb(null,false);
  }
}
const MONGODB_URI='mongodb+srv://admin:Humidity123@cluster0-lcmm1.mongodb.net/api?retryWrites=true&w=majority';
app.use(bodyParser.json());
app.use(
  multer({storage:fileStorage,fileFilter:fileFilter}).single('image')
);
app.use('/images',express.static(path.join(__dirname,'images')));
app.use('/feed',feedRoutes);
app.use('/auth',authRoutes);
app.use((error,req,res,next)=>{
    const status =error.statusCode||500; 
    const message =error.message; 
    res.status(status).json({message});
})
app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    next();
});


mongoose
  .connect(MONGODB_URI,{ useNewUrlParser: true })
  .then(result => {
    app.listen(8080);
  })
  .catch(err => {
    console.log(err);
  });