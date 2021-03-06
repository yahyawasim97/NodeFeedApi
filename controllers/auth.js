const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
const {validationResult} = require('express-validator');

exports.signup=(req,res,next)=>{
    const errors =validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation Failed');
        error.statusCode =422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    console.log(email);
    const password = req.body.password;
    const name = req.body.name;
    bcrypt.hash(password,12)
    .then(hashedPassword=>{
        const user = new User({
            email,
            password:hashedPassword,
            name
        });
        console.log(user,'Current User');
        return user.save();
    })
    .then(result=>{
        res.statusCode(201).json({message:'User created',userId: result._id});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        };
        next(err);
    })
    
}
exports.login= (req,res,next)=>{
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    User.findOne({email:email})
    .then(user=>{
        console.log(user,'Current User');
        if(!user){
            const error = new Error('A user with this email could not be found.');
            error.statusCode=401;
            throw error;
        }
        loadedUser = user;
        return bcrypt.compare(password,user.password);
    })
    .then(isEqual=>{
        if(!isEqual){
            const error = new Error('Wrong Credentials');
            error.statusCode=401;
            throw error;
        }
        const token = jwt.sign({email:loadedUser.email,userId:loadedUser._id.toString()},'supersecret',{expiresIn:'1h'});
        res.status(200).json({token:token,userId:loadedUser._id.toString()});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        };
        next(err);
    })
}