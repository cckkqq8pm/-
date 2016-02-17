
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var fs = require('fs');
var Schema = require('node-protobuf').Protobuf;
var schema = new Schema(fs.readFileSync('./protoc_desc/chat.desc'));
var Format = require('./public/javascripts/util.js').Format;
var config = require('./public/javascripts/config.js').config();
var crypto = require('crypto');
var redis = require('redis').createClient(6379);
var ejs = require('ejs');
var mysql=require("mysql");
var pool = mysql.createPool(
    config.MYSQL
);
var csrf = require('./public/javascripts/util.js').csrf;
var amqp = require("amqp");
var amqp_connection = null;
// 共有的exchange
var public_exchange = null;
// 私有的 exchange
var private_exchange = null;

//csrf的白名单,以下ip不需要检查csrf token
var allow_ips=[];


var app = express();

// all environments
app.set('port', process.env.PORT || 8081);
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('sctalk admin manager'));
app.use(express.session());
app.use(express.static(path.join(__dirname, 'public')));

app.engine('.html', ejs.__express);
app.set('view engine', 'ejs');

app.use(csrf(allow_ips));
app.use(function(req,res,next){
    var token = req.session._csrf;
    res.locals._csrf=token;
    var cookie = req.cookies['csrf_token'];

    if(token && cookie!=token){
        res.cookie('csrf_token',token);
    }
    next();
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.use(app.router);

app.get('/login', routes.login);
app.get('/users', user.list);
app.post('/check_login/',function(req,res){
    var username=req.body.username;
    var pwd=req.body.pwd;
    var sessionid = req.sessionID;
    pwd=crypto.createHash('sha1').update(pwd).digest('hex');
    var query_string=Format('select * from chat_user where username={0} and password={1}',mysql.escape(username),mysql.escape(pwd));
    pool.getConnection(function(err,connection){
        if(err){
            throw err;
        }
        connection.query(query_string,function(err,rows){
            if(err){
                throw err;
            }
            var rsdic={'ret':'ok','data':rows};
            rsdic['sessionid']=sessionid;
            rsdic['username']=username;
            req.session.username = username;
            res.send(rsdic);
            //在使用连接后释放数据库连接
            connection.release();
        });
    })
});

app.get('/index',function(req,res){
    if(req.session.username != undefined){
        var query_string = Format("update chat_user set online=1 where username={0}" ,mysql.escape(req.session.username));
        //用户登录状态存到mysql
        pool.getConnection(function(err,connection){
            if(err){
                throw err;
            }
            connection.query(query_string,function(err){
                if(err){
                    throw err;
                }
                //用户登录状态存到redis
                redis.set(req.sessionID+' online','1',function(err,reply){
                    if(err){
                        throw err;
                    }
                    res.render("index",{'username':req.session.username,'sessionid':req.sessionID});
                    connection.release();
                });
            });
        });
    }else{
        res.send('Your session has expired , please login again!');
    }
});
//用户基本信息
app.post('/get_user_basic_info',function(req,res){
    if(req.session.username!=undefined){
        var username=req.body.username;
        getUserBasicInfo(username,function(rows){
            var rsdic={'ret':'ok'};
            rsdic['user_avatar']=rows.avatar;
            req.session.username=username;
            res.send(rsdic);
        });
    }else{
        res.send("Your session has expired , please login again!");
    }
});

//进入房间后，加载对手信息
app.post('/get_opponent_infos',function(req,res){
    if(req.session.username!=undefined){
        var deskid = req.body.deskid;
        var color = req.body.opponent_color;
        var desk = chess_rooms[deskid];
        if(color==1){
            var opponent = desk.client_one;
        }else{
            var opponent = desk.client_two;
        }
        if(opponent){
            var opponent_name = opponent.username;
            getUserBasicInfo(opponent_name,function(rows){
                var rsdic={'ret':'ok'};
                rsdic['user_avatar']=rows.avatar;
                rsdic['user_name']=opponent_name;
                res.send(rsdic);
            });
        }else{
            var rsdic={'ret':'no_opponent'};
            res.send(rsdic);
        }
    }else{
        res.send("Your session has expired , please login again!");
    }
});

//登出
app.post('/logout',function(req,res){
    if(req.session.username!=undefined){
        var query_string = Format("update chat_user set online=0 where username={0}" ,mysql.escape(req.session.username));
        //用户登录状态存到mysql
        pool.getConnection(function(err,connection){
            if(err){
                throw err;
            }
            connection.query(query_string,function(err){
                if(err){
                    throw err;
                }
                //用户登录状态存到redis
                redis.set(req.sessionID+' online','0',function(err,reply){
                    if(err){
                        throw err;
                    }
                    res.send({'ret':'ok'});
                    connection.release();
                });
            });
        });
    }else{
        res.send("Your session has expired , please login again!");
    }
});


//查用户信息
function getUserBasicInfo(username,cb){
    var query_string=Format("select avatar from chat_user where username={0}",mysql.escape(username));
    pool.getConnection(function(err,connection){
        if(err){
            throw err;
        }
        connection.query(query_string,function(err,rows){
            if(err){
                throw err;
            }
            connection.release();
            cb(rows[0]);
        });
    });
}

var server = http.createServer(app);
// 客户端 与 服务器的socket连接
var client_sockets = {};
// 每个用户 queue
var client_queues = {};

//现在只定义4个房间 id号1 2 3 4
var chess_rooms={
    '1':{'client_one':null,'client_two':null},
    '2':{'client_one':null,'client_two':null},
    '3':{'client_one':null,'client_two':null},
    '4':{'client_one':null,'client_two':null}
};
//重新连接计时器
var timers={};



var io = require('socket.io').listen(server);

io.sockets.on('connection',function(socket){

     socket.logged = false;
     socket.username = '';

     socket.on('link_rabbitmq', function(message){

         if(typeof message == 'string'){
             var buf = new Buffer(message,'base64');
             var chat_message = schema.Parse(buf,'Chat.ChatMessage');
         }else if(typeof message == 'object'){
             var mes = [];
             mes.length=getMessageLength(message);
             for(var i=0;i<mes.length;i++){
                 mes[i]=message[i];
             }
             var chat_message = schema.Parse(new Buffer(mes),'Chat.ChatMessage');
         }

         var message_stub = schema.Parse(chat_message.messageBuff,'Chat.LoginRequest');
         socket.username = message_stub.username;
         socket.sessionid = message_stub.sessionid;

         //deskid==0表示还没有加入房间
         socket.deskid = 0;
         socket.ready = 0;
         //color表示哪一方 红方/黑方
         socket.color = null;
         client_sockets[message_stub.sessionid]=socket;
         clearTimeout(timers[message_stub.sessionid]);
         
         amqp_connection = amqp.createConnection(config.AMQP);
         amqp_connection.on('ready', function(){
             // 需要两个exchange进行消息发送，
             public_exchange = amqp_connection.exchange("public_exchange", {type:'fanout', durable:true});
             private_exchange = amqp_connection.exchange("private_exchange", {type:'direct', durable:true});
             amqp_connection.queue("receive_queue_" + socket.sessionid, {durable: true , autoDelete:true}, function(queue){
                 // fanout的exchange不处理路由建， 这里把路由建指定为任何都可以
                 queue.bind(public_exchange, '#');
                 queue.bind(private_exchange, 'private_'+socket.sessionid);
                 queue.subscribe(function(message, header, deliverlyInfo){
                     send_message(message, socket);
                 });
                 client_queues[socket.sessionid] = queue;
             });
         });
     });

     socket.on('message',function(message){
         if(public_exchange == null){
             console.log("exchange not build");
             return;
         }
         try{
             if(typeof message == 'string'){
                 var buf = new Buffer(message,'base64');
                 var chat_message=schema.Parse(buf,'Chat.ChatMessage');
                 handle_message(chat_message, socket);
             }else if(typeof message == 'object'){
                 var mes = [];
                 mes.length=getMessageLength(message);
                 for(var i=0;i<mes.length;i++){
                     mes[i]=message[i];
                 }
                 var chat_message=schema.Parse(new Buffer(mes),'Chat.ChatMessage');
                 handle_message(chat_message,socket);
             }
         }catch(err){
             console.log(err);
         }
     });

     socket.on('disconnect' , function(){
         var sessionid = socket.sessionid;
         if(client_sockets[sessionid]==undefined)return;
         //backToMainHall(socket.username,socket.sessionid,socket.deskid,socket.color);
         var timer = setTimeout(function(){
             messageServerLogOut(socket.username,socket.sessionid);
         },5000);
         timers[sessionid] = timer;
     });
});
server.listen(8081);


//处理消息
function handle_message(message, socket){
    var message_type = message.ChatMessageType;
    switch(message_type){
        case "CHATREQUEST":
            var chat_message_stub = schema.Parse(message.messageBuff,'Chat.ChatContent');
            public_exchange.publish('', {'chatContent':chat_message_stub.chatContent, 'username':chat_message_stub.username,
                                        'sessionid':chat_message_stub.sessionid, 'ChatMessageType':'CHATRESPONSE'},
                                        {contentType: 'application/json'});
            break;
        case "SINGLEROOMENTER":
            var message_stub = schema.Parse(message.messageBuff,'Chat.SingleRoomEnter');
            enterChessRoom(message_stub.username,message_stub.sessionid,message_stub.deskid);
            break;
        case "PREPAREDREADY":
            var message_stub = schema.Parse(message.messageBuff,'Chat.PreparedReady');
            preparedReady(message_stub.username,message_stub.sessionid,message_stub.ready);
            break;
        case "BACKTOMAINHALL":
            var message_stub = schema.Parse(message.messageBuff,'Chat.BackToMainHall');
            backToMainHall(message_stub.username,message_stub.sessionid,message_stub.deskid,message_stub.color);
            break;
        case "SENDPLAYMAP":
            var message_stub = schema.Parse(message.messageBuff,'Chat.SendPlayMap');
            sendPlayMap(message_stub.username,message_stub.sessionid,message_stub.playMap, message_stub.delete_key);
            break;
        case 'PLAYWIN':
            var message_stub = schema.Parse(message.messageBuff,'Chat.SendPlayMap');
            playWin(message_stub.username,message_stub.sessionid);
            break;
        case "LOGOUT":
            var message_stub = schema.Parse(message.messageBuff,'Chat.LogOut');
            messageServerLogOut(message_stub.username,message_stub.sessionid);
            break;
    }
}

// 发送消息
function send_message(message, socket){
    var message_type = message.ChatMessageType;
    var response = {};
    switch(message_type){
        case "CHATRESPONSE":
            var response_stub = {username:message.username, sessionid:message.sessionid, chatContent:message.chatContent};
            response['ChatMessageType'] = 'CHATRESPONSE';
            response['messageBuff'] = schema.Serialize(response_stub,'Chat.ChatContent');
            var buff = schema.Serialize(response,'Chat.ChatMessage');
            var message = new Buffer(buff).toString('base64');
            socket.send(message);
            break;
        case "SINGLEROOMRESPONSE":
            var response_stub = {username:message.username, sessionid:message.sessionid, status:message.status,
                                        color:message.color, message_content:message.message_content};
            response['ChatMessageType']='SINGLEROOMRESPONSE';
            response['messageBuff']=schema.Serialize(response_stub,'Chat.StatusResponse');
            var buff=schema.Serialize(response,'Chat.ChatMessage');
            var message=new Buffer(buff).toString('base64');
            socket.send(message);
            break;
        case "READRESPONSE":
            var response_stub = {username:message.username, sessionid:message.sessionid, readyType:message.readyType};
            response['ChatMessageType']='READRESPONSE';
            response['messageBuff']=schema.Serialize(response_stub,'Chat.ReadyResponse');
            var buff=schema.Serialize(response,'Chat.ChatMessage');
            var message=new Buffer(buff).toString('base64');
            socket.send(message);
            break;
        case "BACKHALLRESPONSE":
            var response_stub = {'username':message.username, 'sessionid':message.sessionid, 'color':message.color};
            response['ChatMessageType']='BACKHALLRESPONSE';
            response['messageBuff']=schema.Serialize(response_stub,'Chat.BackHallResponse');
            var buff=schema.Serialize(response,'Chat.ChatMessage');
            var message=new Buffer(buff).toString('base64');
            socket.send(message);
            break;
        case "SENDPLAYMAP":
            var response_stub = {'username':message.username,'sessionid':message.sessionid,
                                'playMap':message.playMap,'delete_key':message.delete_key};
            response['ChatMessageType']='SENDPLAYMAP';
            response['messageBuff']=schema.Serialize(response_stub,'Chat.SendPlayMap');
            var buff=schema.Serialize(response,'Chat.ChatMessage');
            var message=new Buffer(buff).toString('base64');
            socket.send(message);
            break;
        case "PLAYWIN":
            //把失败的消息发给对手
            var response_stub = {'username':message.username,'sessionid':message.sessionid};
            response['ChatMessageType']='PLAYWIN';
            response['messageBuff']=schema.Serialize(response_stub,'Chat.PlayWin');
            var buff=schema.Serialize(response,'Chat.ChatMessage');
            var message=new Buffer(buff).toString('base64');
            socket.send(message);
            break;
    }
}

//玩家进入房间的消息
function enterChessRoom(username,sessionid,deskid){
    var client = client_sockets[sessionid];
    if(client==undefined){
        //这里需要日至记录
        console.log("client error no such client"+sessionid);
        return;
    }
    var desk=chess_rooms[deskid];
    //判断房间是否已满
    if(desk.client_one==null){
        client.deskid=deskid;
        desk.client_one=client;
        desk.client_one.color='RED';
        var response_stub = {username:username,sessionid:sessionid,status:1,color:'RED',message_content:Format("deskid={0}",deskid),
                            ChatMessageType:"SINGLEROOMRESPONSE"};
        var opponent = desk.client_two;
    }else if(desk.client_two==null){
        client.deskid=deskid;
        desk.client_two=client;
        desk.client_two.color='BLACK';
        var response_stub = {username:username,sessionid:sessionid,status:1,color:'BLACK',message_content:Format("deskid={0}",deskid),
                            ChatMessageType:"SINGLEROOMRESPONSE"};
        var opponent = desk.client_one;
    }else{
        client.deskid=0;
        var response_stub = {username:username,sessionid:sessionid,status:0,color:'NULL',message_content:"The room has no place",
                            ChatMessageType:"SINGLEROOMRESPONSE"};
    }

    //发送自己的信息给对手
    if(opponent){
        getUserBasicInfo(username, function(rows){
            var opponent_response_stub = {username:username, sessionid:sessionid, status:2, color:'NULL',
                message_content:Format("{\"username\":\"{0}\",\"avatar\":\"{1}\",\"color\":\"{2}\"}",username,rows.avatar,client.color),
                ChatMessageType:"SINGLEROOMRESPONSE"};
            private_exchange.publish("private_" + opponent.sessionid, opponent_response_stub, {contentType: 'application/json'});
        });
    }
    private_exchange.publish("private_" + sessionid, response_stub, {contentType: 'application/json'});
}

//准备游戏，如果当前房间两个玩家都准备好则开始
function preparedReady(username,sessionid,ready){
    var client = client_sockets[sessionid];
    if(client == undefined){
        //这里需要日至记录
        console.log("client error no such client"+sessionid);
        return;
    }
    client.ready = parseInt(ready);
    var desk = chess_rooms[client.deskid];
    var response_stub = {username:username, sessionid:sessionid};
    //房间内有两个人
    if(desk.client_one != null && desk.client_two != null){
        if(client==desk.client_one){
            var opponent=desk.client_two;
        }else{
            var opponent=desk.client_one;
        }
        //双方都准备好则开始
        if(desk.client_one.ready==1 && desk.client_two.ready==1){
            response_stub['readyType'] = 'BOTHREADY';
        }else if(ready==0){ //r取消准备
            response_stub['readyType'] = 'UNREADY';
        }else{
            response_stub['readyType'] = 'SINGLEREADY';
        }

    }else if(desk.client_one!=null || desk.client_two!=null) { //只有一方在房间内
        if (ready == 0) { //r取消准备
            response_stub['readyType'] = 'UNREADY';
        } else {
            response_stub['readyType'] = 'SINGLEREADY';
        }
    }
    response_stub['ChatMessageType'] = 'READRESPONSE';
    private_exchange.publish("private_" + sessionid, response_stub, {contentType: 'application/json'});
    if(response_stub.readyType=='BOTHREADY'){
        //给下棋双方都发通知消息
        private_exchange.publish("private_" + opponent.sessionid, response_stub, {contentType: 'application/json'});
    }
}

//回到大厅
function backToMainHall(username,sessionid,deskid,color){
    var leave_client=client_sockets[sessionid];
    leave_client.deskid = 0;
    leave_client.ready=0;
    leave_client.color=null;
    var desk=chess_rooms[deskid];
    //红方离开
    if(color=='RED'){
        desk['client_one']=null;
        var opponent=desk['client_two'];
    }else if(color=='BLACK'){ //黑方离开
        desk['client_two']=null;
        var opponent=desk['client_one'];
    }
    //如果有对手，通知对手退出
    if(opponent!=null){
        opponent.ready = 0;
        var response_stub = {'username':username, 'sessionid':sessionid, 'color':color, 'ChatMessageType':'BACKHALLRESPONSE'};
        private_exchange.publish("private_" + opponent.sessionid, response_stub, {contentType: 'application/json'});
    }
}

//发送下棋步骤
function sendPlayMap(username, sessionid, playMap, delete_key){
    var client = client_sockets[sessionid];
    var desk = chess_rooms[client.deskid];
    if(client==desk.client_one){
        var opponent = desk.client_two;
    }else if(client==desk.client_two){
        var opponent = desk.client_one;
    }
    if(!opponent){
        console.log('no opponent');
        return;
    }
    for(var i=0;i<playMap.length;i++){
        playMap[i]=playMap[i].split(',');
    }
    var response_stub = {'username':opponent.username, 'sessionid':opponent.sessionid,
                        'playMap':playMap, 'delete_key':delete_key, 'ChatMessageType':'SENDPLAYMAP'};
    private_exchange.publish('private_' + opponent.sessionid, response_stub, {contentType: 'application/json'});
}

//下棋获胜
function playWin(username,sessionid){
    var client = client_sockets[sessionid];
    var desk = chess_rooms[client.deskid];
    if(client==desk.client_one){
        var opponent = desk.client_two;
    }else if(client==desk.client_two){
        var opponent = desk.client_one;
    }
    //把失败的消息发给对手
    var response_stub = {'username':opponent.username, 'sessionid':opponent.sessionid, 'ChatMessageType':'PLAYWIN'};
    private_exchange.publish('private_' + opponent.sessionid, response_stub, {contentType: 'application/json'});
}

//登出
function messageServerLogOut(username, sessionid){
    var client = client_sockets[sessionid];
    //判断是否在房间内
    if(client.deskid != 0){
        var color = client.color;
        var deskid = client.deskid;
        if(color=='RED'){
            chess_rooms[deskid].client_one = null;
            var opponent = chess_rooms[deskid].client_two;
        }else if(color=='BLACK'){
            chess_rooms[deskid].client_two = null;
            var opponent = chess_rooms[deskid].client_one;
        }
        //把登出消息发给对手
        if(opponent){
            opponent.ready = 0;
            var response_stub = {'username':username, 'sessionid':sessionid, 'color':color, 'ChatMessageType':'BACKHALLRESPONSE'};
            private_exchange.publish("private_" + opponent.sessionid, response_stub, {contentType: 'application/json'});
        }
    }
    var self_queue = client_queues[sessionid];
    self_queue.destroy();
    delete client_queues[sessionid];
    delete client_sockets[sessionid];
}


//消息长度
function getMessageLength(mes){
    var count = 0;
    for(var key in mes){
        count++;
    }
    return count;
}
