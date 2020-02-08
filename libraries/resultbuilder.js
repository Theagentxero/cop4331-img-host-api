const _ = require('underscore');

class RestResult {
  // Defaults To 200
  constructor(){
    this.status = 200;
    this.errors = [];
    this.result = {};
  }
  
  getPayload(){
    var obj = {};
    if(this.hasErrors){ obj.errors = this.errors; }
    obj.status = this.status;
    obj.result = this.result;
    return obj;
  }

  getStatus(){
    return this.status;
  }

  hasErrors(){
    if(this.errorCount() > 0){
      return true;
    }else{
      return false;
    }
  }
  errorCount(){
    return this.errors.length;
  }

  setStatus(status){
    if(_.isFinite(status)){
      if( status >= 100 && status < 600 ){
        this.status = status;
      }else{
        // Status Out of Range
        throw "Status: " + status + " is Out of Range, Valid Range 100-599";
      }
    }else{
      //Status Must Be Number
      throw "Expected Status To Be Number. Received: " + typeof status;
    }
  }

  setPayload(payload){
    if(_.isObject(payload)){
      this.result = payload;
    }else{
      throw "Payload Must Be Object";
    }
  }

  addError(errorMessage){
    if(_.isString(errorMessage)){
      this.errors.push(errorMessage);
    }else{
      throw "Error Message Should Be A String";
    }
  }
}

module.exports = {
  RestResult: RestResult,
};