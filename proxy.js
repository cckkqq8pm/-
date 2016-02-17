//使用nodejs反向代理服务器
var http=require('http');
var http_proxy=require('http-proxy');
var url=require('url');

var proxy_server=http_proxy.createProxyServer({});
proxy_server.on('error',function(err,req,res){
    res.writeHead(500,{
        'Content-Type': 'text/plain'
    });
    res.end("something error accured! "+err);
});

var server=require("http").createServer(function(req,res){
    if(req.headers.host=="127.0.0.1"){
        proxy_server.web(req,res,{target:'http://127.0.0.1:8081'});
    }
});

server.listen(80);