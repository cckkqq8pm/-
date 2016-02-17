//
////定义客户端对象
//USERCLIENT = function connectionClient(username,sessionid){
//    this.socket =  io.connect('//127.0.0.1:8081');
//    this.socket.on("connection",function(data){
//        console.log(data);
//    });
//    //接受从服务器回写的数据
//    this.socket.on('message',function(data){
//        var stream=new PROTO.Base64Stream(data);
//        var msg=new Chat.ChatMessage();
//        msg.ParseFromStream(stream);
//        switch (msg.ChatMessageType){
//            case Chat.ChatMessageType.LOGINREQUEST:
//                console.log('login success');
//                break;
//            case Chat.ChatMessageType.CHATRESPONSE:
//                var chatMessage=new Chat.ChatContent();
//                chatMessage.ParseFromArray(msg.messageBuff);
//                var send_user=chatMessage.username;
//                var chat_content=chatMessage.chatContent;
//                renderChatItem(send_user,chat_content);
//        }
//    });
//    this.username=username;
//    this.sessionid=sessionid;
//
//    this.setClientLogin =  setClientLogin;
//    this.sendChatMessage = sendChatMessage;
//
//}
//
////登录消息服务器
//function setClientLogin(username,sessionid){
//    try{
//        var message = new Chat.ChatMessage();
//        message.ChatMessageType = Chat.ChatMessageType.LOGINREQUEST;
//        var stub = new Chat.LoginRequest;
//        stub.sessionid = sessionid;
//        stub.username = username;
//        stub.SerializeToArray();
//        message.messageBuff = stub;
//        var stream = new PROTO.ArrayBufferStream;
//        message.SerializeToStream(stream);
//        var body = stream.getUint8Array();
//
//        this.socket.emit('message',body);
//    }catch(err){
//        console.log(err);
//    }
//}
//
////发送消息
//function sendChatMessage(chatMsg){
//    try{
//        var message = new Chat.ChatMessage();
//        message.ChatMessageType = Chat.ChatMessageType.CHATREQUEST;
//        var stub = new Chat.ChatContent;
//        stub.username=this.username;
//        stub.sessionid=this.sessionid;
//        stub.chatContent=chatMsg;
//        stub.SerializeToArray();
//        message.messageBuff = stub;
//        var stream_main = new PROTO.ArrayBufferStream;
//        message.SerializeToStream(stream_main);
//        var body = stream_main.getUint8Array();
//
//        this.socket.emit('message',body);
//    }catch(err){
//        console.log(err);
//    }
//}
//
////用户登录后，设置登录消息服务器
//function setWebClientLogin(username,sessionid){
//    if(username.length==0 || sessionid.length==0){
//        console.log('login error');
//        return;
//    }
//    userClient = new USERCLIENT(username,sessionid);
//    userClient.setClientLogin(username,sessionid);
//}
//
//
//
