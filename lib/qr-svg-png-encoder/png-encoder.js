function pngEncode( qrs, size, black, white, debug ) {
    debug = debug||false;
    black = black||'\x00';
    white = white||'\xff';
    var mDim = qrs.length;
    var tDim = mDim + 2;
    var eSize = Math.floor( (size / tDim) );
    var sys = require('sys');
    var data = [];
    var i, j, w = (eSize * tDim);
    // Top border
    for( i = 0; i < eSize; i++ ) {
        for( j = 0; j < w; j++ ) {
            data.push( white );
        }
        for( j = w; j < size; j++ ) {
            data.push( white );
        }
        if( debug ) data.push('\n');
    }
    for( var x = 0; x < mDim; x++ ) {
        for( i = 0; i < eSize; i++ ) {
            // Left border
            for( j = 0; j < eSize; j++ ) {
                data.push( white );
            }
            for( var y = 0; y < mDim; y++ ) {
                var c = qrs[x][y] == 'X' ? black : white;
                for( j = 0; j < eSize; j++ ) {
                    data.push( c );
                }
            }
            // Right border
            for( j = 0; j < eSize; j++ ) {
                data.push( white );
            }
            for( j = w; j < size; j++ ) {
                data.push( white );
            }
            if( debug ) data.push('\n');
        }
    }
    // Bottom border
    for( i = 0; i < eSize; i++ ) {
        for( j = 0; j < w; j++ ) {
            data.push( white );
        }
        for( j = w; j < size; j++ ) {
            data.push( white );
        }
        if( debug ) data.push('\n');
    }
    // Left-over space
    for( i = w; i < size; i++ ) {
        for( j = 0; j < w; j++ ) {
            data.push( white );
        }
        for( j = w; j < size; j++ ) {
            data.push( white );
        }
        if( debug ) data.push('\n');
    }
    return new Buffer(data.join(''), 'binary');
}

exports.pngEncode = pngEncode;
