var chatRoomLogin = angular.module('chatLogin',[]);


chatRoomLogin.config(
    function($httpProvider) {

        function getCookie(name) {
            var cookie_value = null;
            if (document.cookie && document.cookie != null) {
                var cookies = document.cookie.split(";");
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookie_value = decodeURIComponent(cookie.substring(name.length + 1));
                    }
                }
            }
            return cookie_value;
        }

        $httpProvider.defaults.headers.common['x-csrf-token'] = getCookie('csrf_token');
});



//这里是登陆页面的验证表单angular指令
chatRoomLogin.directive('validateInput',function(){
    return {
        require:'ngModel',
        link:function(scope,element,attrs,ngModel){
            if(!ngModel){
                return;
            }
            ngModel.$parsers.push(function(value){
                if(ngModel.$isEmpty(value)){
                    ngModel.$setValidity("validateInput",false);
                }else{
                    ngModel.$setValidity("validateInput",true);
                }
            });
        }
    }
});

chatRoomLogin.controller("userLoginController",function($scope,$http){
    $scope.clearInput=function(){
        var username_input=angular.element( document.querySelector("#login_username") );
        username_input.val('');
        var password_input=angular.element( document.querySelector("#login_password") );
        password_input.val("");
    };
    $scope.userLogin=function(){
        var username=angular.element( document.querySelector("#login_username")).val();
        var password=angular.element( document.querySelector("#login_password")).val();
        $http.post('/check_login/', {'username':username,'pwd':password}).success(function(data,status,headers){
            if(data['ret']!='ok'){
                alert('error');
                return
            }
            location.href='/index?'
        })
    }
});

