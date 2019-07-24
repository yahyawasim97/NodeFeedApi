const Post = require('../models/post');
const {validationResult} =require('express-validator');
const fs = require('fs');
const path = require('path');
const User =require('../models/user');
const io  =require('../socket');
exports.getPosts =async(req,res,next)=>{
    try{
        const currentPage = req.query.page ||1;
        const perPage =2;
        const totalItems = await Post.find().countDocuments()
        const posts = await  Post.find().populate('creator')
        .sort({createdAt:-1})
        .skip((parseInt(currentPage-1)*perPage)).limit(perPage);
        res.status(200).json({
            message:'fetched posts',
            posts,
            totalItems
        })
    }catch(err){
        if(!err.statusCode){
            err.statusCode=500;
        };
        next(err);
    }
    
    
    
    // res.status(200).json({
    //     posts:[{
    //         _id:'1',
    //         title:'First',content:'This is my first post',imageUrl:'images/sample.jpg',
    //         creator:{
    //         name:'Yahya',
    //         createdAt:new Date()
    //     }}]
    // });
};

exports.createPost=async(req,res,next)=>{
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        const  error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode=422;
        throw error;
    }
    if(!req.file){
        const  error = new Error('No Image Provided');
        error.statusCode=422;
        throw error;
    }
    let imageUrl =req.file.path.toString();
    imageUrl = imageUrl.replace('\\','/');
    const title = req.body.title;
    const content = req.body.content;
    let creator= req.userId
    const post = new Post({
        title,
        content,
        imageUrl:imageUrl,
        creator:req.userId
    });
   try{ 
    await post.save()
    const user = await User.findById(req.userId);
    creator=user;
    user.posts.push(post);
    await user.save();
    io.getIO().emit('posts',{action:'create',post:{...post._doc,creater:{_id:req.userId,name:user.name}}});
    res.status(201).json({
        message:'Post created',
        post:post,
        creator:{_id:creator._id,name:creator.name}
    });
}catch(err){
    if(!err.statusCode){
        err.statusCode=500;
    };
    next(err);
}
    
};

exports.getPost =(req,res,next)=>{
    const postId =req.params.postId;
    Post.findById(postId).populate('creator').then(post=>{
        if(!post){
            const  error = new Error('Could not find post.');
            error.statusCode=422;
            throw error;
        }
        return res.status(200).json({
            message:'Post Fetched',
            post
        });
    }).catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        };
        next(err);
    })
};

exports.updatePost=(req,res,next)=>{
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        const  error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode=422;
        throw error;
    }
    const postId = req.params.postId;
    const title= req.body.title;
    const content= req.body.content;
    let imageUrl =req.body.image;
    
    if(req.file){
        imageUrl = req.file.path.replace('\\','/')
    }
    if(!imageUrl){
        const error = new Error('No File Picked');
        error.statusCode(422);
        throw error;
    }
    Post.findById(postId).populate('creator')
    .then(post=>{
        if(!post){
            const  error = new Error('Could not find post.');
            error.statusCode=422;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId.toString()){
            const  error = new Error('Not Authorized');
            error.statusCode=403;
            throw error;
        }
        if(imageUrl !==post.imageUrl){
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        return post.save();
    })
    .then(result=>{
        io.getIO().emit('posts',{action:'update',post:result})
        res.status(200).json({message:'Succesfully Update',post:result})
    })
    .catch((err)=>{
        if(!err.statusCode){
            err.statusCode=500;
        };
        next(err);
    })
};

exports.deletePost=(req,res,next)=>{
    const postId =req.params.postId;
    Post.findById(postId).then(post=>{
        if(!post){
            const  error = new Error('Could not find post.');
            error.statusCode=422;
            throw error;
        }
        if(post.creator.toString() !== req.userId.toString()){
            const  error = new Error('Not Authorized');
            error.statusCode=403;
            throw error;
        }
        clearImage(post.imageUrl);
        return Post.findByIdAndRemove(postId).then(result=>{
            return User.findById(req.userId);
            
        })
        .then(user=>{
            user.posts.pull(postId);
            return user.save();
        })
        .then(result=>{       
            io.getIO().emit('posts',{action:'delete',post:postId})
            res.status(200).json({message:'Post Deleted Successfully'})
        })

    }).catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        };
        next(err);
    })
}

const clearImage =(filePath)=>{
    filePath = path.join(__dirname,'..',filePath);
    fs.unlink(filePath,err=>console.log(err));
}
