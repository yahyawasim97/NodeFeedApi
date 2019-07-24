let io;
module.exports={
    init:httpServer=>{
       io= require('socket.io')(httpServer);
       return io;
    },
    getIO:()=>{
        if(!io){
            throw Error('Socket IO not intialized');
        }
        return io;
    }
};