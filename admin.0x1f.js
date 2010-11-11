/*
 * 0x1F shortening service : Admin section
 *
 * @author Javier Loriente
 * 
 * This script contains the service for all the admin section on 0xf1 service. It's 
 * intended to be run in port 3001, while 0x1f runs on 3000.
 *
 * Service operations:
 * - GET /url : Request url shortid, and qrtag images can be done passing query params to 
 *      this path. 
 *      Query params : 
 *          - ?url="xx.com" : Returns a JSON object with a short urlid {url:'',rev:''}
 *          - ?url="xx.com"?tagId="xxx.png" : Returns the qrtag image for that url
 *          - ?url="xx.com"?tagId-"xxx.png"?dw=true : Donwload the qrtag image for url.
 *
 * OLD API (the design has been changed, we recomend you to use GET operations in /url/)
 *
 * GET /qrtag/:id/:qrtag : Get the :qrtagId for a doc with :id. 
 *  - if :qrtag doesn't exist, get new qrtag from ws, store as defaulg 'qr-img.png' and return to user.
 
 * PUT /add : Create new shorturl and qrtag. {url:'',inactive:'false'}
 * PUT /update : Update a url. {'_id': "sh33d, '_rev':'couchdb rev id', url:'newurl', inactive:''}
 *
 *  ADMIN : 
 * GET /admin : Send form to create submit new url.  
 * PUT /admin : Create a new shorturl getting data from a form
 *
 * 0x1f uses couchdb as permanent storage. The url object/document stored in couch db is like:
 * 
 * var URL = {
 *     '_id' : 'ox2hs', // Unique base64 5 digits id
 *     'url' : '',      // Url to redirect to
 *     'inactive' : false, // True disable the url redirectoning
 *     'domain' : 'whelans',
 *     '_attachments' : {
 *          'qr-img.png' : {} // Default qrtag imaged. 
 *          'qr-other-img.svg' : // Other qrtag images attached to this url.
 *     }
 */

var sys = require('sys'),
    fs = require('fs'),
    express = require('express'),
    connect = require('connect'),
    BufferList = require('bufferlist').BufferList,
    formidable = require('formidable'),
    MemoryStore = require('connect/middleware/session/memory'),
    Joose = require('joose'),
    JooseDep = require('joosex-namespace-depended'), H = require('hash')
    request = require('request');

var QRCode = require('./lib/qr-svg-png-encoder/qrcode').QRCode,
    encoder = require('./lib/qr-svg-png-encoder/encoder').encoder,
    ErrorCorrectionLevel = require('./lib/qr-svg-png-encoder/errorcorrectionlevel').ErrorCorrectionLevel,
    svgEncode = require('./lib/qr-svg-png-encoder/svg-encoder').svgEncode,
    pngEncode = require('./lib/qr-svg-png-encoder/png-encoder').pngEncode,
    Png = require('png').Png;

var Utils = require('./utils').Utils;
var utils = new Utils();
// 0x1f required modules
var couchdbManager = require('./couchdbManager').getInstance();

// Configuration : replace HOSTNAME!
var HOSTNAME = '0x1f.ie', HOSTPORT = '', // User ':80'. Defaults fot port 80
    HOSTURL = 'http://'+HOSTNAME+ HOSTPORT;
var DBHOST = 'localhost', DBPORT = 5984, DBNAME = 'urldb',
    DBURL = 'http://'+DBHOST+':'+DBPORT+'/'+DBNAME+'/';

console.log('Starting 0x1F daemon');

var minute = 60 * 1000;
var memory = new MemoryStore({reapInterval : minute, maxAge : minute * 5});

// Example of a connect middelware module
var log = module.exports = function loggItSetup(){
    return function loggItHandle(req, res, next){
        res.simpleBody(200, 'muelas');
        sys.puts("muelas");
        //next();
    };
}

var app = module.exports = express.createServer();
app.configure(function(){
    //app.use(log());
    //app.use(connect.logger({format : ":method :url :status"}));
    app.use(connect.bodyDecoder());
    app.use(connect.cookieDecoder());
    app.use(connect.session({ store : memory, secret : 'foobar' }));
    app.use(connect.methodOverride());
    app.use(app.router);
    // session management
    //app.use(connect.session());
    //app.use(connect.session({ store : new MemoryStore({reapInterval: -1 }) }));
    app.use(processPath);
    app.use(processQuery);
    app.use(processTagType);
    app.use(checkTagAlreadyExist);
    //app.use(checkTagTypeFormat);
    app.use(storeMatrixArray);
    app.use(processTagSizeValues);
    app.use(processSvgImage);
    app.use(processPngImage);
    //app.use(connect.staticProvider({root : __dirname + '/public'}));//, cache : true}));
});

app.configure('development', function(){
    app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
   app.use(connect.errorHandler()); 
});

sys.puts(couchdbManager);
app.listen(3001);
setupDb();

function setupDb(){

    sys.puts('setupdb')
    couchdbManager.createDbViews();
     
    var req = {}, res = {};
    req.body = {'id' : 'blackWhiteSquareSvg'};
    couchdbManager.addTagType(req, res, function(){});
    
    req.body = {'id' : 'blueYellowSquareSvg', black : 'blue', white: 'yellow'};
    couchdbManager.addTagType(req, res, function(){});

    req.body = {'id' : 'blackWhiteRoundSvg', 'roundness' : 1};
    couchdbManager.addTagType(req, res, function(){});
    
    req.body = {'id' : 'blackWhiteDotsSvg', 'roundness': 1, 'oversize' : -10};
    couchdbManager.addTagType(req, res, function(){});

    // Create a few tag types png
    req.body = {'id' : 'blackWhitePng', 'format' : 'png', 'black' : '#ffffffff', 'white':'#00000000'};
    couchdbManager.addTagType(req, res, function(){});
    
    req.body = {'id' : 'greenYellowPng', 'format' : 'png', 'black' : '#00440000', 'white':'#CCCC0000'};
    couchdbManager.addTagType(req, res, function(){});
    
    // Create a few tag types svg
    req.body = {
        'S' : {
            'svg' : 100, 'png' : 100
        },
        'M' : {
            'svg' : 200, 'png' : 200
        },
        'L' : {
            'svg' : 400, 'png' : 300
        },
        'XL' : {
            'svg' : 600, 'png' : 400
        }
    }
    
    couchdbManager.addTagSizes(req, res, function(){});
  }

function parseTag(tagId){
    var Tag = {};
    // TODO : Check qrtag format 
    var tagIdArray = tagId.split(':');
    sys.puts('The tagId is :' + tagIdArray.length + tagIdArray );
    if (tagIdArray.length == 2){
        tagDoc = {
            id : tagIdArray[0],
            size : tagIdArray[1],
            toString : function(){ return tagIdArray.join(':')}
        }
    }else{
        tagDoc = undefined;
        sys.puts('Invalid tagId format');
    }
    return tagDoc;
}
/**
 * Get a url or tagId. 
 * @req.params.url : Escaped url to add. 
 * @req.params.qrtag : The qrtag id, if included returns the qrtag image
 * @req.params.download : If true get the qrtag to download.
 */
//app.get('/url', function(req, res){});

// TODO process the path : Gather requirements
function processPath(req,res,next){
    sys.puts('*processPath');
    //sys.puts('Process path  ' + sys.puts(req));
    next();
}

/**
 *  If there are query params :
 *      - check if url is in db
 *           - yes : send url info
 *           - not : add, send info
 *      - if there is param tagId go next()
 * 
 *  Expected params
 *      - req.query.url = the url
 *      - req.query.tagId
 * 
 *  Populate values for next() as part of req :  
 *   - req.query.tagDoc 
 *   - req.query.Url
 */
function processQuery(req,res,next){
    sys.puts('*processQuery');
    if (req.query && req.query.url){
        var tagDoc = undefined;
        if(req.query.tagType){
            tagDoc = parseTag(req.query.tagType);
        }
        
        // Check if url was already stored for that domain
        couchdbManager.checkDomainUrls(req.query.url, 'whelans', callback);
         
        function callback(doc){
            if(doc && doc['_id']){
                // If doc already exist for that domain
                req.query.urlDoc = doc;
                req.query.tagDoc = tagDoc;
                if (!tagDoc) res.send(utils.toJSON(doc)); else next(); 
             }else{
                // add new url
                req.body = {
                    url : req.query.url,
                    'domain' : 'whelans',
                    'inactive' : 'false'
                }
                if(!tagDoc){
                    couchdbManager.addURL(req, res, function(doc){
                        couchdbManager.queryURL(doc['id'], req, res);         
                    });
                }else {
                    couchdbManager.addURL(req, res, function(doc){
                       req.query.urlDoc = eval('(' + doc + ')');
                       req.query.tagDoc = tagDoc;
                       next();
                    });
                }
             }
        }
    }
}

// Find in db that tagtype
function processTagType(req, res, next){
    console.log('*processTagType');
    var urlDoc = req.query.urlDoc;
    var tagDoc = req.query.tagDoc; 
    
    // TODO JL : hack to get the right id, refactor : not needed anymore
    var id = urlDoc['_id'] || urlDoc.id;
    var contents = HOSTURL + '/' + id;
    
    couchdbManager.getTagType(tagDoc.id, tagTypeFoundCallback, tagTypeNotFound);
    
    function tagTypeFoundCallback(tagTypeDoc){
        req.query.tagTypeDoc = tagTypeDoc;
        sys.puts(sys.inspect(tagTypeDoc))
        next();
    }
    
    function tagTypeNotFound(){
        res.send('Tag type doesnt exit : ' + tagDoc.id);
    }
}

/**
 *  Param 'tagId' included in query.
 *  Check if tag already in db then return, else next.
 */
function checkTagAlreadyExist(req, res, next){
    sys.puts('*checkTagAlreadyExist');
    var tagDoc = req.query.tagDoc;
    var urlDoc = req.query.urlDoc;
    var tagTypeDoc = req.query.tagTypeDoc;

    couchdbManager.getDocAttachment(req, res, callback);
    
    function callback(req, res){
        //sys.puts('attachment : ' + req.query.attachment);
        if (req.query.attachment){
            sys.puts('Serving catched tag from database...');
            if (tagTypeDoc.format == 'svg'){
                if (req.query.dw){
                    utils.sendToSaveSvgImage(req, res, req.query.attachment,
                            req.query.fname|| tagDoc.toString() + '.' + tagTypeDoc.format);
                }else{
                    utils.sendSvgImage(req, res, req.query.attachment);
                }
            }
            if (tagTypeDoc.format == 'png'){
                if (req.query.dw){
                    utils.sendToSavePngImage(req, res, req.query.attachment.toString('binary'),
                            req.query.fname|| tagDoc.toString() + '.' + tagTypeDoc.format);
                }else{
                    utils.sendPngImage(req, res, req.query.attachment.toString('binary'));
                }
            }
        }else{
            next();
        }
    }
}

/**
 * Check tag format is 'svg' or 'png' 
 */
function checkTagTypeFormat(req,res,next){
    console.log('*processSvgTag');
    var tagDoc = req.query.tagDoc;
    if (tagDoc.format == 'svg' || tagDoc.format == 'png' ){
        next();
    }else{
        res.send('Not supported tagId');
    }
}

function storeMatrixArray(req, res, next){
    sys.puts('*storeMatrixArray');
    var urlDoc = req.query.urlDoc;
    sys.puts(sys.inspect(urlDoc) + ' ' + urlDoc.id )
    // Read doc 
    couchdbManager.queryURL(urlDoc['_id'] || urlDoc['id'], req, res, queryCallback);
    
    function queryCallback(doc){ 
        sys.puts('Query callback : '  + doc);
        var id = urlDoc['_id'] || urlDoc.id;
        var contents = HOSTURL + '/' + id;

        String.prototype.getBytes = function(encoding) {
            if( encoding != 'ISO-8859-1' ) {
                throw new Error('Unsupported character encoding: '+encoding);
            }
            var bytes = new Array(this.length);
            for( var i = 0; i < this.length; i++ ) {
                bytes[i] = this.charCodeAt(i);
            }
            return bytes;
        }

        // Encode matrix
        var qrcode = new QRCode();
        encoder.encode(contents, ErrorCorrectionLevel.L, false, qrcode);
        
        // Save matrix in document
        req.query.urlDoc = doc;
        req.query.qrcode = qrcode;
        sys.puts('Matrix : ' + sys.inspect(qrcode.getMatrix().toStringArray()));
  
        couchdbManager.saveQrTagMatrix(req, res, callback);
        
        function callback(body){
            req.query.urlDoc = body; 
            next();
        }
    }
}

function processTagSizeValues(req, res, next){
    sys.puts('*processTagSizeValues');
    couchdbManager.getTagSizes(req, res, function(body){
        if (body.S && body.M && body.L){
            sys.puts('SIZES OK ' + sys.inspect(body))
            req.query.sizesDoc = body;
            next();
        }else{
            sys.puts('Tag sizes doc error. Check tag sizes are in db');
            req.send('Tag sizes doc error. Check tag sizes are in db');
        }
    })
}

// Save svg image
function processSvgImage(req, res, next){
    sys.puts('*processSvgImage');
    var urlDoc = req.query.urlDoc;
    var qrcode = req.query.qrcode;
    var tagTypeDoc = req.query.tagTypeDoc;
    var tagDoc = req.query.tagDoc;
    var sizesDoc = req.query.sizesDoc;
    
    sys.puts("and " + sys.puts(sizesDoc))
    if (tagTypeDoc.format == 'svg'){
        var os = tagTypeDoc.oversize;
        var black = tagTypeDoc.black;
        var white = tagTypeDoc.white;
        var r = tagTypeDoc.roundness;
        
        // TODO : support [] array in black for multiple colors
        var svg = svgEncode( qrcode, sizesDoc[tagDoc.size].svg, r, os, [ black ], white );
        req.query.svgImage = svg;

        // Save svg attachment in db
        var svgTmpFile = './' + urlDoc['_id'] || urlDoc['id'] + '.svg';
        // Temporaly save the file in
        fs.writeFileSync(svgTmpFile, svg, 'utf-8');
        couchdbManager.saveAttachment(svgTmpFile, urlDoc['_id'] || urlDoc['id'], {
                'rev' : urlDoc['_rev'] || urlDoc['rev'], //body.rev,
                'contentType' : 'text/xml',
                'name' : tagDoc.toString()
        }, function(){fs.unlinkSync(svgTmpFile);});
        
        if (req.query.dw){
            utils.sendToSaveSvgImage(req, res, svg, req.query.fname||'default.svg');
        }else{
            utils.sendSvgImage(req, res, svg);
        }
    }else{
        next();
    }
}

// TODO : To fix : png image not correct!
function processPngImage(req,res,next){
    sys.puts('*processPngImage');
    var urlDoc = req.query.urlDoc;
    var tagDoc = req.query.tagDoc;
    var tagTypeDoc = req.query.tagTypeDoc;
    var arrayMatrix = req.query.qrcode.getMatrix().toStringArray();
    var sizesDoc = req.query.sizesDoc;

    sys.puts('url doc ' + sys.inspect(urlDoc));

    if (tagTypeDoc.format == 'png'){
        //  Find tag type, tag values
        var os = tagTypeDoc.oversize;
        var black = tagTypeDoc.black;
        var white = tagTypeDoc.white;
        var r = tagTypeDoc.roundness;
        sys.puts('W/B : ' + black + ' ' +  white)
        
        black= eval('"\\x'+ (black.substring(1).match(/../g).join('\\x')) + '"'); 
        white= eval('"\\x'+ (white.substring(1).match(/../g).join('\\x')) + '"'); 
        sys.puts('W/B : ' + black + ' ' +  white)
        
        var size = sizesDoc[tagDoc.size];
        sys.puts("SIZE VALUE " + size.svg);
        var pngString = pngEncode(arrayMatrix, size.png, black, white, false);
        var png = new Png(pngString, size.png, size.png, 'rgba')
        
        png.encode(function(png_image){
            var pngTmpFile = './' + (urlDoc['_id'] || urlDoc['id']) + '.png';
            sys.puts('FiLE NAME : ' + pngTmpFile)
            fs.writeFileSync(pngTmpFile, png_image.toString('binary'), 'binary');
            couchdbManager.saveAttachment(pngTmpFile, urlDoc['_id'] || urlDoc['id'], {
                    'rev' : urlDoc['_rev'] || urlDoc['rev'], //body.rev,
                    'contentType' : 'image/png',
                    'name' : tagDoc.toString()
            }, function(){fs.unlinkSync(pngTmpFile);});
            

            if (req.query.dw){
                utils.sendToSavePngImage(req, res, png_image.toString('binary'), req.query.fname||'default.png');
            }else{
                sys.puts('send image ')
                utils.sendPngImage(req, res, png_image.toString('binary'));
            }
        })
    }else{
        res.send('tagID format is not supported, try with "svg" or "png"');
    }
}
