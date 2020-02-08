// Modules
const fs = require('fs');
var path = require('path');
const express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const _ = require('underscore');
var multer  = require('multer');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var mongodb = require('mongodb');
const sharp = require('sharp');

// Libraries
const log = require('../libraries/logging.js');
const resbuilder = require('../libraries/resultbuilder.js');
const db = require('../libraries/dbqueries.js');

// Congifiguration
const config = require('../config/auth-config.js');

// Middleware
const authVerification = require('../middleware/checkauth.js');

// Route Setup
// Express Middleware Setup
router.use(cors());
router.use(cookieParser());

// Check For User Auth - If The request makes it past this point, it contains a valid authorization
router.use((req, res, next) => { return authVerification(req, res, next)});

// DB Setup
// Postgres Setup
const pool = new Pool( config.dbconfig.data );

// pool Setup
// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// MongoDB Setup
mongoose.connect(config.dbconfig.mongoTest.connectionString, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
var mongo = mongoose.connection;

// Mongo DB Advanced Setup
// Listen For Errors And Alert
mongo.on('error', console.error.bind(console, 'connection error:'));

// Alert On Connection Success
mongo.once('open', function() {

    // we're connected!
    log.procedure("MongoDB Database Connected");
});

// Define A Schema
var Schema = mongoose.Schema;
var contactSchema = new Schema({
    userID: String,
    favorite: Boolean,
    firstName : String,
    middleName: String,
    lastName: String,
    phoneNumbers : [{name: String, value: String}],
    emails : [{name: String, value: String}]
});

var Contact = mongoose.model('contacts', contactSchema);

// Utility Functions
function initializeRoute(req){
    var timer = new log.callTimer(req);
    var result = new resbuilder.RestResult();
    return {
        timer: timer,
        result: result
    }
}

const imgBaseFolder = 'img';
const maxFileSize = 4 * 1024 * 1024;
// Multer Setup
// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, path.join(imgBaseFolder, 'tmp'))
//     },
//     filename: function (req, file, cb) {
//       cb(null, uuidv4())
//     }
// });
// var upload = multer({ storage: storage });

var storage = multer.memoryStorage();
var upload = multer({ 
    storage: storage,
    limits: { fileSize: maxFileSize } 
}).single('contactimg');

router.post('/contact/:id', upload, function (err, req, res, next) { 
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        console.log("Multer Error");
        console.log(err);
        if(err.code == "LIMIT_FILE_SIZE"){
            result.setStatus(400);
            result.addError("Image Too Large - Exceeds Maximum Allowable 4MB");
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            result.setStatus(400);
            result.addError("Unable To Process Image Due To Client Error, Verify That The Image Is Not Corrupted");
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }
    } else if (err) {
        // An unknown error occurred when uploading.
        result.setStatus(500);
        result.addError("Server Side Upload Error");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    } else {
        next();
    }
}, function(req, res){
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);
    

    // Multer is Happy
    var userID = req.user.id;

    // Validation of Request id parameter before use
    if ( !(_.has(req.params, "id")) || req.params.id == null || req.params.id == undefined){

        result.setStatus(400);
        result.addError("Request Requires Parameter id to be filled");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(!mongodb.ObjectID.isValid(req.params.id)){
        result.setStatus(400);
        result.addError("parameter id is not valid");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    // Verify Mimetype is allowed as upload
    var whiteListedMimeTypes = ['image/jpeg', 'image/bmp', 'image/gif', 'image/svg+xml', 'image/tiff', 'image/png', 'image/x-icon'];
    var allowedFileExt = ['jpg','jpeg','png','bmp','ico','gif','svg','tiff','cur','jpeg'];

    // Validate The File Even Exists
    if(!_.has(req, 'file')){
        result.setStatus(400);
        result.addError("Request Does Not Contain A Image Under The Name: contactimg");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(req.file == undefined){
        result.setStatus(400);
        result.addError("Request Does Not Contain A Image Under The Name: contactimg");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(!whiteListedMimeTypes.includes(req.file.mimetype)){
        result.setStatus(400);
        result.addError("Image MimeType is Not Supported " + req.file.mimetype);
        result.addError("Supported MimeTypes: " + whiteListedMimeTypes.toString());
        result.addError("Supported File Ext: " + allowedFileExt.toString());
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    var paramID = req.params.id;

    Contact.findOne({ _id: paramID, userID: userID}, function(err, contact){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            if(contact.length == 0){
                result.setStatus(400);
                result.addError("No Such Contact Found With Specified id");
                result.setPayload({});
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
                return;
            }else{
                // This user actually controls this contact
                // Perform Upload Action
                sharp(req.file.buffer)
                    .resize({ 
                        width: 256,
                        height: 256,
                        fit: 'cover',
                        position: sharp.strategy.entropy
                    })
                    .toBuffer()
                    .then(data => {
                        console.log("File Resize Complete")
                        // My Daddy Gave Me A Name - https://www.youtube.com/watch?v=kkcbxjWG9Mc
                        var newBornName = uuidv4();
                        var relPath = path.join(imgBaseFolder, newBornName);
                        fs.writeFile(relPath, data, (err)=>{
                            if(err){
                                result.setStatus(500);
                                result.addError("Server Side Upload Error");
                                result.setPayload({});
                                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                                timer.endTimer(result);
                                return;
                            }
                            console.log("Wrote File Successfully")
                            // Then He Walked Away - https://www.youtube.com/watch?v=kkcbxjWG9Mc
                            // Insert Into PG
                            db.insert.addPhoto(pool, userID, paramID, newBornName, success, failure);

                            function success(qres){
                                // PG Insert Successful
                                var img = fs.createReadStream(relPath);
                                img.on('open', function(){
                                    res.set('Content-type', 'image/jpeg');
                                    img.pipe(res);
                                });
                                timer.endTimer(result);
                                return;
                            }

                            function failure(error){
                                result.setStatus(500);
                                result.setPayload({});
                                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                                timer.endTimer(result);
                                return;
                            }
                            
                        });
                    });
            }
        }
    });
});

router.get('/contact/:id', function(req, res){
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.user.id;

    // Validation of Request id parameter before use
    if ( !(_.has(req.params, "id")) || req.params.id == null || req.params.id == undefined){

        result.setStatus(400);
        result.addError("Request Requires Parameter id to be filled");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(!mongodb.ObjectID.isValid(req.params.id)){
        result.setStatus(400);
        result.addError("parameter id is not valid");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    var paramID = req.params.id;

    Contact.findOne({ _id: paramID, userID: userID}, function(err, contact){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            if(contact.length == 0){
                result.setStatus(400);
                result.addError("No Such Contact Found With Specified id");
                result.setPayload({});
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
                return;
            }else{
                // This user actually controls this contact
                // Perform Fetch Action
                db.select.getContactPhoto(pool, userID, paramID, success, failure);

                function success(qres){
                    // TODO Validate Result Not Empty
                    console.log(qres.rows[0])
                    var relPath = path.join(imgBaseFolder, qres.rows[0].filename);
                    // PG Insert Successful
                    var img = fs.createReadStream(relPath);
                    img.on('open', function(){
                        res.set('Content-type', 'image/jpeg');
                        img.pipe(res);
                    });
                    timer.endTimer(result);
                    return;
                }

                function failure(error){
                    result.setStatus(500);
                    result.setPayload({});
                    res.status(result.getStatus()).type('application/json').send(result.getPayload());
                    timer.endTimer(result);
                    return;
                }
            }
        }
    });
});

module.exports = router;
