//客户端util
//圆角矩形
CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    this.beginPath();
    this.moveTo(x+r,y);
    this.arcTo(x+w,y,x+w,y+h,r);
    this.arcTo(x+w,y+h,x,y+h,r);
    this.arcTo(x,y+h,x,y,r);
    this.arcTo(x,y,x+w,y,r);
    this.closePath();
};

//字符串去掉首尾空格
String.prototype.trim=function() {

    return this.replace(/(^\s*)|(\s*$)/g,'');
}

//棋盘拷贝
Array.prototype.mapCopy=function(){
    var newArr=[];
    for (var i=0; i<this.length ; i++){
        newArr[i] = this[i].slice();
    }
    return newArr;
};

//棋盘相同
Array.prototype.mapEquals=function(other){
    for(var i=0;i<this.length;i++){
        for(var j=0;j<this[0].length;j++){
            if(this[i][j] != other[i][j])return false
        }
    }
    return true;
};

//服务
var services = angular.module('services',[]);

//处理canvas上单击事件点事件
services.factory("getCanvasEvent",function(){
    return {
        //获取在canvas上点的坐标
        'getPositionPoint':function(event){
            var x, y;
            if (event.layerX || event.layerX == 0) {
                x = event.layerX;
                y = event.layerY;
            } else if (event.offsetX || event.offsetX == 0) {
                x = event.offsetX;
                y = event.offsetY;
            }
            return {x: x, y: y};
        },
        //获取点击的是那一张桌子
        'getHomeDesk':function(point,homeRooms){
            var x=point.x;
            var y=point.y;
            //四个桌子圆心的坐标
            var desk_center_one_x=homeRooms[0].position_x+homeRooms[0].width/2;
            var desk_center_one_y=homeRooms[0].position_y+homeRooms[0].width/2;
            var desk_center_two_x=homeRooms[1].position_x+homeRooms[1].width/2;
            var desk_center_two_y=homeRooms[1].position_y+homeRooms[1].width/2;
            var desk_center_three_x=homeRooms[2].position_x+homeRooms[2].width/2;
            var desk_center_three_y=homeRooms[2].position_y+homeRooms[2].width/2;
            var desk_center_four_x=homeRooms[3].position_x+homeRooms[3].width/2;
            var desk_center_four_y=homeRooms[3].position_y+homeRooms[3].width/2;
            //点击位置与四个桌子距离
            var distance_one=Math.pow(Math.pow((x-desk_center_one_x),2)+Math.pow((y-desk_center_one_y),2),0.5);
            var distance_two=Math.pow(Math.pow((x-desk_center_two_x),2)+Math.pow((y-desk_center_two_y),2),0.5);
            var distance_three=Math.pow(Math.pow((x-desk_center_three_x),2)+Math.pow((y-desk_center_three_y),2),0.5);
            var distance_four=Math.pow(Math.pow((x-desk_center_four_x),2)+Math.pow((y-desk_center_four_y),2),0.5);
            if(distance_one < 80){
                return 1;
            //第二张桌子
            }else if(distance_two < 80){
                return 2;
            //第三张桌子
            }else if(distance_three < 80){
                return 3;
            //第四张桌子
            }else if(distance_four < 80){
                return 4;
            }else{
                return null;
            }
        }
    };
});

//画笔服务
services.factory("chessDrawer",function(){
    return {
        //起始x y坐标
        'pointStartX':0,
        'pointStartY':0,
        //棋子与棋子之间的空隙距离
        'pointSpaceX':0,
        'pointSpaceY':0,
        //画布
        'chessCanvas':null,
        //画笔
        'chessContext':null,
        //构造下棋房间的画笔
        'initChess':function(){
            this.chessCanvas=document.getElementById("chess_desk_canvas");
            //设置一下画布大小
            //this.chessCanvas.width=document.querySelector(".chess_desk").offsetWidth;
            //this.chessCanvas.height=document.querySelector(".chess_desk").offsetHeight;
            this.chessCanvas.width=442;
            this.chessCanvas.height=498;
            this.chessContext=this.chessCanvas.getContext('2d');
            this.pointStartX=25;
            this.pointStartY=24.5;
            //这个距离是我自己尝试出来的，可能不同分辨率的浏览器显示会不一样，请谅解
            this.pointSpaceX=44.5;
            this.pointSpaceY=45.5;
        }
    }
});

//棋子的服务
services.factory("chessMan",['getCanvasEvent','chessDrawer',function(getCanvasEvent,chessDrawer){
    //初始化象棋棋盘，大写是黑方，小写是红方
    var initMap=[
        ['C0','M0','X0','S0','J0','S1','X1','M1','C1'],
        [    ,    ,    ,    ,    ,    ,    ,    ,    ],
        [    ,'P0',    ,    ,    ,    ,    ,'P1',    ],
        ['Z0',    ,'Z1',    ,'Z2',    ,'Z3',    ,'Z4'],
        [    ,    ,    ,    ,    ,    ,    ,    ,    ],
        [    ,    ,    ,    ,    ,    ,    ,    ,    ],
        ['z0',    ,'z1',    ,'z2',    ,'z3',    ,'z4'],
        [    ,'p0',    ,    ,    ,    ,    ,'p1',    ],
        [    ,    ,    ,    ,    ,    ,    ,    ,    ],
        ['c0','m0','x0','s0','j0','s1','x1','m1','c1']
    ];
//    var playMap=initMap.mapCopy();
    var playMap=null;
    var tmpMap=null;
    var manArgs= {
        //红子 中文/图片地址
        'c': {text: "车", img: 'r_c', bl: "c"},
        'm': {text: "马", img: 'r_m', bl: "m"},
        'x': {text: "相", img: 'r_x', bl: "x"},
        's': {text: "仕", img: 'r_s', bl: "s"},
        'j': {text: "将", img: 'r_j', bl: "j"},
        'p': {text: "炮", img: 'r_p', bl: "p"},
        'z': {text: "兵", img: 'r_z', bl: "z"},

        //黑子
        'C': {text: "車", img: 'b_c', bl: "c"},
        'M': {text: "馬", img: 'b_m', bl: "m"},
        'X': {text: "象", img: 'b_x', bl: "x"},
        'S': {text: "士", img: 'b_s', bl: "s"},
        'J': {text: "帅", img: 'b_j', bl: "j"},
        'P': {text: "炮", img: 'b_p', bl: "p"},
        'Z': {text: "卒", img: 'b_z', bl: "z"}
    };
    //选中的棋子
    var nowPlayMan=null;
    //图片列表
    var manImages={};
    //棋子列表
    var mansList={};
    //棋子对象
    var Man=function(key,x,y){
        //棋子坐标
        this.x=x||0;
        this.y=y||0;
        this.isShow=true;
        this.my=false;
        this.key=key;
        this.pater=key.slice(0,1);
        this.arg=manArgs[this.pater];
        this.alpha=1;
        this.path=[];
        //棋子显示
        this.show=function(){
            if(this.isShow){
                chessDrawer.chessContext.save();
                chessDrawer.chessContext.globalAlpha=this.alpha;
                chessDrawer.chessContext.drawImage(manImages[this.pater],chessDrawer.pointSpaceX*this.x+chessDrawer.pointStartX,
                                                    chessDrawer.pointSpaceY*this.y+chessDrawer.pointStartY);
                chessDrawer.chessContext.restore();
            }
        };
        this.bl=function(color){
            return bylaw[this.arg.bl](this.x,this.y,this.my,color);
        }
    };
    //棋子走的路径规则
    var bylaw={};
    //车的规则
    bylaw.c=function(x,y,my){
        var d=[];
        //左侧搜索
        for(var i=x-1;i>=0;i--){
            if(playMap[y][i]){
                //不是是自己的棋子可以吃
                if(playMap[y][i].my!=my){
                    d.push([i,y]);
                    break;
                }
            }else{
                d.push([i,y]);
            }
        }
        //右侧搜索
        for(var i=x+1;i<=8;i++){
            if(playMap[y][i]){
                if(playMap[y][i].my!=my){
                    d.push([i,y]);
                    break;
                }
            }else{
                d.push([i,y]);
            }
        }
        //向上搜索
        for(var i=y-1;i>=0;i--){
            if(playMap[i][x]){
                if(playMap[i][x].my!=my){
                    d.push([x,i]);
                    break;
                }
            }else{
                d.push([x,i]);
            }
        }
        //向下搜索
        for(var i=y+1;i<=9;i++){
            if(playMap[i][x]){
                if(playMap[i][x].my!=my){
                    d.push([x,i]);
                    break;
                }
            }else{
                d.push([x,i]);
            }
        }
        return d;
    };
    //马的规则
    bylaw.m=function(x,y,my){
        var d=[];
        //右上1
        if( (x+1<=8 && y-2>=0) && playMap[y-1][x]==undefined && (!mansList[playMap[y-2][x+1]] || mansList[playMap[y-2][x+1]].my!=my) ) d.push([x+1,y-2]);
        //右上2
        if( (x+2<=8 && y-1>=0) && playMap[y][x+1]==undefined && (!mansList[playMap[y-1][x+2]] || mansList[playMap[y-1][x+2]].my!=my) ) d.push([x+2,y-1]);
        //右下1
        if( (x+2<=8 && y+1<=9) && playMap[y][x+1]==undefined && (!mansList[playMap[y+1][x+2]] || mansList[playMap[y+1][x+2]].my!=my) ) d.push([x+2,y+1]);
        //右下2
        if( (x+1<=8 && y+2<=9) && playMap[y+1][x]==undefined && (!mansList[playMap[y+2][x+1]] || mansList[playMap[y+2][x+1]].my!=my) ) d.push([x+1,y+2]);
        //左下1
        if( (x-1>=0 && y+2<=9) && playMap[y+1][x]==undefined && (!mansList[playMap[y+2][x-1]] || mansList[playMap[y+2][x-1]].my!=my) ) d.push([x-1,y+2]);
        //左下2
        if( (x-2>=0 && y+1<=9) && playMap[y][x-1]==undefined && (!mansList[playMap[y+1][x-2]] || mansList[playMap[y+1][x-2]].my!=my) ) d.push([x-2,y+1]);
        //左上1
        if( (x-2>=0 && y-1>=0) && playMap[y][x-1]==undefined && (!mansList[playMap[y-1][x-2]] || mansList[playMap[y-1][x-2]].my!=my) ) d.push([x-2,y-1]);
        //左上2
        if( (x-1>=0 && y-2>=0) && playMap[y-1][x]==undefined && (!mansList[playMap[y-2][x-1]] || mansList[playMap[y-2][x-1]].my!=my) ) d.push([x-1,y-2]);
        return d;
    };
    //相的规则
    bylaw.x=function(x,y,my,color){
        var d=[];
        //红色的相
        if(color==1){
            //右下
            if( (y+2<=9 && x+2<=8) && playMap[y+1][x+1]==undefined && (!mansList[playMap[y+2][x+2]] || mansList[playMap[y+2][x+2]].my!=my) )d.push([x+2,y+2]);
            //左下
            if( (y+2<=9 && x-2<=8) && playMap[y+1][x-1]==undefined && (!mansList[playMap[y+2][x-2]] || mansList[playMap[y+2][x-2]].my!=my) )d.push([x-2,y+2]);
            //左上
            if( (y-2>=5 && x-2<=8) && playMap[y-1][x-1]==undefined && (!mansList[playMap[y-2][x-2]] || mansList[playMap[y-2][x-2]].my!=my) )d.push([x-2,y-2]);
            //右上
            if( (y-2>=5 && x+2<=8) && playMap[y-1][x+1]==undefined && (!mansList[playMap[y-2][x+2]] || mansList[playMap[y-2][x+2]].my!=my) )d.push([x+2,y-2]);
        }else{
            //右下
            if( (y+2<=4 && x+2<=8) && playMap[y+1][x+1]==undefined && (!mansList[playMap[y+2][x+2]] || mansList[playMap[y+2][x+2]].my!=my) )d.push([x+2,y+2]);
            //左下
            if( (y+2<=4 && x-2<=8) && playMap[y+1][x-1]==undefined && (!mansList[playMap[y+2][x-2]] || mansList[playMap[y+2][x-2]].my!=my) )d.push([x-2,y+2]);
            //左上
            if( (y-2>=0 && x-2<=8) && playMap[y-1][x-1]==undefined && (!mansList[playMap[y-2][x-2]] || mansList[playMap[y-2][x-2]].my!=my) )d.push([x-2,y-2]);
            //右上
            if( (y-2>=0 && x+2<=8) && playMap[y-1][x+1]==undefined && (!mansList[playMap[y-2][x+2]] || mansList[playMap[y-2][x+2]].my!=my) )d.push([x+2,y-2]);
        }
        return d;
    };
    //士的规则
    bylaw.s=function(x,y,my,color){
        var d=[];
        if(color==1){
            //右下
            if( (y+1<=9 && x+1<=5) && (!mansList[playMap[y+1][x+1]] || mansList[playMap[y+1][x+1]].my!=my)) d.push([x+1,y+1]);
            //右上
            if( (y-1>=7 && x+1<=5) && (!mansList[playMap[y-1][x+1]] || mansList[playMap[y-1][x+1]].my!=my)) d.push([x+1,y-1]);
            //左下
            if( (y+1<=9 && x-1>=3) && (!mansList[playMap[y+1][x-1]] || mansList[playMap[y+1][x-1]].my!=my)) d.push([x-1,y+1]);
            //左上
            if( (y-1>=7 && x-1>=3) && (!mansList[playMap[y-1][x-1]] || mansList[playMap[y-1][x-1]].my!=my)) d.push([x-1,y-1]);
        }else{
            //右下
            if( (y+1<=2 && x+1<=5) && (!mansList[playMap[y+1][x+1]] || mansList[playMap[y+1][x+1]].my!=my)) d.push([x+1,y+1]);
            //右上
            if( (y-1>=2 && x+1<=5) && (!mansList[playMap[y-1][x+1]] || mansList[playMap[y-1][x+1]].my!=my)) d.push([x+1,y-1]);
            //左下
            if( (y+1<=0 && x-1>=3) && (!mansList[playMap[y+1][x-1]] || mansList[playMap[y+1][x-1]].my!=my)) d.push([x-1,y+1]);
            //左上
            if( (y-1>=0 && x-1>=3) && (!mansList[playMap[y-1][x-1]] || mansList[playMap[y-1][x-1]].my!=my)) d.push([x-1,y+1]);
        }
        return d;
    };
    bylaw.j=function(x,y,my,color){
        var d=[];
        //判断老将对老将在同一条线上时中间有没有棋子相隔
        var isNull=(function(){
            if(color==1){
                var j0_y=mansList['j0'].y;
                var J0_y=mansList['J0'].y;
                var J0_x=mansList['J0'].x;
                for(var i=j0_y-1;i>J0_y;i--){ //没有棋子相隔
                    if(playMap[i][J0_x])return false;
                }
                return true; //有棋子相隔
            }else{
                var j0_y=mansList['j0'].y;
                var j0_x=mansList['j0'].x;
                var J0_y=mansList['J0'].y;
                for(var i=J0_y+1;i<j0_y;i++){
                    if(playMap[i][j0_x])return false;
                }
                return true;
            }
        })();
        if(color==1){
            //向下
            if( y+1<=9 && (!mansList[playMap[y+1][x]] || mansList[playMap[y+1][x]].my!=my))d.push([x,y+1]);
            //向上
            if( y-1>=7 && (!mansList[playMap[y-1][x]] || mansList[playMap[y-1][x]].my!=my))d.push([x,y-1]);
            //两将相对
            if( mansList['j0'].x==mansList['J0'].x && isNull)d.push([mansList['J0'].x,mansList['J0'].y]);
        }else{
            //向下
            if( y+1<=2 && (!mansList[playMap[y+1][x]] || mansList[playMap[y+1][x]].my!=my))d.push([x,y+1]);
            //向上
            if( y-1>=0 && (!mansList[playMap[y-1][x]] || mansList[playMap[y-1][x]].my!=my))d.push([x,y-1]);
            //两将相对
            if( mansList['j0'].x==mansList['J0'].x && isNull)d.push([mansList['j0'].x,mansList['j0'].y]);
        }
        //向左
        if( x-1>=3 && (!mansList[playMap[y][x-1]] || mansList[playMap[y][x-1]].my!=my) )d.push([x-1,y]);
        //向右
        if( x+1<=5 && (!mansList[playMap[y][x+1]] || mansList[playMap[y][x+1]].my!=my) )d.push([x+1,y]);
        return d;

    };
    bylaw.p=function(x,y,my){
        var d=[];
        //向左找路径
        var n=0;
        for(var i=x-1;i>=0;i--){
            if(playMap[y][i]){ //途中遇到棋子，则判断棋子后面是否有对方的棋子
                if(n==0){
                    n++;
                    continue;
                }else{
                    if(mansList[playMap[y][i]].my!=my){
                        d.push([i,y]);
                        break;
                    }
                }
            }else{
                if(n==0)d.push([i,y]);
            }
        }
        //向右找
        var n=0;
        for(var i=x+1;i<=8;i++){
            if(playMap[y][i]){ //途中遇到棋子，则判断棋子后面是否有对方的棋子
                if(n==0){
                    n++;
                    continue;
                }else{
                    if(mansList[playMap[y][i]].my!=my){
                        d.push([i,y]);
                        break;
                    }
                }
            }else{
                if(n==0)d.push([i,y]);
            }
        }
        //向上找
        var n=0;
        for(var i=y-1;i>=0;i--){
            if(playMap[i][x]){ //途中遇到棋子，则判断棋子后面是否有对方的棋子
                if(n==0){
                    n++;
                    continue;
                }else{
                    if(mansList[playMap[i][x]].my!=my){
                        d.push([x,i]);
                        break;
                    }
                }
            }else{
                if(n==0)d.push([x,i]);
            }
        }
        //向下找
        var n=0;
        for(var i=y+1;i<=9;i++){
            if(playMap[i][x]){ //途中遇到棋子，则判断棋子后面是否有对方的棋子
                if(n==0){
                    n++;
                    continue;
                }else{
                    if(mansList[playMap[i][x]].my!=my){
                        d.push([x,i]);
                        break;
                    }
                }
            }else{
                if(n==0)d.push([x,i]);
            }
        }
        return d;
    };
    bylaw.z=function(x,y,my,color){
        var d=[];
        if(color==1){
            //上
            if( y-1>=0 && (!mansList[playMap[y-1][x]] || mansList[playMap[y-1][x]].my!=my) )d.push([x,y-1]);
            //左
            if( y<=4 && x-1>=0 &&(!mansList[playMap[y][x-1]] || mansList[playMap[y][x-1]].my!=my) )d.push([x-1,y]);
            //右
            if( y<=4 && x+1<=8 &&(!mansList[playMap[y][x+1]] || mansList[playMap[y][x+1]].my!=my) )d.push([x+1,y]);
        }else{
            //下
            if( y+1<=9 && (!mansList[playMap[y+1][x]] || mansList[playMap[y+1][x]].my!=my) )d.push([x,y+1]);
            //左
            if( y>=5 && x-1>=0 &&(!mansList[playMap[y][x-1]] || mansList[playMap[y][x-1]].my!=my) )d.push([x-1,y]);
            //右
            if( y>=5 && x+1<=8 &&(!mansList[playMap[y][x+1]] || mansList[playMap[y][x+1]].my!=my) )d.push([x+1,y]);
        }
        return d;
    };
    //获得棋子位置
    function getDomPoint(event){
        var domXY=getCanvasEvent.getPositionPoint(event);
        var position_x=Math.round((domXY.x-chessDrawer.pointStartX-18)/chessDrawer.pointSpaceX);
        var position_y=Math.round((domXY.y-chessDrawer.pointStartY-17)/chessDrawer.pointSpaceY);
        return {x:position_x,y:position_y};
    }
    return{
        'initChessMan':function(color){
            chessDrawer.initChess();
            playMap=initMap.mapCopy();
            //加载图片
            for(var key in manArgs){
                manImages[key]=new Image();
                manImages[key].src='/images/'+manArgs[key].img+'.png';
            }
            //创建棋子
            for(var row=0;row<playMap.length;row++){
                for(var col=0;col<playMap[row].length;col++){
                    if(playMap[row][col]!=undefined){
                        var key=playMap[row][col];
                        var man=new Man(key,col,row);
                        if((color == 1 && /^[a-z]{1}\d{1}$/.test(key)) ||
                            (color == 2 && /^[A-Z]{1}\d{1}$/.test(key))){
                            man.my=true;
                        }
                        mansList[key]=man;
                    }
                }
            }
        },
        //清空棋盘，绘制棋子
        'chessShow':function(){
            chessDrawer.chessContext.clearRect(0,0,chessDrawer.chessCanvas.width,chessDrawer.chessCanvas.height);
            for(var i=0;i<playMap.length;i++){
                for(var j=0;j<playMap[i].length;j++){
                    if(playMap[i][j] != undefined){
                        var key = playMap[i][j];
                        mansList[key].x = j;
                        mansList[key].y = i;
                    }
                }
            }
            for(var key in mansList){
                mansList[key].show();
            }
        },
        //清空棋盘 全部初始化
        'chessClear':function(color){
            chessDrawer.chessContext.clearRect(0,0,chessDrawer.chessCanvas.width,chessDrawer.chessCanvas.height);
            playMap=initMap.mapCopy();;
            this.initChessMan(color);
            nowPlayMan=null;
        },
        //点击棋盘，得到棋子 color=1表示红色 color=2表示黑色
        'getClickMan':function(event){
            var pointXY=getDomPoint(event);
            if (pointXY.x < 0 || pointXY.x>8 || pointXY.y < 0 || pointXY.y > 9) return false;
            var key = (playMap[pointXY.y][pointXY.x] && playMap[pointXY.y][pointXY.x]!=undefined) ? playMap[pointXY.y][pointXY.x] : false;
            if(key){
                return {'isMan':true,'obj':mansList[key]};
            }else{
                return {'isMan':false,'obj':pointXY};
            }
        },
        //重值当前棋盘
        'setNowPlayMap':function(map){
            playMap=map.mapCopy();
        },
        //获取所有棋子
        'getMansList':function(){
            return mansList;
        },
        //获取选中的棋子
        'getNowPlayMan':nowPlayMan,
        //当前的棋盘
        'getNowPLayMap':function(){
            return playMap;
        },
        //点击的点是否在棋子可以走的路径上
        'isPathOf':function(point){
            for(var i=0;i<this.getNowPlayMan.path.length;i++){
                if(point.x==this.getNowPlayMan.path[i][0] && point.y==this.getNowPlayMan.path[i][1])return true
            }
            return false;
        }
    }
}]);


//连接消息服务器，提供消息服务器的服务
services.factory("messageServer",["$rootScope",function($rootScope){
    var USERCLIENT=function (){
        this.socket =  io.connect('//127.0.0.1:8081');
        this.socket.on("connection",function(data){
            console.log("connected");
        });
    };
    var userClient=new USERCLIENT();
    return {
        //登录消息服务器
        'setClientLogin':function(username,sessionid){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType = Chat.ChatMessageType.LOGINREQUEST;
                var stub = new Chat.LoginRequest;
                stub.sessionid = sessionid;
                stub.username = username;
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream);
                var body = stream.getUint8Array();

                userClient.socket.emit('link_rabbitmq',body);
            }catch(err){
                console.log(err);
            }
        },
        //发送消息
        'sendChatMessage':function(username,sessionid,chatMsg){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType = Chat.ChatMessageType.CHATREQUEST;
                var stub = new Chat.ChatContent;
                stub.username=username;
                stub.sessionid=sessionid;
                stub.chatContent=chatMsg;
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch(err){
                console.log(err);
            }
        },
        //接受从服务器回写的数据
        'receiveMessage':function(callback){
            userClient.socket.on('message',function(data){
                var args=arguments;
                $rootScope.$apply(function(){
                    callback.apply(data,args);
                })
            });
        },
        //进入双人对战游戏
        'enterSingleRoom':function(username,sessionid,deskid){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType=Chat.ChatMessageType.SINGLEROOMENTER;
                var stub = new Chat.SingleRoomEnter;
                stub.username=username;
                stub.sessionid=sessionid;
                stub.deskid=parseInt(deskid);
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch(err){
                console.log(err);
            }
        },
        //回到大厅
        'backToMainHall':function(username,sessionid,deskid,color){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType=Chat.ChatMessageType.BACKTOMAINHALL;
                var stub = new Chat.BackToMainHall;
                stub.username=username;
                stub.deskid=deskid;
                stub.sessionid=sessionid;
                if(color==1){
                    stub.color = Chat.Color.RED;
                }else {
                    stub.color = Chat.Color.BLACK
                }
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch(err){
                console.log(err)
            }
        },
        //玩家准备，给消息服务器消息
        'preparedReady':function(username,sessionid,ready){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType=Chat.ChatMessageType.PREPAREDREADY;
                var stub = new Chat.PreparedReady;
                stub.username=username;
                stub.sessionid=sessionid;
                stub.ready=ready;
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch(err){
                console.log(err)
            }
        },
        //告知对方棋子的走法
        'sendPlayMap':function(username,sessionid,playMap,delete_key){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType=Chat.ChatMessageType.SENDPLAYMAP;
                var stub = new Chat.SendPlayMap;
                stub.username=username;
                stub.sessionid=sessionid;
                stub.playMap=playMap;
                if(delete_key){
                    stub.delete_key=delete_key;
                }
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch(err){
                console.log(err);
            }
        },
        //胜利
        'playWin':function(username,sessionid,color){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType=Chat.ChatMessageType.PLAYWIN;
                var stub = new Chat.PlayWin;
                stub.username=username;
                stub.sessionid=sessionid;
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch (err){
                console.log(err);
            }
        },
        //登出
        'logOut':function(username,sessionid){
            try{
                var message = new Chat.ChatMessage();
                message.ChatMessageType=Chat.ChatMessageType.LOGOUT;
                var stub = new Chat.LogOut;
                stub.username=username;
                stub.sessionid=sessionid;
                stub.SerializeToArray();
                message.messageBuff = stub;
                var stream_main = new PROTO.ArrayBufferStream;
                message.SerializeToStream(stream_main);
                var body = stream_main.getUint8Array();

                userClient.socket.emit('message',body);
            }catch (err){
                console.log(err);
            }
        }
    }
}]);
