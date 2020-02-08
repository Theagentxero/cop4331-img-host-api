var colors = require('colors/safe');
const uuidv4 = require('uuid/v4');
const _ = require('underscore');

class callTimer{
    constructor(req){
      this.req = req;
      this.start = Date.now();
      this.end = Date.now();
      this.reqID = uuidv4();
      this.base = req.baseUrl;
      this.path = req.route.path;
      this.method = req.method;
      //this.method = Object.keys(req.route.methods).filter((m) => {return req.route.methods[m]})[0].toUpperCase();
      this.reqTakes = 0;
      this.hasID = false;
      if( _.has(req, 'params') ){
        if( _.has(req.params, 'id') ) {
          this.rawID = req.params.id;
          this.hasID = true;
        }
      }
      this.startTime();
    }
  
    startTime(){
      this.start = Date.now();
      if(this.hasID){
        console.log("RECIEVED REQ: " + this.method + this.path + " PARAM: " + this.rawID  + " - RID: " + this.reqID);
      }else{
        console.log("RECIEVED REQ: " + this.method + this.path + " - RID: " + this.reqID);
      }
    }
  
    endTimer(resultObj){
      this.end = Date.now();
      this.reqTakes = this.end - this.start;
      if(this.hasID){
        console.log("RESOLVED REQ: " + this.method + this.path + " PARAM: " + this.rawID + " - RID: " + this.reqID + " Took: " + this.reqTakes + " ms");
      }else{
        console.log("RESOLVED REQ: " + this.method + this.path + " - RID: " + this.reqID + " Took: " + this.reqTakes + " ms");
      }
    }

    // TODO: Add Logging To This Section, Can Send Logging To Another API
  }
  
  
  
  module.exports = {
    critical: (str) => {
      console.log(colors.bgRed.bold('CRITICAL ISSUE:') + ' ' + colors.bgWhite.red(str));
    },
    warn: (str) => {
      console.log(colors.bgYellow.bold('CRITICAL ISSUE:') + ' ' + colors.yellow(str));
    },
    info: (str) => {
      console.log(colors.cyan('INFO:') + ' ' + colors.cyan(str));
    },
    debug: (str) => {
      console.log(colors.blue('DEBUG:') + ' ' + colors.blue(str));
    },
    procedure: (str) => {
      console.log(colors.bgMagenta('PROC:') + ' ' + colors.bgMagenta(str));
    },
    callTimer: callTimer,
  };