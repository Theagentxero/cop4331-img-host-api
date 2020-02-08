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

function hslToRgb(h, s, l){
    var r, g, b;
    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

var usedHues = [];

function performGeneration(hue){
    //var hue = Math.floor((Math.random() * 240));
    var rgb = hslToRgb((hue/240), (150/240), (50/240));
    var rgbVal = rgb[0] + "," + rgb[1] + "," + rgb[2]
    var bgcircle = Buffer.from('<svg height="256" width="256"> <circle cx="128" cy="128" r="128" style="fill:rgb(' + rgbVal + ');" /></svg>');
    var crab = fs.readFile(path.join('default','crab-white.png'), function(err, data){
        if(err){
            console.log("Error Reading White Crab Img");
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }
        var name = uuidv4();
        var pth = path.join("img","generated", name +".png");
        sharp(bgcircle)
            .composite([{ input: data }]).png()
            .toFile( pth, (err, info)=>{
                if(err){
                    console.log("Sharp Compositing Error");
                    return;
                }
                console.log("Composite Complete As: " + name);
                return;
            });
    })
}
var x = 0;
var y = setInterval(()=>{
    if(x > 240){
        console.log("Done");
    }else{
        performGeneration(x);
        x++;
    }
}, 100);
