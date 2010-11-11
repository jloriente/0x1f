/**
 * A class which wraps a 2D array of bytes. The default usage is signed. If you want to use it as a
 * unsigned container, it's up to you to do byteValue & 0xff at each location.
 */
function ByteMatrix(width, height) {

    var bytes = new Array(height);
    for( var i = 0; i < bytes.length; i++ ) bytes[i] = new Array(width);

    this.getHeight = function() { return height; }

    this.getWidth = function() { return width; }

    this.get = function(x, y) { return bytes[y][x]; }

    this.getArray = function() { return bytes; }

    this.set = function(x, y, value) {
        if( value === true )       value = 1;
        else if( value === false ) value = 0;
        bytes[y][x] = value;
    }

    this.clear = function(value) {
        for( var y = 0; y < height; ++y ) {
            for( var x = 0; x < width; ++x ) {
                bytes[y][x] = value;
            }
        }
    }

    this.toString = function() {
        var result = [];
        for( var y = 0; y < height; ++y ) {
            for( var x = 0; x < width; ++x ) {
                switch( bytes[y][x] ) {
                case 0:
                    result.push(" 0");
                    break;
                case 1:
                    result.push(" 1");
                    break;
                default:
                    result.push(" -");
                    break;
                }
            }
            result.push('\n');
        }
        return result.join('');
    }

    this.toStringArray = function() {
        var result = [];
        for( var y = 0; y < height; y++ ) {
            for( var x = 0, row = []; x < width; x++ ) {
                switch( bytes[y][x] ) {
                case 0: row.push(' '); break;
                case 1: row.push('X'); break;
                default: row.push('?');
                }
            }
            result.push( row.join('') );
        }
        return result;
    }

}

exports.ByteMatrix = ByteMatrix;
