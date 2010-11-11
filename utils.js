/**
 * 0x1f Utils module
 *
 * @author Javier Loriente
 */

var sys = require('sys');
Utils = function(){
    this.couchdb = require('./lib/node-couchdb/lib/couchdb');
};


Utils.prototype.puts = function(msg, res){
    if ((typeof(msg)) == 'object') msg = sys.inspect(msg);
    sys.puts(msg);
    if (res) res.send(msg);
}

Utils.prototype.toJSON = function(ob){
    return this.couchdb.toJSON(ob);
}

Utils.prototype.sendPngImage = function(req, res, image){
    res.writeHead(200, {'Content-Type' : 'image/png'});
    res.end(image, 'binary');
}
// Prompt user to save as...
Utils.prototype.sendToSavePngImage = function(req, res, image, fname){
    res.writeHead(200, {'Content-Type' : 'image/png', 'Content-disposition' : 'attachment;filename='+fname});
    res.end(image, 'binary');
}

Utils.prototype.sendSvgImage = function(req, res, image){
    res.writeHead(200, {'Content-Type' : 'image/svg+xml'});
    res.end(image, 'ascii');
}

// Prompt user to save as...
Utils.prototype.sendToSaveSvgImage = function(req, res, image, fname){
    res.writeHead(200, {'Content-Type' : 'image/svg+xml', 'Content-disposition' : 'attachment;filename=' + fname});
    res.end(image, 'ascii');
}

/** REVIEW AFTER THIS POINT */
Utils.prototype.displayImage = function(req, res, image){
    //TODO
    res.send()
}
// Display qrtag + link to shortUrl
Utils.prototype.displayLinkDetails = function(req, res, id, image){
    sendImageToSave(req,res,image);
    // Find id for that url, show id + qrtag
    var link = HOSTNAME+HOSTPORT+'/'+id;
    //res.send(
    //    '<p><img src="' + image + '"></a></p>' +
    //    '<p><a href="http://'+link+'">' + link + '</a></p>');    
}
// UI sections shows a form and allow a user to create a short url and qrtag
Utils.prototype.displayQRtag = function(req, res){
    var qrurl = qrcode(url);
    sys.puts('QR tag url : ' + qrurl);
    res.send(
        '<p align="center"><img src="' + qrcode(url) + '"></a></p>' +
        '<p align="center">Short link :  http://0x1f.com/' + shortId + '</p>');
     // Get png qr tag from webservice
};

Utils.prototype.displayForm = function(req, res){
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

exports.Utils = Utils;
