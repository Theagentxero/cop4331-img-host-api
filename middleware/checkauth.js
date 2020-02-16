// Libraries
const log = require('../libraries/logging.js');
const _ = require('underscore');
const jwt = require('jsonwebtoken');
const config = require('../config/auth-config.js');

function checkCookieAuth (req, res, next) {
    // Check if request has cookies at all
    if(_.has(req.cookies,"jwt")){
        //console.log("Found JWT Cookie")
        jwt.verify(req.cookies.jwt, config.jwtpublic, { algorithms: ['RS256'], audience: 'localhost', issuer: 'COP4331API'}, function(err, payload){
            if(err){
                console.log(err);
                res.status(404).send("Invalid Authentication Cookie"); 
            }else{
                req.user = {id: payload.user_id};
                next();
            }
        });
    }else{
        console.log("No JWT Cookie Found")
        res.status(404).send("Missing Authentication Cookie"); 
    }
};

module.exports = checkCookieAuth;