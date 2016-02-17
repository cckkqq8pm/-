module.exports=function Format()
{
    var a = [].slice.apply( arguments ), s = a.shift();
    return s.replace( /\{[0-9]+\}/g, function( d ){ return a[ d.slice( 1, -1 ) ]; } );
};
