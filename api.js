// Modules
const fs = require('fs');
var path = require('path');
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
var cors = require('cors');
var cookieParser = require('cookie-parser');
const https = require('https');
//Libraries
const log = require('./libraries/logging.js');
//Routes
var primary = require('./routes/primary.js');
// Hard Coded Configs
var service_port = 3035;

// Pull Config
const config = require('./config/auth-config.js');

// Apply Config
const pool = new Pool( config.dbconfig.data );

// HouseKeeping Stuff - START

// Shutdown Stuff
process.on('exit', (code) => {
    log.shutdown(`Process Exits With Code: ${code}`);
});

pool.on('connect', client => {
    log.procedure("PG Connected");
})
pool.on('acquire', client => {
    log.procedure("PG Client Aquired");
})
// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// HouseKeeping Stuff - END

// Create Express Instance
const app = express();
// Certificate
const privateKey = fs.readFileSync(path.join(__dirname, 'ssl','privkey1.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl','cert1.pem'), 'utf8');
const ca = fs.readFileSync(path.join(__dirname, 'ssl','chain1.pem'),'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.use(express.static(__dirname, { dotfiles: 'allow' } ));
// Apply Express Configurations
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));
app.use(bodyParser.json({limit: '5mb'}));

// Express Middleware Setup
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://crabrr.com"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
});

// Some Basic Routes To Offer Basic Functionality

// Attempting To Load This In A Browser Will Result In Nothing, So we send a 204 status meaning No Content
app.get('/', async function(req, res) {
    res.status(204).send();
});

// This allow us to check if the server is up, responds 200 when up
// Primarily used for load balancer
app.get('/status', async function(req, res) {
    res.status(200).send();
});

// Routes - START
// Primary Route
app.use('/', primary);
// Routes - END

// Start The Express Server 
https.createServer({
    key: privateKey,
    cert: certificate,
    ca: ca
}, app).listen(3030, () => {
    console.log('Listening On 3030')
})
//app.listen(service_port, () => log.debug(`Listening on ${ service_port }`))