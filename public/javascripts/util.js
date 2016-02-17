
exports.Format=function(string) {
    var args = [];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return string.replace(/\{(\d+)\}/g, function (match, i) {
        return args[i];
    });
};

// ==============================================  超牛逼的分割线  ====================================================

//csrf
var crypto = require('crypto');
var _ = require('underscore');

exports.csrf = function(ips, opts) {
    ips = ips || false;
    var settings = _.defaults( opts || {}, {
            log: true
            , errorCode: 401
            , errorMessage: 'Unauthorized'
        })
        , getClientIp = function(req) {
            var ipAddress;

            var forwardedIpsStr = req.headers['x-forwarded-for'];

            if (forwardedIpsStr) {
                var forwardedIps = forwardedIpsStr.split(',');
                ipAddress = forwardedIps[0];
            }

            if (!ipAddress) {
                ipAddress = req.connection.remoteAddress;
            }

            return ipAddress;
        };


    return function(req, res, next){
        var ip = getClientIp(req); // Grab the client's IP address

        // generate CSRF token
        var token = req.session._csrf || (req.session._csrf = uid(24));

        // ignore GET (for now)
        if ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) return next();

        // determine value
        var val = value(req);

        // check
        if ((val != token) && (!ips || (ips.indexOf(ip) === -1))) {
            // Deny access
            if(settings.log) {
                console.log('Bad CSRF. Access denied to IP address: ' + ip);
            }

            res.statusCode = settings.errorCode;
            return res.end(settings.errorMessage);
        }

        // Grant access
        if(settings.log) {
            console.log('CSRF verified. Access granted to IP address: ' + ip);
        }

        next();
    };
};


/**
 * Default value function, checking the `req.body`
 * and `req.query` for the CSRF token.
 *
 * @param {IncomingMessage} req
 * @return {String}
 * @api private
 */

function value(req) {
    return (req.body && req.body._csrf)
        || (req.query && req.query._csrf)
        || (req.headers['x-csrf-token']);
}

/**
 * UID generator borrowed from connect http://www.senchalabs.org/connect/
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */

function uid(len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')
        .slice(0, len);
}
