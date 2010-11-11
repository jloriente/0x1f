/**
 * CouchdbManager : Nodejs module to perform 0x1f URL operations on couchdb db.
 *
 * Databases :  urldb : Keeps set of url documents.
 *              tagtypedb : Stores the tagtype and sizes values.
 *
 * @author : Javier Loriente
 *
 */ 

// Required modules
var sys = require('sys');

// Configuration : replace HOSTNAME!
var HOSTNAME = '0x1f.ie', HOSTPORT = '', // User ':80'. Defaults fot port 80
    HOSTURL = 'http://'+HOSTNAME+ HOSTPORT;

var DBHOST = 'localhost', DBPORT = 5984, 
    URL_DB_NAME = 'urldb', URL_DB_URL = 'http://'+DBHOST+':'+DBPORT+'/'+URL_DB_NAME+'/',
    TAGTYPE_DB_NAME = 'tagtypedb', TAGTYPE_DB_URL = 'http://'+DBHOST+':'+DBPORT+'/'+TAGTYPE_DB_NAME+'/';

var TAG_SIZE_ID = 'tagSizes';

CouchdbManager = function(){
    // couchdb connection
    this.couchdb = require('./lib/node-couchdb/lib/couchdb'),
        this.confProperties = require('./server-properties');

    this.dbClient = this.couchdb.createClient(DBPORT, DBHOST);
    this.urlDb = this.dbClient.db(URL_DB_NAME);
    this.tagTypeDb = this.dbClient.db(TAGTYPE_DB_NAME);
    // Reclusive function to generate an unique short url.
    // Check in db and generate a random generated id that wasn't previosly used.
    // @params callback : function(shortId) is a callback function called when 
    //      unique id has been found.
    this.getUniqueId = function(callback) {
        var shortId = getRandomShortId();
        // TODO : Authentication required here first time
        //callback(shortId);
        this.urlDb.getDoc(shortId, function(err, doc){
            if (err) {
                if (err.reason == 'missing') return callback(shortId)
            }else{
                // If id was prev used generate a new id 
                sys.puts('Generated id : ' + shortId + 'is already in use, regenerating id.');
                getUniqueId(callback);
            }
        });
    }
};

CouchdbManager.prototype.getInstance = function(){
    return new CouchdbManager;
}

CouchdbManager.prototype.addTagType = function(req, res, callback){
    // TODO : 
    if(req.body && req.body.id){
        // TODO Check TYPE was already created.
        sys.puts('Adding tag type : ' + req.body.id);
        req.body.type = 'tag',
        req.body.format = req.body.format||'svg' 
        req.body.roundness = req.body.roundness || 0;
        req.body.black = req.body.black || 'black';
        req.body.white= req.body.white || 'white';
        req.body.oversize = req.body.oversize || 0;
        var options = {
            uri : TAGTYPE_DB_URL+req.body.id,
            method : 'PUT',
            headers : {
                'content-type'  : 'application/json', 
                //'Authorization' : 'Basic YWRtaW46cGFzcw==',
                //'Authorization' : b,
                'Referer'  :  TAGTYPE_DB_URL + req.body.id, 
            },
            body :  this.couchdb.toJSON(req.body),
        };
        //debug db : sys.puts(sys.inspect(options));
        request(options,  function(err, response, body){
            if (err){
                sys.puts(sys.inspect(err));
                res.send(sys.inspect(err));
            }else{
                if (req.query) req.query.tagTypeDoc = body;
                if(!callback) res.send(body); else callback(body);
            }
        }); 
    } 
}

CouchdbManager.prototype.addTagSizes = function(req, res, callback){
    req.body.id = TAG_SIZE_ID; 
    if (req.body && req.body.id){ 
        var options ={
            uri : TAGTYPE_DB_URL+req.body.id,
            method : 'PUT',
            headers : {
                'content-type'  : 'application/json', 
                //'Authorization' : 'Basic YWRtaW46cGFzcw==',
                //'Authorization' : b,
                'Referer'  :  TAGTYPE_DB_URL + req.body.id, 
            },
            body :  this.couchdb.toJSON(req.body),
        };
        request(options,  function(err, response, body){
            if (err){
                sys.puts(sys.inspect(err));
                res.send(sys.inspect(err));
            }else{
                if (req.query) req.query.tagTypeDoc = body;
                if(!callback) res.send(body); else callback(body);
            }
        }); 
    }
}

CouchdbManager.prototype.getTagSizes = function(req, res, callback){
    var id = TAG_SIZE_ID; 
    this.tagTypeDb.getDoc(id, function(err, doc){
        if (err){
            res.send(sys.inspect(err));
            sys.puts(sys.inspect(err));
        }else{
            if (!callback){
                var docJson = that.couchdb.toJSON(doc);
                req.query.sizesDoc = doc;
                res.send(docJson);
                res.close();
            }else{
                req.query.sizesDoc = doc;
                sys.puts(doc);
                callback(doc);
            }
        }
    }); 
}

/*y
 * Add field req.query.qrTagMatrix into element
 */
CouchdbManager.prototype.saveQrTagMatrix = function(req, res, callback){
    req.body = req.query.urlDoc;
    req.body.qrTagMatrix = req.query.qrcode.getMatrix().toStringArray();
    this.updateURL(req, res, callback);
}

CouchdbManager.prototype.addURL = function(req, res, callback){
    if (req.body){
        if (!req.body.inactive) req.body.inactive = 'false'; 
        if (req.body.url == ''){
            sys.puts({'error' : 'Request url has to include url'});
            res.send({'error' : 'Request url has to include url'});
        }else{
            // Check url schema. If not schema adds 'https://'
            if (!(/^\w+:/).test(req.body.url)) req.body.url = 'http://'+req.body.url;
            
            req.body.url = escape(req.body.url); 
            
            this.getUniqueId(uniqueIdCallback);  
            var that = this;
            // callback function receives an unique id and post to database 
            function uniqueIdCallback(id){
                sys.puts('Generated new unique id  : ' + id + ' for url ' + req.body.url );
                var options = {
                    uri : URL_DB_URL+id,
                    method : 'PUT',
                    headers : {
                        'content-type'  : 'application/json', 
                        //'Authorization' : 'Basic YWRtaW46cGFzcw==',
                        //'Authorization' : b,
                        'Referer'  :  URL_DB_URL + id, 
                    },
                    body :  that.couchdb.toJSON(req.body),
                };
                
                request(options,  function(error, response, body){ 
                    if (error){
                        sys.puts(sys.inspect(error));
                        res.send(sys.inspect(error));
                    }else{
                        sys.puts('New doc added : id:' + id + ' url' + req.body.url);
                        req.query.urlDoc = body;
                        if (!callback) res.send(body); else callback(body);
                    }
                });   
            };
        }
    }
}

/**
 * Query a url from db.
 */
CouchdbManager.prototype.queryURL = function(id, req, res, callback){
    sys.puts('query URL ; id ' + id)
    this.urlDb.getDoc(id, function(err, doc){
        if (err){
            res.send(sys.inspect(err));
            sys.puts(sys.inspect(err));
        }else{
            if (!callback){
                var docJson = that.couchdb.toJSON(doc);
                req.query.urlDoc = doc;
                res.send(docJson);
                res.close();
            }else{
                req.query.urlDoc = doc;
                sys.puts('query url : : : ' + doc)
                callback(doc);
            }
        }
    }); 
}

// Update url doc in db. Couchdb requires a revision id in every update.
// @param req.body._rev : The revision id.
// @param urlData { '_rev' : '', url : '', inactive : 'false', _attachments : { name : {}} }
CouchdbManager.prototype.updateURL = function(req, res, callback){
    if (req.body){
        if (!req.body.url){
            sys.puts("{'error' : 'Url not included in your request'}");
            res.send("{'error' : 'Url not included in your request'}");
        }else{
            var options = {
                uri : URL_DB_URL+req.body['_id'],
                method : 'PUT',
                headers : {
                    'content-type'  : 'application/json', 
                    'Referer'  :  URL_DB_URL + req.body['_id'], 
                    'Authorization' : 'userpass'
                },
                body : this.couchdb.toJSON(req.body)
            }
            
            sys.puts('OPTIONS');
            sys.puts(sys.inspect(options));

            request(options, function(err, response, body){
                if (err) {
                    sys.puts(sys.inspect(err));   
                }else{
                        var body = eval('(' + body + ')');
                        req.query.urlData = body;
                        if (!callback) res.send(body); else callback(body);
                    }
            });
        }
    }
};

/**
 * Check if url for that domain is already in db. If exist call urlExistCb else urlNewCb
 *  callback(id) where id is urlId or undefined if new url.
 */ 
CouchdbManager.prototype.checkDomainUrls = function(url, domain, callback){
    if (!(/^\w+:/).test(url)) url = 'http://'+url;
    var query = {
        'key' : escape(url)
    }
    sys.puts('query : ' + sys.inspect(query))
    this.urlDb.view('urls', domain, query, function(err, doc){
        sys.puts(sys.inspect(doc));
        if (err) sys.puts('error');
        if(doc.rows.length > 0) {
            callback(doc.rows[0].value);
        }else callback();
    });
}

CouchdbManager.prototype.getTagType = function(tagType, callback, notFoundCallback){
    sys.puts('tagType : ' + tagType)
    var query = {
        'key' : tagType 
    }
    this.tagTypeDb.view('tags', 'type', query, function(err, doc){
        if (err){
            sys.puts(err);
        }else{
            sys.puts('TAGS TYPE FOUND: ' + sys.inspect(doc));
            if(doc.rows.length > 0){
                callback(doc.rows[0].value);
            }else{
                sys.puts('TAG TYPE NOT FOUND');
                notFoundCallback();
            }
        }
    })
            
}

CouchdbManager.prototype.saveAttachment = function(file, docId, options, callback){
    this.urlDb.saveAttachment(file, docId, options, function(err, data){
        if (err){
            sys.puts(sys.inspect(err));
        }else{
            sys.puts('IMAGE SAVED');
            callback();
        }
    })
}
/**
 *  
 */
CouchdbManager.prototype.addAttachment = function(req, res){
    req.data = req.query.urlDoc;
    var imgAttachment = {
            'coo' : {
                'content_type' : 'text/xml',
                'data' : req.query.svgImage
            }
    }
    var img = {
            'content_type' : 'text/xml',
            'data' : 'text'//req.query.svgImage
    }
    if(!req.data['_attachments']){
        req.data['_attachments'] = {}
    }
    req.data['_attachments'] = imgAttachment;
   
    var options = {
        uri : URL_DB_URL + req.query.urlDoc['_id'] + '?rev=' + req.query.urlDoc['_rev'],
        method : 'PUT',
        headers : {
            'content-type'  : 'application/json', 
            'Authorization' : 'userpass',
            'Referer'  :  URL_DB_URL + req.query.urlDoc['_id'], 
        },
        body :  this.couchdb.toJSON(req.data)
    };
    
    sys.puts('Options : ' + sys.inspect(options));

    request(options, function(err, response, body){
        if (err){
            sys.puts(sys.inspect(err));
            res.send(sys.inspect(err));
        }else{
            sys.puts('ATTACHMENT ADDED...');
        }
    });
}
/**
 * Search for an attachment, if found add bin data to req.query.attachment, else set it to 'undefined'
 */
CouchdbManager.prototype.getDocAttachment = function(req, res, callback){
    this.urlDb.getAttachment(req.query.urlDoc['_id'], req.query.tagDoc.toString(), function(err, binaryImg){
        if (err) {
            sys.puts(sys.inspect(err));
            req.send(sys.inspect(err));
            req.query.attachment = undefined;
        }else{
            try{
                var ob = eval( '(' + binaryImg.toString() + ')'); 
                // Throws ex if attachment found
                // Reach this point means that img hasn't been found;
                // read url values and generate new qrtag from ws.
                req.query.attachment = undefined;
            }catch(e){
                sys.puts('EXCEPTION : img exist');
                req.query.attachment = binaryImg;
            }
        }
        callback(req, res);
    });
}

CouchdbManager.prototype.createDbViews = function(){
    sys.puts('creating views');
    //db.removeDoc('/_design/urls');
    this.urlDb.saveDesign('urls', {
        views : {
            'whelans' : {
                map : function(doc){
                    if (doc.domain == 'whelans'){
                        emit(doc.url, doc);
                    }
                }
            },
        }        
    });
    this.tagTypeDb.saveDesign('tags', {
        views : {
            'type' : {
                map : function(doc){
                    if (doc.type = 'tag'){
                        emit(doc.id, doc);
                    }      
                }
            }
        }        
    })
}

/** Private methods **/

// Returns a random base-64 string with 5 characters. 
var getRandomShortId = function(){  
    var randomString = "";
    var s = "abcdefghijklmnopqrstuvwxyz0123456789";  
    for (var i = 0; i <= 4; i++)  
    {  
        var rNum = Math.floor(Math.random()*36);
        randomString += s[rNum];
    }  
    return randomString;  
}

/*** EXPORTS ***/
//exports.CouchdbManager = CouchdbManager;
exports.getInstance = function(){
    return new CouchdbManager;
}
