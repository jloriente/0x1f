var Mode = require('./mode').Mode,
    BitArray = require('./bitarray').BitArray,
    Version = require('./version').Version;
    CharacterSetECI = require('./characterseteci').CharacterSetECI
    EncodeHintType = require('./encodehinttype').EncodeHintType,
    BlockPair = require('./blockpair').BlockPair;
    ByteMatrix = require('./bytematrix').ByteMatrix,
    QRCode = require('./qrcode').QRCode,
    MatrixUtil = require('./matrixutil').MatrixUtil,
    MaskUtil = require('./maskutil').MaskUtil;

function Encoder() {

    var ALPHANUMERIC_TABLE = [
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,  // 0x00-0x0f
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,  // 0x10-0x1f
        36, -1, -1, -1, 37, 38, -1, -1, -1, -1, 39, 40, -1, 41, 42, 43,  // 0x20-0x2f
        0,   1,  2,  3,  4,  5,  6,  7,  8,  9, 44, -1, -1, -1, -1, -1,  // 0x30-0x3f
        -1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,  // 0x40-0x4f
        25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, -1, -1, -1, -1, -1,  // 0x50-0x5f
    ];
    var CH0 = '0'.charCodeAt(0);
    var CH9 = '9'.charCodeAt(0);

    var DEFAULT_BYTE_MODE_ENCODING = "ISO-8859-1";

    function calculateMaskPenalty(matrix) {
        var penalty = 0;
        penalty += MaskUtil.applyMaskPenaltyRule1(matrix);
        penalty += MaskUtil.applyMaskPenaltyRule2(matrix);
        penalty += MaskUtil.applyMaskPenaltyRule3(matrix);
        penalty += MaskUtil.applyMaskPenaltyRule4(matrix);
        return penalty;
    }

    this.encode = function(content, ecLevel, hints, qrCode) {
        var encoding = hints ? hints[EncodeHintType.CHARACTER_SET] : DEFAULT_BYTE_MODE_ENCODING;

        // Step 1: Choose the mode (encoding).
        var mode = chooseMode(content, encoding);
        // Step 2: Append "bytes" into "dataBits" in appropriate encoding.
        var dataBits = new BitArray();
        appendBytes(content, mode, dataBits, encoding);
        // Step 3: Initialize QR code that can contain "dataBits".
        var numInputBytes = dataBits.getSizeInBytes();
        initQRCode(numInputBytes, ecLevel, mode, qrCode);

        // Step 4: Build another bit vector that contains header and data.
        var headerAndDataBits = new BitArray();

        // Step 4.5: Append ECI message if applicable
        if( mode == Mode.BYTE && DEFAULT_BYTE_MODE_ENCODING != encoding ) {
            var eci = CharacterSetECI.getCharacterSetECIByName(encoding);
            if( eci ) {
                appendECI(eci, headerAndDataBits);
            }
        }

        appendModeInfo(mode, headerAndDataBits);
        
        var numLetters = (mode === Mode.BYTE) ? dataBits.getSizeInBytes() : content.length;
        appendLengthInfo(numLetters, qrCode.getVersion(), mode, headerAndDataBits);
        headerAndDataBits.appendBitArray(dataBits);

        // Step 5: Terminate the bits properly.
        terminateBits(qrCode.getNumDataBytes(), headerAndDataBits);

        // Step 6: Interleave data bits with error correction code.
        var finalBits = new BitArray();
        interleaveWithECBytes(headerAndDataBits, qrCode.getNumTotalBytes(), qrCode.getNumDataBytes(), qrCode.getNumRSBlocks(), finalBits);

        // Step 7: Choose the mask pattern and set to "qrCode".
        var matrix = new ByteMatrix(qrCode.getMatrixWidth(), qrCode.getMatrixWidth());
        qrCode.setMaskPattern(chooseMaskPattern(finalBits, qrCode.getECLevel(), qrCode.getVersion(), matrix));

        // Step 8.  Build the matrix and set it to "qrCode".
        MatrixUtil.buildMatrix(finalBits, qrCode.getECLevel(), qrCode.getVersion(), qrCode.getMaskPattern(), matrix);
        qrCode.setMatrix(matrix);
        // Step 9.  Make sure we have a valid QR Code.
        if( !qrCode.isValid() ) {
            throw new Error("Invalid QR code: " + qrCode.toString());
        }
    }

    function getAlphanumericCode(code) {
        return code < ALPHANUMERIC_TABLE.length ? ALPHANUMERIC_TABLE[code] : -1;
    }

    /**
    * Choose the best mode by examining the content. Note that 'encoding' is used as a hint;
    * if it is Shift_JIS, and the input is only double-byte Kanji, then we return {@link Mode#KANJI}.
    */
    function chooseMode(content, encoding) {
        
        if( "Shift_JIS" == encoding ) {
            // Choose Kanji mode if all input are double-byte characters
            return isOnlyDoubleByteKanji(content) ? Mode.KANJI : Mode.BYTE;
        }
        var hasNumeric = false, hasAlphanumeric = false;
        for( var i = 0; i < content.length; ++i ) {
            var c = content.charCodeAt(i);
            if( c >= CH0 && c <= CH9 ) {
                hasNumeric = true;
            } else if( getAlphanumericCode(c) != -1 ) {
                hasAlphanumeric = true;
            } else {
                return Mode.BYTE;
            }
        }
        if( hasAlphanumeric ) {
            return Mode.ALPHANUMERIC;
        } else if( hasNumeric ) {
            return Mode.NUMERIC;
        }
        return Mode.BYTE;
    }

    function isOnlyDoubleByteKanji(content) {
        var bytes;
        try {
            bytes = content.getBytes("Shift_JIS"); // TODO
        }
        catch(e) {
            return false;
        }
        var length = bytes.length;
        if( length % 2 != 0 ) {
            return false;
        }
        for( var i = 0; i < length; i += 2 ) {
            var byte1 = bytes[i] & 0xFF;
            if( (byte1 < 0x81 || byte1 > 0x9F) && (byte1 < 0xE0 || byte1 > 0xEB) ) {
                return false;
            }
        }
        return true;
    }

    function chooseMaskPattern(bits, ecLevel, version, matrix) {
        var minPenalty = Number.MAX_VALUE;  // Lower penalty is better.
        var bestMaskPattern = -1;
        // We try all mask patterns to choose the best one.
        for( var maskPattern = 0; maskPattern < QRCode.NUM_MASK_PATTERNS; maskPattern++ ) {
            MatrixUtil.buildMatrix(bits, ecLevel, version, maskPattern, matrix);
            var penalty = calculateMaskPenalty(matrix);
            if( penalty < minPenalty ) {
                minPenalty = penalty;
                bestMaskPattern = maskPattern;
            }
        }
        return bestMaskPattern;
    }

    /**
    * Initialize "qrCode" according to "numInputBytes", "ecLevel", and "mode". On success,
    * modify "qrCode".
    */
    function initQRCode(numInputBytes, ecLevel, mode, qrCode) {
        qrCode.setECLevel(ecLevel);
        qrCode.setMode(mode);

        // In the following comments, we use numbers of Version 7-H.
        for( var versionNum = 1; versionNum <= 40; versionNum++ ) {
            var version = Version.getVersionForNumber(versionNum);
            // numBytes = 196
            var numBytes = version.getTotalCodewords();
            // getNumECBytes = 130
            var ecBlocks = version.getECBlocksForLevel(ecLevel);
            var numEcBytes = ecBlocks.getTotalECCodewords();
            // getNumRSBlocks = 5
            var numRSBlocks = ecBlocks.getNumBlocks();
            // getNumDataBytes = 196 - 130 = 66
            var numDataBytes = numBytes - numEcBytes;
            // We want to choose the smallest version which can contain data of "numInputBytes" + some
            // extra bits for the header (mode info and length info). The header can be three bytes
            // (precisely 4 + 16 bits) at most. Hence we do +3 here.
            if( numDataBytes >= numInputBytes + 3 ) {
                // Yay, we found the proper rs block info!
                qrCode.setVersion(versionNum);
                qrCode.setNumTotalBytes(numBytes);
                qrCode.setNumDataBytes(numDataBytes);
                qrCode.setNumRSBlocks(numRSBlocks);
                // getNumECBytes = 196 - 66 = 130
                qrCode.setNumECBytes(numEcBytes);
                // matrix width = 21 + 6 * 4 = 45
                qrCode.setMatrixWidth(version.getDimensionForVersion());
                return;
            }
        }
        throw new Error("Cannot find proper rs block info (input data too big?)");
    }

    /**
     * Terminate bits as described in 8.4.8 and 8.4.9 of JISX0510:2004 (p.24).
     */
    function terminateBits(numDataBytes, bits) {
        var capacity = numDataBytes << 3;
        if( bits.getSize() > capacity ) {
          throw new Error("data bits cannot fit in the QR Code"+bits.getSize()+" > "+capacity);
        }
        for( var i = 0; i < 4 && bits.getSize() < capacity; ++i ) {
            bits.appendBit(false);
        }
        // Append termination bits. See 8.4.8 of JISX0510:2004 (p.24) for details.
        // If the last byte isn't 8-bit aligned, we'll add padding bits.
        var numBitsInLastByte = bits.getSize() & 0x07;    
        if( numBitsInLastByte > 0 ) {
            for( var i = numBitsInLastByte; i < 8; i++ ) {
                bits.appendBit(false);
            }
        }
        // If we have more space, we'll fill the space with padding patterns defined in 8.4.9 (p.24).
        var numPaddingBytes = numDataBytes - bits.getSizeInBytes();
        for( var i = 0; i < numPaddingBytes; ++i ) {
            bits.appendBits(((i & 0x01) == 0) ? 0xEC : 0x11, 8);
        }
        if( bits.getSize() != capacity ) {
          throw new Error("Bits size does not equal capacity");
        }
    }

    /**
     * Get number of data bytes and number of error correction bytes for block id "blockID". Store
     * the result in "numDataBytesInBlock", and "numECBytesInBlock". See table 12 in 8.5.1 of
     * JISX0510:2004 (p.30)
     */
    function getNumDataBytesAndNumECBytesForBlockID(numTotalBytes, numDataBytes, numRSBlocks, blockID,  numDataBytesInBlock, numECBytesInBlock) {
        if( blockID >= numRSBlocks ) {
            throw new Error("Block ID too large");
        }
        // numRsBlocksInGroup2 = 196 % 5 = 1
        var numRsBlocksInGroup2 = numTotalBytes % numRSBlocks;
        // numRsBlocksInGroup1 = 5 - 1 = 4
        var numRsBlocksInGroup1 = numRSBlocks - numRsBlocksInGroup2;
        // numTotalBytesInGroup1 = 196 / 5 = 39
        var numTotalBytesInGroup1 = numTotalBytes / numRSBlocks;
        // numTotalBytesInGroup2 = 39 + 1 = 40
        var numTotalBytesInGroup2 = numTotalBytesInGroup1 + 1;
        // numDataBytesInGroup1 = 66 / 5 = 13
        var numDataBytesInGroup1 = numDataBytes / numRSBlocks;
        // numDataBytesInGroup2 = 13 + 1 = 14
        var numDataBytesInGroup2 = numDataBytesInGroup1 + 1;
        // numEcBytesInGroup1 = 39 - 13 = 26
        var numEcBytesInGroup1 = numTotalBytesInGroup1 - numDataBytesInGroup1;
        // numEcBytesInGroup2 = 40 - 14 = 26
        var numEcBytesInGroup2 = numTotalBytesInGroup2 - numDataBytesInGroup2;
        // Sanity checks.
        // 26 = 26
        if( numEcBytesInGroup1 != numEcBytesInGroup2 ) {
            throw new Error("EC bytes mismatch");
        }
        // 5 = 4 + 1.
        if( numRSBlocks != numRsBlocksInGroup1 + numRsBlocksInGroup2 ) {
            throw new Error("RS blocks mismatch");
        }
        // 196 = (13 + 26) * 4 + (14 + 26) * 1
        if( numTotalBytes !=
            ((numDataBytesInGroup1 + numEcBytesInGroup1) *
                numRsBlocksInGroup1) +
                ((numDataBytesInGroup2 + numEcBytesInGroup2) *
                    numRsBlocksInGroup2)) {
            throw new Error("Total bytes mismatch");
        }

        if( blockID < numRsBlocksInGroup1 ) {
            numDataBytesInBlock[0] = numDataBytesInGroup1;
            numECBytesInBlock[0] = numEcBytesInGroup1;
        } else {
            numDataBytesInBlock[0] = numDataBytesInGroup2;
            numECBytesInBlock[0] = numEcBytesInGroup2;
        }
    }

    /**
     * Interleave "bits" with corresponding error correction bytes. On success, store the result in
     * "result". The interleave rule is complicated. See 8.6 of JISX0510:2004 (p.37) for details.
     */
    function interleaveWithECBytes(bits, numTotalBytes, numDataBytes, numRSBlocks, result) {
        // "bits" must have "getNumDataBytes" bytes of data.
        if( bits.getSizeInBytes() != numDataBytes ) {
          throw new Error("Number of bits and data bytes does not match");
        }

        // Step 1.  Divide data bytes into blocks and generate error correction bytes for them. We'll
        // store the divided data bytes blocks and error correction bytes blocks into "blocks".
        var dataBytesOffset = 0;
        var maxNumDataBytes = 0;
        var maxNumEcBytes = 0;

        // Since, we know the number of reedsolmon blocks, we can initialize the vector with the number.
        var blocks = [];

        for( var i = 0; i < numRSBlocks; ++i ) {
            var numDataBytesInBlock = [];
            var numEcBytesInBlock = [];
            getNumDataBytesAndNumECBytesForBlockID( numTotalBytes, numDataBytes, numRSBlocks, i, numDataBytesInBlock, numEcBytesInBlock);
        
            var size = numDataBytesInBlock[0];
            var dataBytes = [];
            bits.toBytes(8*dataBytesOffset, dataBytes, 0, size);
            var ecBytes = generateECBytes(dataBytes, numEcBytesInBlock[0]);
            blocks.push(new BlockPair(dataBytes, ecBytes));
            maxNumDataBytes = Math.max(maxNumDataBytes, size);
            maxNumEcBytes = Math.max(maxNumEcBytes, ecBytes.length);
            dataBytesOffset += numDataBytesInBlock[0];
        }
        if( numDataBytes != dataBytesOffset ) {
            throw new Error("Data bytes does not match offset");
        }

        // First, place data blocks.
        for( var i = 0; i < maxNumDataBytes; ++i ) {
            for( var j = 0; j < blocks.length; ++j ) {
                var dataBytes = blocks[j].getDataBytes();
                if( i < dataBytes.length ) {
                    result.appendBits(dataBytes[i], 8);
                }
            }
        }
        // Then, place error correction blocks.
        for( var i = 0; i < maxNumEcBytes; ++i ) {
            for( var j = 0; j < blocks.length; ++j ) {
                var ecBytes = blocks[j].getErrorCorrectionBytes();
                if( i < ecBytes.length ) {
                    result.appendBits(ecBytes[i], 8);
                }
            }
        }
        if( numTotalBytes != result.getSizeInBytes() ) {  // Should be same.
            throw new Error("Interleaving error: "+numTotalBytes+" and "+result.getSizeInBytes()+" differ.");
        }
    }

    function generateECBytes(dataBytes, numEcBytesInBlock) {
        var numDataBytes = dataBytes.length;
        var toEncode = new Array(numDataBytes+numEcBytesInBlock);
        for( var i = 0; i < numDataBytes; i++ ) {
            toEncode[i] = dataBytes[i] & 0xFF;
        }
        new ReedSolomonEncoder(GF256.QR_CODE_FIELD).encode(toEncode, numEcBytesInBlock);

        var ecBytes = new Array(numEcBytesInBlock);
        for( var i = 0; i < numEcBytesInBlock; i++ ) {
            ecBytes[i] = toEncode[numDataBytes + i];
        }
        return ecBytes;
    }

    /**
     * Append mode info. On success, store the result in "bits".
     */
    function appendModeInfo(mode, bits) {
        bits.appendBits(mode.getBits(), 4);
    }


    /**
     * Append length info. On success, store the result in "bits".
     */
    function appendLengthInfo(numLetters, version, mode, bits) {
        numBits = mode.getCharacterCountBits(Version.getVersionForNumber(version));
        if( numLetters > ((1 << numBits) - 1) ) {
          throw new Error(numLetters+" is bigger than "+((1 << numBits) - 1));
        }
        bits.appendBits(numLetters, numBits);
    }

    /**
     * Append "bytes" in "mode" mode (encoding) into "bits". On success, store the result in "bits".
     */
    function appendBytes(content, mode, bits, encoding) {
        if( mode === Mode.NUMERIC ) {
            appendNumericBytes(content, bits);
        } else if( mode === Mode.ALPHANUMERIC ) {
            appendAlphanumericBytes(content, bits);
        } else if( mode === Mode.BYTE ) {
            append8BitBytes(content, bits, encoding);
        } else if( mode === Mode.KANJI ) {
            appendKanjiBytes(content, bits);
        } else {
            throw new Error("Invalid mode: "+mode);
        }
    }

    function appendNumericBytes(content, bits) {
        var length = content.length;
        var i = 0;
        while( i < length ) {
            var num1 = content.charCodeAt(i) - CH0;
            if( i + 2 < length) {
                // Encode three numeric letters in ten bits.
                var num2 = content.charCodeAt(i + 1) - CH0;
                var num3 = content.charCodeAt(i + 2) - CH0;
                bits.appendBits(num1 * 100 + num2 * 10 + num3, 10);
                i += 3;
            } else if (i + 1 < length) {
                // Encode two numeric letters in seven bits.
                var num2 = content.charCodeAt(i + 1) - CH0;
                bits.appendBits(num1 * 10 + num2, 7);
                i += 2;
            } else {
                // Encode one numeric letter in four bits.
                bits.appendBits(num1, 4);
                i++;
            }
        }
    }

    function appendAlphanumericBytes(content, bits) {
        var length = content.length;
        var i = 0;
        while( i < length ) {
            var code1 = getAlphanumericCode(content.charCodeAt(i));
            if( code1 == -1 ) {
                throw new Error();
            }
            if( i + 1 < length ) {
                var code2 = getAlphanumericCode(content.charCodeAt(i + 1));
                if( code2 == -1 ) {
                    throw new Error();
                }
                // Encode two alphanumeric letters in 11 bits.
                bits.appendBits(code1 * 45 + code2, 11);
                i += 2;
            } else {
                // Encode one alphanumeric letter in six bits.
                bits.appendBits(code1, 6);
                i++;
            }
        }
    }
function toBin(str)
{
 var shift=0, rv=0;
 
 for(var i=str.length-1; i>-1; i--)
 {
  rv+=str.charCodeAt(i)<<shift;
  shift+=8;
 }
  
 return rv;  
}

    function append8BitBytes(content, bits, encoding) {
        var bytes;
        try {
            bytes = content.getBytes(encoding); // TODO: String.getBytes(encoding) - No JS equivalent
        } catch(e) { // unsupported encoding error
            throw e;
        }
        for( var i = 0; i < bytes.length; ++i ) {
            bits.appendBits(bytes[i], 8);
        }
    }

    function appendKanjiBytes(content, bits) {
        var bytes;
        try {
            bytes = content.getBytes("Shift_JIS"); // TODO: See previous TODO
        } catch (e) {
            throw e;
        }
        var length = bytes.length;
        for( var i = 0; i < length; i += 2 ) {
            var byte1 = bytes[i] & 0xFF;
            var byte2 = bytes[i + 1] & 0xFF;
            var code = (byte1 << 8) | byte2;
            var subtracted = -1;
            if( code >= 0x8140 && code <= 0x9ffc ) {
                subtracted = code - 0x8140;
            } else if( code >= 0xe040 && code <= 0xebbf ) {
                subtracted = code - 0xc140;
            }
            if( subtracted == -1 ) {
                throw new Error("Invalid byte sequence");
            }
            var encoded = ((subtracted >> 8) * 0xc0) + (subtracted & 0xff);
            bits.appendBits(encoded, 13);
        }
    }

    function appendECI(eci, bits) {
        bits.appendBits(Mode.ECI.getBits(), 4);
        // This is correct for values up to 127, which is all we need now.
        bits.appendBits(eci.getValue(), 8);
    }

}

// All of following from package com.google.zxing.common.reedsolomon
function ReedSolomonEncoder(field) {

    if( GF256.QR_CODE_FIELD !== field ) {
        throw new Error("Only QR Code is supported at this time");
    }
    cachedGenerators = [ new GF256Poly(field, [ 1 ]) ];

    function buildGenerator(degree) {
        if( degree >= cachedGenerators.length ) {
            var lastGenerator = cachedGenerators[cachedGenerators.length - 1];
            for( var d = cachedGenerators.length; d <= degree; d++ ) {
                var nextGenerator = lastGenerator.multiply(new GF256Poly(field, [ 1, field.exp(d - 1) ]));
                cachedGenerators.push(nextGenerator);
                lastGenerator = nextGenerator;
            }
        }
        return cachedGenerators[degree];    
    }

    this.encode = function(toEncode, ecBytes) {
        if( ecBytes == 0 ) {
            throw new Error("No error correction bytes");
        }
        var dataBytes = toEncode.length - ecBytes;
        if( dataBytes <= 0 ) {
            throw new Error("No data bytes provided");
        }
        var generator = buildGenerator(ecBytes);
        var infoCoefficients = new Array(dataBytes);
        // System.arrayCopy
        for( var i = 0; i < dataBytes; i++ ) {
            infoCoefficients[i] = toEncode[i];
        }
        var info = new GF256Poly(field, infoCoefficients);
        info = info.multiplyByMonomial(ecBytes, 1);
        var remainder = info.divide(generator)[1];
        var coefficients = remainder.coefficients;
        var numZeroCoefficients = ecBytes - coefficients.length;
        for( var i = 0; i < numZeroCoefficients; i++ ) {
            toEncode[dataBytes + i] = 0;
        }
        // System.arrayCopy
        for( var i = 0, j = dataBytes + numZeroCoefficients; i < coefficients.length; i++, j++ ) {
            toEncode[j] = coefficients[i];
        }
    }

}

/**
 * <p>This class contains utility methods for performing mathematical operations over
 * the Galois Field GF(256). Operations use a given primitive polynomial in calculations.</p>
 *
 * <p>Throughout this package, elements of GF(256) are represented as an <code>int</code>
 * for convenience and speed (but at the cost of memory).
 * Only the bottom 8 bits are really used.</p>
 *
 * Create a representation of GF(256) using the given primitive polynomial.
 *
 * @param primitive irreducible polynomial whose coefficients are represented by
 *  the bits of an int, where the least-significant bit represents the constant
 *  coefficient
 */
function GF256(primitive) {

    var expTable = new Array(256);
    var logTable = new Array(256);
    var x = 1;
    for( var i = 0; i < 256; i++ ) {
        expTable[i] = x;
        x <<= 1; // x = x * 2; we're assuming the generator alpha is 2
        if( x >= 0x100 ) {
            x ^= primitive;
        }
    }
    for( var i = 0; i < 255; i++ ) {
        logTable[expTable[i]] = i;
    }
    // logTable[0] == 0 but this should never be used
    var zero = new GF256Poly(this, [ 0 ] );
    var one = new GF256Poly(this, [ 1 ] );

    this.getZero = function() { return zero; }

    this.getOne = function() { return one; }

    /**
     * @return the monomial representing coefficient * x^degree
     */
    this.buildMonomial = function(degree, coefficient) {
        if( degree < 0 ) {
            throw new Error();
        }
        if( coefficient == 0 ) {
            return zero;
        }
        var coefficients = new Array(degree + 1);
        coefficients[0] = coefficient;
        return new GF256Poly(this, coefficients);
    }

    /**
     * @return 2 to the power of a in GF(256)
     */
    this.exp = function(a) { return expTable[a]; }

    /**
     * @return base 2 log of a in GF(256)
     */
    this.log = function(a) {
        if( a == 0 ) {
            throw new Error();
        }
        return logTable[a];
    }

    /**
     * @return multiplicative inverse of a
     */
    this.inverse = function(a) {
        if( a == 0 ) {
            throw new Error();
        }
        return expTable[255 - logTable[a]];
    }

    /**
     * @param a
     * @param b
     * @return product of a and b in GF(256)
     */
    this.multiply = function(a, b) {
        if( a == 0 || b == 0 ) {
            return 0;
        }
        var logSum = logTable[a] + logTable[b];
        // index is a sped-up alternative to logSum % 255 since sum
        // is in [0,510]. Thanks to jmsachs for the idea
        return expTable[(logSum & 0xFF) + (logSum >>> 8)];
    }

}

GF256.QR_CODE_FIELD = new GF256(0x011D); // x^8 + x^4 + x^3 + x^2 + 1
GF256.DATA_MATRIX_FIELD = new GF256(0x012D); // x^8 + x^5 + x^3 + x^2 + 1

/**
 * Implements both addition and subtraction -- they are the same in GF(256).
 *
 * @return sum/difference of a and b
 */
GF256.addOrSubtract = function(a, b) { return a ^ b; }

/**
 * <p>Represents a polynomial whose coefficients are elements of GF(256).
 * Instances of this class are immutable.</p>
 *
 * <p>Much credit is due to William Rucklidge since portions of this code are an indirect
 * port of his C++ Reed-Solomon implementation.</p>
 *
 * @param field the {@link GF256} instance representing the field to use
 * to perform computations
 * @param coefficients coefficients as ints representing elements of GF(256), arranged
 * from most significant (highest-power term) coefficient to least significant
 * @throws IllegalArgumentException if argument is null or empty,
 * or if leading coefficient is 0 and this is not a
 * constant polynomial (that is, it is not the monomial "0")
 */
function GF256Poly(field, coeffs) {

    if( coeffs == null || coeffs.length == 0 ) {
        throw new Error();
    }

    var coefficients;
    var coefficientsLength = coeffs.length;

    if( coefficientsLength > 1 && coeffs[0] == 0 ) {
        // Leading term must be non-zero for anything except the constant polynomial "0"
        var firstNonZero = 1;
        while( firstNonZero < coefficientsLength && coeffs[firstNonZero] == 0 ) {
            firstNonZero++;
        }
        if( firstNonZero == coefficientsLength ) {
            coefficients = field.getZero().getCoefficients();
        } else {
            coefficients = new Array(coefficientsLength - firstNonZero);
            // System.arrayCopy
            for( var i = 0, j = firstNonZero; i < coefficients.length; i++, j++ ) {
                coefficients[i] = coeffs[j];
            }
        }
    } else {
        coefficients = coeffs;
    }

    this.field = field;
    this.coefficients = coefficients;

    /**
     * @return degree of this polynomial
     */
    this.getDegree = function() { return coefficients.length - 1; }

    /**
     * @return true iff this polynomial is the monomial "0"
     */
    this.isZero = function() { return coefficients[0] == 0; }

    /**
     * @return coefficient of x^degree term in this polynomial
     */
    this.getCoefficient = function(degree) { return coefficients[coefficients.length - 1 - degree]; }

   /**
    * @return evaluation of this polynomial at a given point
    */
    this.evaluateAt = function(a) {
        if( a == 0 ) {
            // Just return the x^0 coefficient
            return this.getCoefficient(0);
        }
        var size = coefficients.length;
        if( a == 1 ) {
            // Just the sum of the coefficients
            var result = 0;
            for( var i = 0; i < size; i++ ) {
                result = GF256.addOrSubtract(result, coefficients[i]);
            }
            return result;
        }
        var result = coefficients[0];
        for( var i = 1; i < size; i++ ) {
            result = GF256.addOrSubtract(field.multiply(a, result), coefficients[i]);
        }
        return result;
    }

    this.addOrSubtract = function(other) {
        if( field !== other.field ) {
            throw new Error("GF256Polys do not have same GF256 field");
        }
        if( this.isZero() ) {
            return other;
        }
        if( other.isZero() ) {
            return this;
        }
        var smallerCoefficients = coefficients;
        var largerCoefficients = other.coefficients;
        if( smallerCoefficients.length > largerCoefficients.length ) {
            var temp = smallerCoefficients;
            smallerCoefficients = largerCoefficients;
            largerCoefficients = temp;
        }
        var sumDiff = new Array(largerCoefficients.length);
        var lengthDiff = largerCoefficients.length - smallerCoefficients.length;
        // Copy high-order terms only found in higher-degree polynomial's coefficients
        // System.arraycopy(largerCoefficients, 0, sumDiff, 0, lengthDiff);
        for( var i = 0; i < lengthDiff; i++ ) {
            sumDiff[i] = largerCoefficients[i];
        }

        for( var i = lengthDiff; i < largerCoefficients.length; i++ ) {
            sumDiff[i] = GF256.addOrSubtract(smallerCoefficients[i - lengthDiff], largerCoefficients[i]);
        }
        return new GF256Poly(field, sumDiff);
    }

    this.multiply = function(otherOrScalar) {
        if( otherOrScalar instanceof GF256Poly ) {
            var other = otherOrScalar;
            if( field !== other.field ) {
                throw new Error("GF256Polys do not have same GF256 field");
            }
            if( this.isZero() || other.isZero() ) {
                return field.getZero();
            }
            var aCoefficients = coefficients;
            var aLength = aCoefficients.length;
            var bCoefficients = other.coefficients;
            var bLength = bCoefficients.length;
            var product = new Array(aLength + bLength - 1);
            for( var i = 0; i < aLength; i++ ) {
                var aCoeff = aCoefficients[i];
                for( var j = 0; j < bLength; j++ ) {
                    product[i + j] = GF256.addOrSubtract(product[i + j], field.multiply(aCoeff, bCoefficients[j]));
                }
            }
            return new GF256Poly(field, product);
        }
        else {
            var scalar = otherOrScalar;
            if( scalar == 0 ) {
                return field.getZero();
            }
            if( scalar == 1 ) {
                return this;
            }
            var size = coefficients.length;
            var product = new Array(size);
            for( var i = 0; i < size; i++ ) {
                product[i] = field.multiply(coefficients[i], scalar);
            }
            return new GF256Poly(field, product);
        }
    }

    this.multiplyByMonomial = function(degree, coefficient) {
        if( degree < 0 ) {
            throw new Error();
        }
        if( coefficient == 0 ) {
            return field.getZero();
        }
        var size = coefficients.length;
        var product = new Array(size + degree);
        for( var i = 0; i < size; i++ ) {
            product[i] = field.multiply(coefficients[i], coefficient);
        }
        return new GF256Poly(field, product);
    }

    this.divide = function(other) {
        if( field !== other.field ) {
            throw new Error("GF256Polys do not have same GF256 field");
        }
        if( other.isZero() ) {
            throw new Error("Divide by 0");
        }

        var quotient = field.getZero();
        var remainder = this;

        var denominatorLeadingTerm = other.getCoefficient(other.getDegree());
        var inverseDenominatorLeadingTerm = field.inverse(denominatorLeadingTerm);

        while( remainder.getDegree() >= other.getDegree() && !remainder.isZero() ) {
            var degreeDifference = remainder.getDegree() - other.getDegree();
            var scale = field.multiply(remainder.getCoefficient(remainder.getDegree()), inverseDenominatorLeadingTerm);
            var term = other.multiplyByMonomial(degreeDifference, scale);
            var iterationQuotient = field.buildMonomial(degreeDifference, scale);
            quotient = quotient.addOrSubtract(iterationQuotient);
            remainder = remainder.addOrSubtract(term);
        }
        return [ quotient, remainder ];
    }

    this.toString = function() {
        var result = [];
        for( var degree = getDegree(); degree >= 0; degree-- ) {
            var coefficient = getCoefficient(degree);
            if( coefficient != 0 ) {
                if( coefficient < 0 ) {
                    result.push(" - ");
                    coefficient = -coefficient;
                } else {
                    if( result.length > 0 ) {
                        result.push(" + ");
                    }
                }
                if( degree == 0 || coefficient != 1 ) {
                    var alphaPower = field.log(coefficient);
                    if( alphaPower == 0 ) {
                        result.push('1');
                    } else if( alphaPower == 1 ) {
                        result.push('a');
                    } else {
                        result.push("a^");
                        result.push(alphaPower);
                    }

                }
                if( degree != 0 ) {
                    if( degree == 1 ) {
                        result.push('x');
                    } else {
                        result.push("x^");
                        result.push(degree);
                    }
                }
            }
        }
        return result.join('');
    }
}

exports.encoder = new Encoder();
