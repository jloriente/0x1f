/**
 * <p>Represents a 2D matrix of bits. In function arguments below, and throughout the common
 * module, x is the column position, and y is the row position. The ordering is always x, y.
 * The origin is at the top-left.</p>
 *
 * <p>Internally the bits are represented in a 1-D array of 32-bit ints. However, each row begins
 * with a new int. This is done intentionally so that we can copy out a row into a BitArray very
 * efficiently.</p>
 *
 * <p>The ordering of bits is row-major. Within each int, the least significant bits are used first,
 * meaning they represent lower x values. This is compatible with BitArray's implementation.</p>
 */
function BitMatrix(width, height) {

    height = arguments.length == 1 ? width : height;
    if( width < 1 || height < 1 ) {
        throw new Error("Both dimensions must be greater than 0");
    }
    var rowSize = (width + 31) >> 5;
    var bits = new Array(rowSize * height);

    /**
     * <p>Gets the requested bit, where true means black.</p>
     *
     * @param x The horizontal component (i.e. which column)
     * @param y The vertical component (i.e. which row)
     * @return value of given bit in matrix
     */
    this.get = function(x, y) {
        var offset = y * rowSize + (x >> 5);
        return ((bits[offset] >>> (x & 0x1f)) & 1) != 0;
    }

    /**
     * <p>Sets the given bit to true.</p>
     *
     * @param x The horizontal component (i.e. which column)
     * @param y The vertical component (i.e. which row)
     */
    this.set = function(x, y) {
        var offset = y * rowSize + (x >> 5);
        bits[offset] |= 1 << (x & 0x1f);
    }

    /**
     * <p>Flips the given bit.</p>
     *
     * @param x The horizontal component (i.e. which column)
     * @param y The vertical component (i.e. which row)
     */
    this.flip = function(x, y) {
        var offset = y * rowSize + (x >> 5);
        bits[offset] ^= 1 << (x & 0x1f);
    }

    /**
     * Clears all bits (sets to false).
     */
    this.clear = function() {
        var max = bits.length;
        for( var i = 0; i < max; i++ ) bits[i] = 0;
    }

    /**
     * <p>Sets a square region of the bit matrix to true.</p>
     *
     * @param left The horizontal position to begin at (inclusive)
     * @param top The vertical position to begin at (inclusive)
     * @param width The width of the region
     * @param height The height of the region
     */
    this.setRegion = function(left, top, width, height) {
        if( top < 0 || left < 0 ) {
            throw new Error("Left and top must be nonnegative");
        }
        if( height < 1 || width < 1 ) {
            throw new Error("Height and width must be at least 1");
        }
        var right = left + width;
        var bottom = top + height;
        if( bottom > height || right > width ) {
            throw new Error("The region must fit inside the matrix");
        }
        for( var y = top; y < bottom; y++ ) {
            var offset = y * rowSize;
            for( var x = left; x < right; x++ ) {
                bits[offset + (x >> 5)] |= 1 << (x & 0x1f);
            }
        }
    }

    /**
     * A fast method to retrieve one row of data from the matrix as a BitArray.
     *
     * @param y The row to retrieve
     * @param row An optional caller-allocated BitArray, will be allocated if null or too small
     * @return The resulting BitArray - this reference should always be used even when passing
     *         your own row
     */
    this.getRow = function(y, row) {
        if( row === undefined || row.getSize() < width ) {
            row = new BitArray(width);
        }
        var offset = y * rowSize;
        for( var x = 0; x < rowSize; x++ ) {
            row.setBulk(x << 5, bits[offset + x]);
        }
        return row;
    }

    /**
     * This is useful in detecting a corner of a 'pure' barcode.
     * 
     * @return {x,y} coordinate of top-left-most 1 bit, or null if it is all white
     */
    this.getTopLeftOnBit = function() {
        var bitsOffset = 0;
        while( bitsOffset < bits.length && bits[bitsOffset] == 0 ) {
            bitsOffset++;
        }
        if( bitsOffset == bits.length ) {
            return undefined;
        }
        var y = bitsOffset / rowSize;
        var x = (bitsOffset % rowSize) << 5;
    
        var theBits = bits[bitsOffset];
        var bit = 0;
        while( (theBits << (31-bit)) == 0 ) {
            bit++;
        }
        x += bit;
        return [ x, y ];
    }

    /**
     * @return The width of the matrix
     */
    this.getWidth = function() { return width; }

    /**
     * @return The height of the matrix
     */
    this.getHeight = function() { return height; }

    this.equals = function(obj) {
        if( !(obj instanceof BitMatrix)) return false;

        if( width != obj.width || height != obj.height ||
            rowSize != obj.rowSize || bits.length != obj.bits.length) {
            return false;
        }
        for( var i = 0; i < bits.length; i++ ) {
            if( bits[i] != obj.bits[i] ) {
                return false;
            }
        }
        return true;
    }

    this.hashCode = function() {
        var hash = width;
        hash = 31 * hash + width;
        hash = 31 * hash + height;
        hash = 31 * hash + rowSize;
        for( var i = 0; i < bits.length; i++ ) {
            hash = 31 * hash + bits[i];
        }
        return hash;
    }

    this.toString = function() {
        var result = [];
        for( var y = 0; y < height; y++) {
            for( var x = 0; x < width; x++) {
                result.push(this.get(x, y) ? "X " : "  ");
            }
            result.push('\n');
        }
        return result.join('');
    }

}

