/*
 * 0x1F req.body shortening service.
 *
 * @author Javier Loriente
 * 
 * GET /:id : Redirect to a url with that id, if id exists.
 * GET /admin : Send form to create submit new url.  
 * GET /qrtag/:id/:qrtag : Get the :qrtagId for a doc with :id. 
 *  - if :qrtag doesn't exist, get new qrtag from ws, store as defaulg 'qr-img.png' and return to user.
 *
 * PUT /add : Create new shorturl and qrtag. {url:'',inactive:'false'}
 * PUT /update : Update a url. {'_id': "sh33d, '_rev':'couchdb rev id', url:'newurl', inactive:''}
 * PUT /admin : Create a new shorturl getting data from a form
 *
 * 0x1f uses couchdb as permanent storage. Example of req.body object/document stored in couch db. 
 * var URL = {
 *     '_id' : 'ox2hs', // Unique base64 5 digits id
 *     'url' : '',      // Url to redirect to
 *     'inactive' : false // True disable the url redirectoning
 *     '_attachments' : {
 *          'qr-img.png' : {} // Default qrtag imaged. 
 *          'qr-other-img.svg' : // Other qrtag images attached to this url.
 *     }
 */

// Required modules
var sys = require('sys'),
    express = require('express'),
    connect = require('connect'),
    BufferList = require('bufferlist').BufferList,
    formidable = require('formidable'),
    MemoryStore = require('connect/middleware/session/memory'),
    Joose = require('joose'),
    JooseDep = require('joosex-namespace-depended'), H = require('hash')
    request = require('request');

// Configuration : replace HOSTNAME!
var HOSTNAME = 'localhost', HOSTPORT = '3000', 
    HOSTURL = 'http://'+HOSTNAME+':'+ HOSTPORT;
var DBHOST = HOSTNAME, DBPORT = 5984, DBNAME = 'urldb',
    DBURL = 'http://'+DBHOST+':'+DBPORT+'/'+DBNAME+'/';

// couchdb connection
var couchdb = require('./lib/node-couchdb/lib/couchdb'),
    confProperties = require('./server-properties');

var dbClient = couchdb.createClient(DBPORT, DBHOST);
var db = dbClient.db(DBNAME);

var app = module.exports = express.createServer();
console.log('Starting 0x1F daemon');

/*
connect.createServer(function(req, res, next){
            res.simpleBody(200, "Hello");
        }).listen(3000);
*/
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

app.configure(function(){
    //app.use(log());
    //app.use(connect.logger({format : ":method :url :status"}));
    app.use(connect.bodyDecoder());
    app.use(connect.cookieDecoder());
    app.use(connect.session({ store : memory, secret : 'foobar' }));
    app.use(connect.methodOverride());
    app.use(app.router);
    app.use(connect.staticProvider(__dirname + '/public'));
    // session management
    //app.use(connect.session());
    //app.use(connect.session({ store : new MemoryStore({reapInterval: -1 }) }));
});

app.configure('development', function(){
    app.use(connect.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
   app.use(connect.errorHandler()); 
});

// Uncoment to create views.
//createDbViews();


// POST /add : Insert a new ulr in db with an unique id. 
app.put('/add', function(req, res){
    addURL(req, res);
});


// POST /update : Update a url in db.
app.post('/update', function(req, res){
    // Has to include req.body._rev 
    updateURL(req, res);
});

// Save url doc in db. Make a put to db with in request.
//  - ok : response is {shortreq.body : '', active : ''}
//  - or : response is a JSON couchdb error.
//  
// If callback then calls a function with an input param containing the JSON ob or error
//  if not callback provided then send the message as response.
// @params req.body.url : Mandatory.
// @params req.body.inactive : Defaults to 'false'
function addURL(req, res, callback){
    if (req.body){
        if (!req.body.inactive) req.body.inactive = 'false'; 
        if (req.body.url == ''){
            sys.puts({'error' : 'Request url has to include url'});
            res.send({'error' : 'Request url has to include url'});
        }else{
            // Check url schema. If not schema adds 'https://'
            if (!(/^\w+:/).test(req.body.url)) req.body.url = 'http://'+req.body.url;
            
            req.body.url = escape(req.body.url); 
            
            getUniqueId(callBack);  

            // callback function receives an unique id and post to database 
            function callBack(id){

                // TODO : Testing authentication...
                //var userPass = 'admin:pass';
                //var userPass = 'javier:pass';
                //var b = 'Basic ' + new Buffer(userPass, 'ascii').toString('base64'); 
                //sys.puts('Userpass : ' + userPass + ' base64 : ' + b);
                //sys.puts('Base64 userpass : ' + b);
                sys.puts('Generated new unique id  : ' + id + ' for url ' + req.body.url );
                
                var options = {
                    uri : DBURL+id,
                    method : 'PUT',
                    headers : {
                        'content-type'  : 'application/json', 
                        //'Authorization' : 'Basic YWRtaW46cGFzcw==',
                        //'Authorization' : b,
                        'Referer'  :  DBURL + id, 
                    },
                    body :  couchdb.toJSON(req.body),
                };
                
                //debug db : sys.puts(sys.inspect(options));
                
                request(options,  function(error, response, body){ 
                    if (error){
                        sys.puts(sys.inspect(error));
                        res.send(sys.inspect(error));

                        //if (!callback) res.send(sys.inspect(error)); else callback(error);
                    }else{
                        sys.puts('New doc added : id:' + id + ' url' + req.body.url);
                        if (!callback) res.send(body); else callback(id);
                    }
                });   
            };
        }
    }
};

// Update url doc in db. Couchdb requires a revision id in every update.
// @param req.body._rev : The revision id.
// @param urlData { '_rev' : '', url : '', inactive : 'false', _attachments : { name : {}} }
function updateURL(req, res){
    if (req.body){
        if (!req.body.url){
            sys.puts("{'error' : 'Url not included in your request'}");
            res.send("{'error' : 'Url not included in your request'}");
        }else{
            var options = {
                uri : DBURL+req.body['_id'],
                method : 'PUT',
                headers : {
                    'content-type'  : 'application/json', 
                    'Referer'  :  DBURL + req.body['_id'], 
                    'Authorization' : 'userpass'
                },
                body : couchdb.toJSON(req.body)
            }
            
            sys.puts(sys.inspect(options));

            request(options, function(err, response, body){
                if (err) {
                    sys.puts(sys.inspect(err));   
                }else{
                        sys.puts(sys.inspect(body));
                        res.send(body);
                    }
            });
        }
    }
};

// Display qrtag + link to shortUrl
function displayLinkDetails(req, res, id, image){
    // Find id for that url, show id + qrtag
    var link = HOSTNAME+':'+HOSTPORT+'/'+id;
    res.send(
        '<p><img src="' + image + '"></a></p>' +
        '<p><a href="http://'+link+'">' + link + '</a></p>');    
}
// UI sections shows a form and allow a user to create a short url and qrtag
function displayQRtag(req, res){
    var qrurl = qrcode(url);
    sys.puts('QR tag url : ' + qrurl);
    res.send(
        '<p><img src="' + qrcode(url) + '"></a></p>' +
        '<p>Short link :  http://0x1f.com/' + shortId + '</p>');
     // Get png qr tag from webservice
};

function displayForm(req, res){
    res.sendHeader(200, {"Content-Type": "text/html"});
    res.write(
        '<form action="'+ HOSTURL +'/admin" method="post" enctype="multipart/form-data">'+
        '<input type="text" name="url" />'+
        '<input type="checkbox" name="inactive" value="true">inactive</input>'+
        '<input type="submit" value="submit" />'+
        '</form>'
    );
    res.close();
};


/*
 * Admin section :
 * - GET /admin : Send a form to add url
 * - POST /admin : Add the url
 */
app.get('/admin', function(req, res){ 
    displayForm(req, res);
});

app.post('/admin', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if (err){
            sys.puts(sys.inspect(err));
            res.send(sys.inspect(err));
        }else{
            sys.puts(sys.inspect(fields));
            if (fields.url){
                // Prepare a valid request for post.
                var URL = {
                    'url' : fields.url,
                    'inactive' : fields.inactive ? 'true' : 'false' | "false"
                }
                req.body = URL;
                addURL(req, res, function(id){
                    // callback takes a body or error ob
                    //res.send('ahora');
                    var redirectUrl = '/qrtag/'+id+'/qr-img.png';
                    //sys.puts('redirecting ... ' + redirectUrl); 
                    res.redirect('/qrtag/'+id+'/qr-img.png',302);
                });
                // Send html content short url + qrtag.
                //displayQRTag(req, res);
                //res.send(sys.inspect(addResponse));
            }else{
                // return url field is empty error
            }
        }    
    });
});

// Get qrtag image for a given id and attachmentId.
app.get('/qrtag/:id/:attachmentId.:extension', function(req, res){
    if (req.params.id && req.params.attachmentId){
        var id = req.params.id;
        var attachment = req.params.attachmentId + "." + req.params.extension;
        // TODO : check attachments extensions, now only supports .png 
       
        // Checks if attachment exist. Callback recives the binary content of the attachment
        db.getAttachment(req.params.id, attachment, function(err, r){
            if (err) {
                sys.puts(sys.inspect(err));
                req.send(sys.inspect(err));
            }else{
                try{
                    var ob = eval( '(' + r.toString() + ')'); // Throws ex if attachment found
                    // If not found then read url values and generate new qrtag from ws.
                    db.getDoc(id, function(err, doc){
                        if (err){ 
                           if (err.error == 'not_found'){
                                resCode = "NF";
                                logQuery("/" + id); // If shortUrl is not found the request path appears in log.
                                res.send('Sorry, cant find that', 404);
                            }else{
                                sys.puts(sys.inspect(err.reason));
                                sys.send(sys.inspect(err.reason));
                            }
                        }else{
                            if (!doc.url){
                                res.send({'error' : 'Url not included in doc'})
                            }else{
                                // TODO : Check if default qrtag already exist, then dont fetch a new one.
                                var tagUrl = qrcode(HOSTURL+'/'+id);
                                // Get new qrtag from ws, fetch and store in db, show it. Default qr-img.png
                                fetchAndSaveImage(tagUrl, doc, req, res);
                            }
                        }
                    });
                }catch (ex){
                    // Exception is throw then trying to eval binary code -img found-, then send the img.
                    // Prepend the base64 data so it can be easily used as data url for img source.
                    var data_uri_prefix = "data:" + 'image/png' + ";base64,";
                    var image = new Buffer(r.toString(), 'binary').toString('base64'); 
                    image = data_uri_prefix + image;
                    //res.headers['Content-Type'] = 'image/png';
                    //res.send('<img src="'+image+'"/>');
                    displayLinkDetails(req, res, req.params.id, image)
                }
            }
        });
    }
});

// GET /:id . Look for the url with that id and redirect if found.
app.get('/:id', function(req, res){
    var id = req.params.id;
    var resCode = "NF";
   
    // Service designed to work with nginx acting as a proxy
    // Get ip from headers in forwarded nging packets
    var ipAddress = null;
    try{
        ipAddress = req.headers['x-forwarded-for'];
    }catch(err){
        ipAddress = req.connection.remoteAddress;
    }
    
    // HEADER : get encoded UA
    var userAgent = encodeURIComponent(req.header('User-Agent'));
   
    // COOKIES : read and store cookie with tracking id of
    //  create new tracking id if not cookie recived (new connection).
    var cookie = req.cookies['0x1f']; //sys.puts('COOKIE ' + sys.inspect(cookie));
    if (cookie != undefined) {
        var trackingId = cookie;    
    }else{
        sys.puts('New client');
         var timestamp = new Date().getTime();
        var trackingId = timestamp + Hash.md5(ipAddress+userAgent);
    }
    // Add tracking id cookie, and store value in session 
    res.cookie('0x1f', trackingId, { expires: new Date(Date.now() + 900000), httpOnly: true }); 
    req.session.trackingId = cookie;
   

    db.getDoc(id, function(err, doc){
        //sys.puts(sys.inspect(err));
        //sys.puts(sys.inspect(doc));
        if (err){ 
           if (err.error == 'not_found'){
                resCode = "NF";
                logQuery("/" + id); // If shortUrl is not found the request path appears in log.
                res.send('Sorry, cant find that', 404);
            }else{
                sys.puts(sys.inspect(err.reason));
                res.send(sys.inspect(err.reason));
                //throw new Error(err); 
            }
        }else{
            redirectCallback(doc.url, doc.inactive);
        }
    });
    
    function redirectCallback(url, inactive){
        // redirect only active links
        if (inactive == 'false') {
            resCode = 'OK';
            res.redirect(unescape(url), 302);
        }else{
            resCode = 'IA';
            res.send('Sorry, cant find that', 404);
        }
        logQuery(url);     
    }
    
    // Loggin
    function logQuery(url){
        var timestamp = new Date().getTime();
        var trackID = trackingId; // TODO : Use trackId
        var requestPath = id; 
        var requestUrl = url;
        sys.puts( timestamp + " " + ipAddress +  " " + trackID + " " 
                + userAgent + " " + resCode + " " + requestUrl );

    }
});

app.listen(3000);

// Reclusive function to generate an unique short url.
// Check in db and generate a random generated id that wasn't previosly used.
// @params callback : function(shortId) is a callback function called when 
//      unique id has been found.
function getUniqueId(callback){
    var shortId = getRandomShortId();
    // TODO : Authentication required here first time
    //callback(shortId);
    db.getDoc(shortId, function(err, doc){
        if (err) {
            if (err.reason == 'missing') return callback(shortId)
        }else{
            // If id was prev used generate a new id 
            sys.puts('Generated id : ' + shortId + 'is already in use, regenerating id.');
            getUniqueId(callback);
        }
    });
}

// Returns a random base-64 id with 5 characters.
function getRandomShortId(){  
    var randomString = "";
    var s = "abcdefghijklmnopqrstuvwxyz0123456789";  
    for (var i = 0; i <= 4; i++)  
    {  
        var rNum = Math.floor(Math.random()*36);
        randomString += s[rNum];
    }  
    return randomString;  
}

// Return url to get qr tag from webservice at : kaywa.com
// TODO : Store the img in database?
function qrcode(url, size){
    if(typeof(size) == 'undefined') size = 6;
    //return 'http://qrcode.kaywa.com/img.php?s='+size+'&d='+url;
    return 'http://www.bath.ac.uk/barcodes/qr_img.php?DATA='+url;
}

// Get a qrtag image from webservice given a url, fetch the img and store in db doc as attachemnt. 
function fetchAndSaveImage(tagUrl, doc, req, res){
    var url = unescape(tagUrl);
    var bufferList = new BufferList();
    var options = {
        uri : url,
        method : 'GET',
        headers : {
            'Content-Type'  : 'image/png', 
            //'Authorization' : 'userpass',
            //'Referer'  :  DBURL + urlData['_id'], 
            //'accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            //'Accept-Encoding:' : 'gzip,deflate'
            //'Authorization' : 'userpass'
        },
        responseBodyStream : bufferList
        //body : couchdb.toJSON(urlData)
    }
    
    // Fetch the img and save in doc as attachment.
    request(options, function(err, response, body){
        if (err){
            sys.puts(sys.inspect(err));
            res.send(sys.inspect(err));
        }else{
            if (response.statusCode=200){
                var image = new Buffer(bufferList.toString(), 'binary').toString('base64');
                // Store as doc attachment
                //sys.puts('New qrtag obtained from web service.');
                saveImageAsAttachment(req, res, doc, image); 
            }
        }       
    });   
}

// Save a image as a doc attachment. Default attachment name: 'qr-img.png'
// If ok sends html with a img element containing the img.
function saveImageAsAttachment(req, res, doc, image){
    var attachName = 'qr-img.png';
    var urlData = {
        '_id' :  req.params.id,
        '_rev' : doc['_rev'],
        'url': doc.url,
        'inactive' : doc.inactive,
        '_attachments' : {
            'qr-img.png' : {
                'content_type' : 'image/png',
                'data' : image
            }
        }
    };

    var options = {
        uri : DBURL + req.params.id + '?rev=' + doc['_rev'],
        method : 'PUT',
        headers : {
            'content-type'  : 'application/json', 
            'Authorization' : 'userpass',
            'Referer'  :  DBURL + req.params.id, 
        },
        body :  couchdb.toJSON(urlData)
    };

    request(options, function(err, response, body){
        if (err) {
            sys.puts(sys.inspect(err));   
            req.send(sys.inspect(err));   
        }else{
            //sys.puts('New qr tag Attachment has been added to ' + req.params.id + ' atachName:' + attachName  );
            //res.send(body);
            db.getAttachment(req.params.id, 'qr-img.png', function(err, r){
                if (err) {
                    sys.puts(sys.inspect(err));
                    res.send(sys.inspect(err));
                }else{
                    sys.puts('New image attached to doc id :  ' + req.params.id + ' Attachment id : qr-img.png');
                    // Prepend the base64 data so it can be easily used as data url for img source.
                    var data_uri_prefix = "data:" + 'image/png' + ";base64,";
                    var image = new Buffer(r.toString(), 'binary').toString('base64'); 
                    image = data_uri_prefix + image;
                    //res.headers['Content-Type'] = 'image/png';
                    //res.send('<img src="'+image+'"/>');
                    displayLinkDetails(req, res, req.params.id, image);
                }
            });
        }
    });
};
//
//salt : salt
Auth = {};
Auth.prototype = function(request, failureCallback, successCallback ){
    var requestUsername = '';
    var requestPassword = '';
    if (!request.headers['authorization']){
        failureCallback();
    }else{
        var auth = this._decodeBase64(request.headers['authorization']);
        if (auth){
            requestUsername = auth.username;
            requestPassword = auth.password;
        }else{
            failureCallback();
        }
    }
    // Query your database...
    /*
    db.query(function(result){
        if (result.username == requestUsername && result.password == requestPassword){
            successCallback(requestUsername);
        }else{
            failureCallback();
        }
    });
    */
};

/**
 * Internal method for extracting username and password out of a Basic
 * Authentication header field.
 * 
 * @param headerValue
 * @return
 */
Auth.prototype._decodeBase64 = function(headerValue){
    var value;
    if (value = headerValue.match("^Basic\\s([A-Za-z0-9+/=]+)$")){
        var auth = (new Buffer(value[1] || "", "base64")).toString("ascii");
        return {
            username : auth.slice(0, auth.indexOf(':')),
            password : auth.slice(auth.indexOf(':') + 1, auth.length)
        };
    }else{
        return null;
    }
};


// NOT USED
// Does a redirection to /add
function redirectToAdd(req, res){
     sys.puts('redirecting posting  to /add');
    //urlData['_id'] = id
    var urlData = req.body;
    //sys.puts(sys.inspect(urlData));
    var options = {
        uri : HOSTURL + '/add',
        method : 'POST',
        headers : {
            'content-type'  : 'application/json', 
            //'Authorization' : 'userpass',
            //'Referer'  :  DBURL, 
        },
        body :  couchdb.toJSON(urlData),
        //body :  '{}',
    };
    request(options, function(err, response, body){
        if (err) sys.puts(err); 
            else{
                //sys.puts(response);
                sys.puts(sys.inspect(body));
                res.send(body);
        }
    });

};

function createDbViews(){
    sys.puts('creating views');
    db.removeDoc('/_design/urls');
    db.saveDesign('url', {
        views : {
            'all' : {
                map : function(doc){
                    emit(doc.shortid, doc);
                }
            },
            'getid' : {
                map : function(doc){
                    emit(doc.shortid, doc );
                }
            }
        }        
    });
}

