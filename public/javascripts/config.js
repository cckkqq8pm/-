/**
 * Created by ckq on 16-2-9.
 */

exports.config = function(){
    return {
        "MYSQL":{
            host:'localhost',
            port:3306,
            password:'1',
            user:'ckq',
            database:'chat_room',
            connectionLimit:20,
            waitForConnections:false
        },
        "AMQP": {
            "host" : "localhost",
            "login": "admin",
            "password": "admin"
        }
    }
};