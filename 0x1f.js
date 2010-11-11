/*
 * 0x1F shortening service.
 *
 * @author Javier Loriente
 * 
 * This script contains the basic 0x1f.ie redirection service. The main 
 * operation is to redirect request from a short url to url in db.
 *
 * The service runs in port 3000. 
 *
 * The 0x1f admin section is performed by the script : admin.0x1f.js
 *
 * Operations : 
 *
 * - GET /:id : Redirect to a url with that id, if id exists.
 *
 * 0x1f uses couchdb as permanent storage. Example of req.body object/document stored in couch db.
 *
 * var URL = {
 *     '_id' : 'ox2hs', // Unique base64 5 digits id
 *     'url' : '',      // Url to redirect to
 *     'inactive' : false // True disable the url redirectoning
 *     'domain' : 'whelans' 
 *     '_attachments' : {
 *          'qr-img.png' : {} // Default qrtag imaged. 
 *          'qr-other-img.svg' : // Other qrtag images attached to this url.
 *     }
 */

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
var HOSTNAME = 'localhost', HOSTPORT = ':3000', // User ':80'. Defaults fot port 80
    HOSTURL = 'http://'+HOSTNAME+ HOSTPORT;
var DBHOST = 'localhost', DBPORT = 5984, DBNAME = 'urldb',
    DBURL = 'http://'+DBHOST+':'+DBPORT+'/'+DBNAME+'/';

// couchdb connection
var couchdb = require('./lib/node-couchdb/lib/couchdb'),
    confProperties = require('./server-properties');

var dbClient = couchdb.createClient(DBPORT, DBHOST);
var db = dbClient.db(DBNAME);

var app = module.exports = express.createServer();
console.log('Starting 0x1F daemon');

var minute = 60 * 1000;
var memory = new MemoryStore({reapInterval : minute, maxAge : minute * 5});

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
    app.use(connect.staticProvider({root : __dirname + '/public'}));//, cache : true}));
});

app.configure('development', function(){
    app.use(connect.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
   app.use(connect.errorHandler()); 
});

// GET /:id . Look for the url with that id and redirect if found.
app.get('/:id', function(req, res){
    sys.puts(req.params.id);
    var id = req.params.id;
    var resCode = "NF";
    
    if (req.params.url)
   
    // Service designed to work with nginx acting as a proxy
    // Get ip from headers in forwarded nging packets
    var ipAddress = null;
    try{
        ipAddress = req.headers['X-forwarded-For'];
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
        sys.puts('New client connected');
         var timestamp = new Date().getTime();
        var trackingId = timestamp + Hash.md5(ipAddress+userAgent);
    }
    // Add tracking id cookie, and store value in session 
    res.cookie('0x1f', trackingId, { expires: new Date(Date.now() + 900000), httpOnly: true }); 
    req.session.trackingId = cookie;
   
    try{
        db.getDoc(id, function(err, doc){
            //sys.puts(sys.inspect(err));
            //sys.puts(sys.inspect(doc));
            if (err){ 
               if (err.error == 'not_found'){
                    resCode = "NF";
                    logQuery("/" + id); // If shortUrl is not found the request path appears in log.
                    //res.send('Sorry, cant find that', 404);
                    res.redirect(HOSTURL+ '/40x.html', 302);
                }else{
                    sys.puts(sys.inspect(err.reason));
                    res.send(sys.inspect(err.reason));
                    //throw new Error(err); 
                }
            }else{
                redirectCallback(doc.url, doc.inactive);
            }
        });
    }catch(e){
       sys.puts(e);
       req.send(e);
    }   

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

app.listen(3000)
