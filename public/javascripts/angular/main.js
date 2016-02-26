//angular js module
var chatRoomIndex=angular.module('chatRoomIndex',['ngRoute','services','ngCookies']);

chatRoomIndex.config(function($httpProvider){

    function getCookie(name){
        var cookie_value = null;
        if(document.cookie && document.cookie!=null){
            var cookies = document.cookie.split(";");
            for(var i=0;i<cookies.length;i++){
                var cookie = cookies[i].trim();
                if(cookie.substring(0, name.length + 1) == (name + '=')){
                    cookie_value = decodeURIComponent(cookie.substring(name.length+1));
                }
            }
        }
        return cookie_value;
    }
    $httpProvider.defaults.headers.common['x-csrf-token'] = getCookie('csrf_token');
});

//init初始化 主界面的控制器
chatRoomIndex.controller("chatRoomMainController",["$scope","$routeParams","$compile","messageServer","getCanvasEvent","$http",
                        function($scope,$routeParams,$compile,messageServer,getCanvasEvent,$http){
    //定义4张桌子位置  桌子宽高一致
    //chari_1 chari_2 是桌子的两个位置信息，分别是x,y,width,height,raduis角度
    $scope.roomPosition=[{'deskid':1,'position_x':100,'position_y':70,'width':160,'chair_1':[155,20,50,40,10],'chair_2':[155,240,50,40,10]},
                         {'deskid':2,'position_x':360,'position_y':70,'width':160,'chair_1':[415,20,50,40,10],'chair_2':[415,240,50,40,10]},
                         {'deskid':3,'position_x':100,'position_y':350,'width':160,'chair_1':[155,300,50,40,10],'chair_2':[155,520,50,40,10]},
                         {'deskid':4,'position_x':360,'position_y':350,'width':160,'chair_1':[415,300,50,40,10],'chair_2':[415,520,50,40,10]}];
    //init onload
    $scope.$watch("$viewContentLoaded",function(){
        $scope.$parent.userinfo={};
        var username=angular.element(document.querySelector("#hidden_username")).text();
        var sessionid=angular.element(document.querySelector("#hidden_sessionid")).text();
        //为服务器消息接受注册回调函数
        messageServer.receiveMessage($scope.processMessage);
        //登陆websocket
        $scope.setWebClientLogin(username, sessionid);
        //绘制房间
        $scope.drawChessRooms();
        //获得用户个人基本信息
        $scope.getUserBasicInfo();
        // 初始化聊天区域
        $scope.initChatArea();
    });
    //点击发送消息
    $scope.clickSendMessage=function(){
        var message=angular.element(document.querySelector("#yourWord")).val();
        angular.element(document.querySelector("#yourWord")).val("");
        if(message.length==0){
            return;
        }
        var username=$scope.$parent.userinfo.username;
        var sessionid=$scope.$parent.userinfo.sessionid;
        messageServer.sendChatMessage(username,sessionid,message);
    };
    // 初始化聊天区域
    $scope.initChatArea = function(){

    }

    //用户登录后，设置登录消息服务器
    $scope.setWebClientLogin=function(username,sessionid){
        if(username.length==0 || sessionid.length==0){
            console.log('login error');
            return;
        }
        messageServer.setClientLogin(username,sessionid);
        $scope.$parent.userinfo.username=username;
        $scope.$parent.userinfo.sessionid=sessionid;
        $scope.$parent.userinfo.inRoom=false;
    };

    //处理服务器返回的消息
    $scope.processMessage=function(data){
        var stream=new PROTO.Base64Stream(data);
        var msg=new Chat.ChatMessage();
        msg.ParseFromStream(stream);
        switch (msg.ChatMessageType){
            case Chat.ChatMessageType.LOGINREQUEST:
                console.log('login success');
                break;
            case Chat.ChatMessageType.CHATRESPONSE:
                var chatMessage=new Chat.ChatContent();
                chatMessage.ParseFromArray(msg.messageBuff);
                var send_user=chatMessage.username;
                var chat_content=chatMessage.chatContent;
                $scope.renderChatItem(send_user,chat_content);
                break;
            case Chat.ChatMessageType.SINGLEROOMRESPONSE:
                var message=new Chat.StatusResponse();
                message.ParseFromArray(msg.messageBuff);
                var status=message.status;
                if(status==1){
                    var deskid=message.message_content.split('=')[1];
                    var color=message.color;
                    $scope.$emit("singleRoomEnter",$scope.$parent.userinfo,deskid,color);
                }else if(status==2){ //对手进入房间，通知以下
                    var opponent_infos=JSON.parse(message.message_content);
                    $scope.$emit("opponentRoomEnter",opponent_infos);
                }else{
                    var alert_message=message.message_content;
                    alert(alert_message);
                }
                break;
        }
    };

    //渲染聊天区域
    $scope.renderChatItem=function(username,message){
        var $html=angular.element(document.querySelector(".chat_bubble_template")).clone();
        $html.removeClass('chat_bubble_template');
        angular.element($html[0].querySelector(".chat_content")).text(message);
        angular.element($html[0].querySelector(".chat_user_info")).text(username);
        var $chat_content=angular.element(document.querySelector(".chat_content_nano_bar"));
        $chat_content.append($compile($html)($scope));
        // 消息到来时，让滚动条滚动到最下部
        var scrollContent = document.querySelector(".chat_bubble_content");
        scrollContent.scrollTop = scrollContent.scrollHeight - scrollContent.offsetHeight;
    };

    //绘制下棋房间 并注册事件
    $scope.drawChessRooms=function(){
        var roomCanvas=document.getElementById('room_canvas');
        //设置一下画布大小，适应浏览器大小
        roomCanvas.width=document.querySelector(".main_room_list").offsetWidth;
        roomCanvas.height=document.querySelector(".main_room_list").offsetHeight*1.2;
        var roomContext=roomCanvas.getContext('2d');
        //绘制象棋桌面 目前只绘制4个桌面
        var image=new Image();
        image.src="/images/xiangqi.png";
        //填充样式
        roomContext.strokeStyle="RGBA(60,255,255,0.5)";
        roomContext.lineWidth=2;
        //当image加载之后再显示.
        image.onload=function(){
            angular.forEach($scope.roomPosition,function(position){
                roomContext.drawImage(image,position.position_x,position.position_y,position.width,position.width);
                roomContext.roundRect(position.chair_1[0],position.chair_1[1],
                                      position.chair_1[2],position.chair_1[3],
                                      position.chair_1[4]);
                roomContext.stroke();
                roomContext.roundRect(position.chair_2[0],position.chair_2[1],
                                      position.chair_2[2],position.chair_2[3],
                                      position.chair_2[4]);
                roomContext.stroke();
            });
        };
        //注册点击事件
        roomCanvas.addEventListener('click',$scope.chatRoomClickListener);
        //鼠标移动到canvas上的事件
        roomCanvas.addEventListener('mousemove',$scope.chatRoomMouseMoveListener);
    };
    //房间的点击事件
    $scope.chatRoomClickListener=function(event){
        var point=getCanvasEvent.getPositionPoint(event);
        var deskid=getCanvasEvent.getHomeDesk(point,$scope.roomPosition);
        if(deskid!=null){
            messageServer.enterSingleRoom($scope.$parent.userinfo.username,$scope.$parent.userinfo.sessionid,deskid);
            $scope.$apply(function(){
                document.getElementsByClassName('main_frame_work')[0].style.display='none';
            });
        }
    };
    //鼠标移动到canvas上的事件
    $scope.chatRoomMouseMoveListener=function(event){
        var point=getCanvasEvent.getPositionPoint(event);
        var deskid=getCanvasEvent.getHomeDesk(point,$scope.roomPosition);
        var roomCanvas=document.getElementById('room_canvas');
        if(deskid==null){
            roomCanvas.style.cursor='auto';
        }else{
            roomCanvas.style.cursor='pointer';
        }
    };
    //获得用户个人基本信息
    $scope.getUserBasicInfo=function(){
        var postData={'username':$scope.$parent.userinfo.username,'sessionid':$scope.$parent.userinfo.sessionid};
        $http.post('/get_user_basic_info/',postData
        ).success(
            function(data){
                $scope.userinfo.avatar=data.user_avatar;
            }
        ).error(function(data){
                console.log(data);
        });
    };
}]);

//下棋房间的控制器
chatRoomIndex.controller('chatRoomSingleController',["$scope","$http","messageServer","getCanvasEvent","chessMan",
                         function($scope,$http,messageServer,getCanvasEvent,chessMan){

     //接受进入房间的消息
     $scope.$on("singleEoomEnterResponse",function(event){
        $scope.$parent.userinfo.gameReady=false;
        $scope.$parent.userinfo.isPlaying=false;
        document.getElementById('chatSingleRoom').style.display='block';
        //为服务器消息接受注册回调函数
        messageServer.receiveMessage($scope.singleRoomProcessMessage);
        //初始化用户信息
        if($scope.$parent.userinfo.color==1){
            var opponent_color = 2;
            angular.element(document.querySelector('.player_1').querySelector('.chess_avatar_player')).find('img')[0].src=$scope.$parent.userinfo.avatar;
            angular.element(document.querySelector('.player_1').querySelector('.chess_user_name')).text($scope.$parent.userinfo.username);
            document.querySelector('.player_1').querySelector('.user_infos_container').style.display='block';
        }else{
            var opponent_color = 1;
            angular.element(document.querySelector('.player_2').querySelector('.chess_avatar_player')).find('img')[0].src=$scope.$parent.userinfo.avatar;
            angular.element(document.querySelector('.player_2').querySelector('.chess_user_name')).text($scope.$parent.userinfo.username);
            document.querySelector('.player_2').querySelector('.user_infos_container').style.display='block';
        }
        //加载一下对手的信息
        $http.post('/get_opponent_infos/',{'deskid':$scope.$parent.userinfo.deskid , 'opponent_color':opponent_color}).success(
            function(data){
                if(data.ret=='no_opponent'){
                    return;
                }
                if(opponent_color == 1){
                    document.querySelector('.player_1').querySelector('.user_infos_container').style.display='block';
                    angular.element(document.querySelector('.player_1').querySelector('.chess_user_name')).text(data.user_name);
                    angular.element(document.querySelector('.player_1').querySelector('.chess_avatar_player')).find('img')[0].src=data.user_avatar;
                }else{
                    document.querySelector('.player_2').querySelector('.user_infos_container').style.display='block';
                    angular.element(document.querySelector('.player_2').querySelector('.chess_user_name')).text(data.user_name);
                    angular.element(document.querySelector('.player_2').querySelector('.chess_avatar_player')).find('img')[0].src=data.user_avatar;
                }
            }
        ).error(function(data){
            console.log(data);
        });
        $scope.drawChessDesk();
     });
     //处理消息服务器消息
     $scope.singleRoomProcessMessage=function(data){
         var stream=new PROTO.Base64Stream(data);
         var msg=new Chat.ChatMessage();
         msg.ParseFromStream(stream);
         switch (msg.ChatMessageType){
             case Chat.ChatMessageType.READRESPONSE:
                 var message=new Chat.ReadyResponse();
                 message.ParseFromArray(msg.messageBuff);
                 $scope.processReady(message.username,message.sessionid,message.readyType);
                 break;
             case Chat.ChatMessageType.BACKHALLRESPONSE:
                 var message=new Chat.BackHallResponse();
                 message.ParseFromArray(msg.messageBuff);
                 $scope.processOpponentLeave(message.color);
                 break;
             case Chat.ChatMessageType.SENDPLAYMAP:
                 var message=new Chat.SendPlayMap();
                 message.ParseFromArray(msg.messageBuff);
                 $scope.processNewPlayMap(message.playMap,message.delete_key);
                 break;
             case Chat.ChatMessageType.PLAYWIN:
                 $scope.processOpponentWin();
         }
     };
     //绘制棋盘
     $scope.drawChessDesk=function(){
         //开始绘制棋盘
        chessMan.initChessMan($scope.$parent.userinfo.color);
        //用户信息
        var userAvatar=angular.element(document.querySelector('.chess_avatar')).find('img');
        userAvatar[0].src=$scope.$parent.userinfo.avatar;
     };
     //点击棋盘的事件
     $scope.chessCanvasListener=function(event) {
         //不轮到自己，直接返回
         if(!$scope.$parent.userinfo.myturn){
             return;
         }
         var point=chessMan.getClickMan(event);
         //将棋盘保存以下，用于对比棋盘是否发生变化
         var tmpMap = chessMan.getNowPLayMap().mapCopy();
         //点中的是棋子
         if(point.isMan){
            var man=point.obj;
            if(man.my==true){
                if(chessMan.getNowPlayMan!=null)chessMan.getNowPlayMan.alpha=1;
                man.alpha=0.6;
                man.path=man.bl($scope.$parent.userinfo.color);
                chessMan.getNowPlayMan=man;
                chessMan.chessShow();
            }else{ //点对方的棋子，吃子
                if(chessMan.getNowPlayMan!=null && man.my==false){
                    if(chessMan.isPathOf(man)){
                        man.isShow=false;
                        var delete_man_key = man.key;
                        delete chessMan.getNowPLayMap()[chessMan.getNowPlayMan.y][chessMan.getNowPlayMan.x];
                        chessMan.getNowPLayMap()[man.y][man.x]=chessMan.getNowPlayMan.key;
                        chessMan.getNowPlayMan.x=man.x;
                        chessMan.getNowPlayMan.y=man.y;
                        chessMan.getNowPlayMan.alpha=1;
                        chessMan.getNowPlayMan=null;
                        chessMan.chessShow();
                        //点中老将，对方输
                        if(($scope.$parent.userinfo.color==1 && delete_man_key=='J0') || ($scope.$parent.userinfo.color==2 && delete_man_key=='j0')){
                            console.log('你赢了');
                            messageServer.playWin($scope.$parent.userinfo.username,$scope.$parent.userinfo.sessionid);
                            $scope.$parent.backToMainHall();
                        }
                    }
                }
            }
         }else{ //点击的不是棋子
            var point=point.obj;
            var nowPlayMan=chessMan.getNowPlayMan;
            if(nowPlayMan){
                if(chessMan.isPathOf(point)){
                    delete chessMan.getNowPLayMap()[nowPlayMan.y][nowPlayMan.x];
                    chessMan.getNowPLayMap()[point.y][point.x]=nowPlayMan.key;
                    nowPlayMan.alpha=1;
                    nowPlayMan.x=point.x;
                    nowPlayMan.y=point.y;
                    chessMan.getNowPlayMan=null;
                    chessMan.chessShow();
                }
            }
         }
         if(!chessMan.getNowPLayMap().mapEquals(tmpMap)){
             var nowPlayMap = chessMan.getNowPLayMap();
             var delete_man_key = delete_man_key || null;
             //把走法告知对方
             messageServer.sendPlayMap($scope.$parent.userinfo.username,
                 $scope.$parent.userinfo.sessionid,nowPlayMap,delete_man_key);
             $scope.$parent.userinfo.myturn=0;
         }
     };
     //点击准备完毕
     $scope.preparedReady=function(){
        if($scope.$parent.userinfo.gameReady==true){
            messageServer.preparedReady($scope.$parent.userinfo.username,$scope.$parent.userinfo.sessionid,0);
        }else{
            messageServer.preparedReady($scope.$parent.userinfo.username,$scope.$parent.userinfo.sessionid,1);
        }
     };
     //准备完毕处理
     $scope.processReady=function(username,sessionid,readyType){
         switch (readyType){
             case Chat.ReadyResponse.ReadyType.SINGLEREADY:
                 var readyButton = angular.element(document.querySelector('.chess-btn-ready'));
                 readyButton.text("取消准备");
                 $scope.$parent.userinfo.gameReady=true;
                 break;
             case Chat.ReadyResponse.ReadyType.BOTHREADY:
                 $scope.$parent.userinfo.isPlaying=true;
                 var chessCanvas=document.getElementById("chess_desk_canvas");
                 chessMan.chessShow();
                 chessCanvas.addEventListener('click',$scope.chessCanvasListener);
                 var readyButton = angular.element(document.querySelector('.chess-btn-ready'));
                 readyButton.text("准备");
                 break;
             case Chat.ReadyResponse.ReadyType.UNREADY:
                 var readyButton = angular.element(document.querySelector('.chess-btn-ready'));
                 readyButton.text("准备");
                 $scope.$parent.userinfo.gameReady=false;
                 break;
         }
     };
     //对手离开
     $scope.processOpponentLeave=function(opponent_color){
         $scope.$parent.userinfo.gameReady=false;
         $scope.$parent.userinfo.isPlaying=false;
         if(opponent_color==1){
             document.querySelector('.player_1').querySelector('.user_infos_container').style.display='none';
         }else{
             document.querySelector('.player_2').querySelector('.user_infos_container').style.display='none';
         }
         chessMan.chessClear($scope.$parent.userinfo.color);
     };
     //对方走子 重新绘制棋盘
     $scope.processNewPlayMap=function(playMap,delete_key){
         var newPlayMap=[];
         for(var i=0;i<playMap.length;i++){
             newPlayMap[i]=playMap[i].split(',');
             for(var j=0;j<newPlayMap[i].length;j++){
                 if(newPlayMap[i][j] == '')newPlayMap[i][j]=undefined;
             }
         }
         chessMan.setNowPlayMap(newPlayMap);
         if(delete_key != 'undefined'){
             chessMan.getMansList()[delete_key].isShow=false;
         }
         chessMan.chessShow();
         $scope.$parent.userinfo.myturn=1;
     };
     //对手获胜
     $scope.processOpponentWin=function(){
         console.log("你输了");
         $scope.$parent.backToMainHall();
     }
}]);

//总的控制器，负责监听子控制器之间的事件
chatRoomIndex.controller('parentController',['$scope','$http','messageServer',function($scope,$http,messageServer){
    $scope.userinfo={};
    //进入下棋房间的事件
    $scope.$on("singleRoomEnter",function(event,userinfo,deskid,color){
        $scope.userinfo.inRoom=true;
        $scope.userinfo.color=color;
        //红方先走
        if(color==1){
            $scope.userinfo.myturn=1;
        }else{
            $scope.userinfo.myturn=0;
        }
        $scope.userinfo.deskid=deskid;
        $scope.$broadcast('singleEoomEnterResponse');
    });
    //对手进入
    $scope.$on('opponentRoomEnter',function(event,opponent_infos){
        var opponent_name=opponent_infos.username;
        var avatar=opponent_infos.avatar;
        var color=opponent_infos.color;
        if(color=='RED'){
            document.querySelector('.player_1').querySelector('.user_infos_container').style.display='block';
            angular.element(document.querySelector('.player_1').querySelector('.chess_user_name')).text(opponent_name);
            angular.element(document.querySelector('.player_1').querySelector('.chess_avatar_player')).find('img')[0].src=avatar;
        }else if(color=='BLACK'){
            document.querySelector('.player_2').querySelector('.user_infos_container').style.display='block';
            angular.element(document.querySelector('.player_2').querySelector('.chess_user_name')).text(opponent_name);
            angular.element(document.querySelector('.player_2').querySelector('.chess_avatar_player')).find('img')[0].src=avatar;
        }
    });
    //回到大厅
    $scope.backToMainHall=function(){
        messageServer.backToMainHall($scope.userinfo.username,$scope.userinfo.sessionid,$scope.userinfo.deskid,$scope.userinfo.color);
        if($scope.userinfo.color==1){
            document.querySelector('.player_1').querySelector('.user_infos_container').style.display='none';
        }else{
            document.querySelector('.player_2').querySelector('.user_infos_container').style.display='none';
        }
        $scope.userinfo.gameReady=false;
        $scope.userinfo.isPlaying=false;
        $scope.userinfo.inRoom=false;
        $scope.userinfo.color=undefined;
        $scope.userinfo.myturn=undefined;
        $scope.userinfo.deskid=0;
        document.getElementsByClassName('main_frame_work')[0].style.display='block';
        document.getElementById('chatSingleRoom').style.display='none';
        document.querySelector('.player_1').querySelector('.user_infos_container').style.display='none';
        document.querySelector('.player_2').querySelector('.user_infos_container').style.display='none';
    };
    //登出
    $scope.logOut=function(){
        messageServer.logOut($scope.userinfo.username,$scope.userinfo.sessionid);
        $scope.userinfo={};
        $http.post('/logout/',{"username":$scope.userinfo.username,"sessionid":$scope.userinfo.sessionid}).success(function(data){
            location.href='/login'
        }).error(function(data){
            console.log(data);
        });
    }
}]);

//定义图片加载错误时的指令
chatRoomIndex.directive('errorLoadImage', function(){
    return {
        'restrict': 'A',
        'link':function(scope, element, attrs){
            element.bind("error", function(){
                element.attr("src", "/images/default_avatar.png");
            });
        }
    }
});

// 按enter键时的事件 指令
chatRoomIndex.directive('ngEnter', function(){
    return function(scope, element, attrs){
        element.bind('keydown', function(event){
            if(event.which === 13){
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter, {'event':event});
                });
                event.preventDefault();
            }
        });
    }
});

// 子元素不随父元素滚动的 指令
chatRoomIndex.directive('scrollUnique', function(){
    return function(scope, element, attrs){
        var eventType = "mousewheel";
        // 火狐是DOMMouseScroll事件
        if(document.mozHidden !== undefined){
            eventType = "DOMMouseScroll";
        }
        element.bind(eventType, function(event){
            var scrollTop = element[0].scrollTop;
            var scrollHeight = element[0].scrollHeight;
            var height = element[0].clientHeight;

            // 向下滚 值为负， 向上滚， 值为正
            var delta = (event.wheelDelta) ? event.wheelDelta : -(event.detail || 0);
            // 滚动到最上 或 滚动到最底下
            if((delta > 0 && scrollTop <= delta) || (delta < 0 && scrollHeight - height - scrollTop <= -1*delta)){
                element[0].scrollTop = delta > 0 ? 0:scrollHeight;
                event.preventDefault();
            }
        });
    }
});