/**
 * <p>A simple, fast array of bits, represented compactly by an array of ints internally.</p>
 */
function BitArray(size) {

    function makeArray(size) { return new Array( (size + 31) >> 5 ); }

    var bits;
    if( arguments.length == 0 ) {
        size = 0;
        bits = new Array( 1 );
    }
    else {
        bits = makeArray( size );
    }

    this.getSize = function() { return size; }

    this.getSizeInBytes = function() { return (size + 7) >> 3; }

    /**
     * @param i bit to get
     * @return true iff bit i is set
     */
    this.get = function(i) { return (bits[i >> 5] & (1 << (i & 0x1F))) != 0; }

    /**
     * Sets bit i.
     *
     * @param i bit to set
     */
    this.set = function(i) { bits[i >> 5] |= 1 << (i & 0x1F); }

    /**
     * Flips bit i.
     *
     * @param i bit to set
     */
    this.flip = function(i) { bits[i >> 5] ^= 1 << (i & 0x1F); }

    /**
     * Sets a block of 32 bits, starting at bit i.
     *
     * @param i first bit to set
     * @param newBits the new value of the next 32 bits. Note again that the least-significant bit
     * corresponds to bit i, the next-least-significant to i+1, and so on.
     */
    this.setBulk = function(i, newBits) { bits[i >> 5] = newBits; }

    /**
     * Clears all bits (sets to false).
     */
    this.clear = function() {
        for( var i = 0; i < size; i++) bits[i] = 0;
    }

    /**
     * Efficient method to check if a range of bits is set, or not set.
     *
     * @param start start of range, inclusive.
     * @param end end of range, exclusive
     * @param value if true, checks that bits in range are set, otherwise checks that they are not set
     * @return true iff all bits are set or not set in range, according to value argument
     * @throws IllegalArgumentException if end is less than or equal to start
     */
    this.isRange = function(start, end, value) {
        if( end < start ) {
            throw new Error();
        }
        if( end == start ) {
            return true; // empty range matches
        }
        end--; // will be easier to treat this as the last actually set bit -- inclusive    
        var firstInt = start >> 5;
        var lastInt = end >> 5;
        for( var i = firstInt; i <= lastInt; i++ ) {
            var firstBit = i > firstInt ? 0 : start & 0x1F;
            var lastBit = i < lastInt ? 31 : end & 0x1F;
            var mask;
            if( firstBit == 0 && lastBit == 31 ) {
                mask = -1;
            } else {
                mask = 0;
                for( var j = firstBit; j <= lastBit; j++ ) {
                    mask |= 1 << j;
                }
            }

            // Return false if we're looking for 1s and the masked bits[i] isn't all 1s (that is,
            // equals the mask, or we're looking for 0s and the masked portion is not all 0s
            if( (bits[i] & mask) != (value ? mask : 0) ) {
                return false;
            }
        }
        return true;
    }

    this.appendBit = function(bit) {
        if( bit ) {
            bits[size >> 5] |= (1 << (size & 0x1F));
        }
        size++;
    }

    /**
     * Appends the least-significant bits, from value, in order from most-significant to
     * least-significant. For example, appending 6 bits from 0x000001E will append the bits
     * 0, 1, 1, 1, 1, 0 in that order.
     */
    this.appendBits = function(value, numBits) {
        if( numBits < 0 || numBits > 32 ) {
            throw new Error("Num bits must be between 0 and 32");
        }
        for( var numBitsLeft = numBits; numBitsLeft > 0; numBitsLeft-- ) {
            this.appendBit(((value >> (numBitsLeft - 1)) & 0x01) == 1);
        }
    }

    this.appendBitArray = function(other) {
        var otherSize = other.getSize();
        for( var i = 0; i < otherSize; i++ ) {
            this.appendBit(other.get(i));
        }
    }

    this.xor = function(other) {
        var otherBits = other.getBitArray();
        var otherSize = other.getSize();
        if( size != otherSize ) {
            throw new Error("Sizes don't match ("+size+"/"+otherSize+")");
        }
        for( var i = 0; i < size; i++ ) {
            // The last byte could be incomplete (i.e. not have 8 bits in
            // it) but there is no problem since 0 XOR 0 == 0.
            bits[i] ^= otherBits[i];
        }
    }

    /**
     *
     * @param bitOffset first bit to start writing
     * @param array array to write into. Bytes are written most-significant byte first. This is the opposite
     *  of the internal representation, which is exposed by {@link #getBitArray()}
     * @param offset position in array to start writing
     * @param numBytes how many bytes to write
     */
    this.toBytes = function(bitOffset, array, offset, numBytes) {
        for( var i = 0; i < numBytes; i++ ) {
            var theByte = 0;
            for( var j = 0; j < 8; j++ ) {
                if( this.get(bitOffset) ) {
                    theByte |= 1 << (7 - j);
                }
                bitOffset++;
            }
            array[offset + i] = theByte;
        }
    }

    /**
     * @return underlying array of ints. The first element holds the first 32 bits, and the least
     *         significant bit is bit 0.
     */
    this.getBitArray = function() { return bits; }

    /**
     * Reverses all bits in the array.
     */
    this.reverse = function() {
        var newBits = new Array( size );
        for( var i = 0; i < size; i++ ) {
            if( this.get(size - i - 1) ) {
                newBits[i >> 5] |= 1 << (i & 0x1F);
            }
        }
        bits = newBits;
    }

    this.toString = function() {
        var result = [];
        for( var i = 0; i < size; i++ ) {
            if( (i & 0x07) == 0 ) {
                result.push(' ');
            }
            result.push( this.get(i) ? 'X' : '.');
        }
        return result.join('');
    }

}
exports.BitArray = BitArray;
