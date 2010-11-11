SBuffer.prototype = new Array();
function SBuffer() {}
SBuffer.prototype.$ = function() {
    for( var i = 0; i < arguments.length; i++ ) this.push( arguments[i] );
    this.push('\n');
}
SBuffer.prototype.a = function() {
    for( var i = 0; i < arguments.length; i++ ) this.push( arguments[i] );
}
SBuffer.prototype.toString = function() { return this.join(''); }

function QRTagElement( colours, r ) {
    this.colours = colours||{};
    this.r = r;
    this.oversize = 1.1;
}
QRTagElement.prototype.init = function( size ) {
    this.size = size;
    if( this.r ) this.ry = size * (this.r / 2);
}
QRTagElement.prototype.declareElement = function( sb, colours ) {
    for( var i = 0; i < colours.length; i++ ) {
        sb.a('<rect id="black',i,'" width="',(this.size*this.oversize),'px" height="',(this.size*this.oversize),'px" ');
        if( this.ry ) sb.a('ry="',this.ry,'" ');
        sb.$('fill="',colours[i],'"/>');
    }
    this.colourCount = colours.length - 1;
}
QRTagElement.prototype.append = function( sb, x, y ) {
    var colourID = Math.round( Math.random() * this.colourCount );
    sb.$('<use xlink:href="#black',colourID,'" x="',x,'" y="',y,'"/>');
}

function svgEncode( qrcode, size, r, os, black, white ) {
    var colours = { 'black':black||['black'], 'white':white };
    var sb = new SBuffer();
    sb.$('<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>');
    sb.$('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="',size,'px" ',
         'height="',size,'px" viewbox="0 0 ',size,' ',size,'" preserveAspectRatio="none">');
    sb.$('<defs>');
    var matrix = qrcode.getMatrix();
    var mSize = matrix.getWidth();
    var eSize = Math.floor( size / (mSize + 2) ); // +2 to allow for a border around the tag
    var elem = new QRTagElement( colours, r );
    if( os ) elem.oversize = os;
    elem.init( eSize );
    elem.declareElement( sb, black );
    sb.$('</defs>');
    sb.$('<g id="background">');
    sb.$('<rect fill="',white,'" width="',size,'" height="',size,'"/>');
    sb.$('</g>');
    sb.$('<g id="tag-elements">');
    for( var x = 0, py = eSize; x < matrix.getHeight(); x++, py += eSize ) {
        for( var y = 0, px = eSize; y < matrix.getWidth(); y++, px += eSize ) {
            if( matrix.get( y, x ) == 1 ) {
                elem.append( sb, px, py );
            }
        }
    }
    sb.$('</g>');
    sb.$('</svg>');
    return sb.toString();
}
exports.svgEncode = svgEncode;
