var BitArray = require('./bitarray').BitArray,
    QRCode = require('./qrcode').QRCode,
    MaskUtil = require('./maskutil').MaskUtil;

var MatrixUtil = {};

MatrixUtil.POSITION_DETECTION_PATTERN = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
];

MatrixUtil.HORIZONTAL_SEPARATION_PATTERN = [
    [0, 0, 0, 0, 0, 0, 0, 0],
];

MatrixUtil.VERTICAL_SEPARATION_PATTERN = [
    [0], [0], [0], [0], [0], [0], [0],
];

MatrixUtil.POSITION_ADJUSTMENT_PATTERN = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
];

// From Appendix E. Table 1, JIS0510X:2004 (p 71). The table was double-checked by komatsu.
MatrixUtil.POSITION_ADJUSTMENT_PATTERN_COORDINATE_TABLE = [
    [-1, -1, -1, -1,  -1,  -1,  -1],  // Version 1
    [ 6, 18, -1, -1,  -1,  -1,  -1],  // Version 2
    [ 6, 22, -1, -1,  -1,  -1,  -1],  // Version 3
    [ 6, 26, -1, -1,  -1,  -1,  -1],  // Version 4
    [ 6, 30, -1, -1,  -1,  -1,  -1],  // Version 5
    [ 6, 34, -1, -1,  -1,  -1,  -1],  // Version 6
    [ 6, 22, 38, -1,  -1,  -1,  -1],  // Version 7
    [ 6, 24, 42, -1,  -1,  -1,  -1],  // Version 8
    [ 6, 26, 46, -1,  -1,  -1,  -1],  // Version 9
    [ 6, 28, 50, -1,  -1,  -1,  -1],  // Version 10
    [ 6, 30, 54, -1,  -1,  -1,  -1],  // Version 11
    [ 6, 32, 58, -1,  -1,  -1,  -1],  // Version 12
    [ 6, 34, 62, -1,  -1,  -1,  -1],  // Version 13
    [ 6, 26, 46, 66,  -1,  -1,  -1],  // Version 14
    [ 6, 26, 48, 70,  -1,  -1,  -1],  // Version 15
    [ 6, 26, 50, 74,  -1,  -1,  -1],  // Version 16
    [ 6, 30, 54, 78,  -1,  -1,  -1],  // Version 17
    [ 6, 30, 56, 82,  -1,  -1,  -1],  // Version 18
    [ 6, 30, 58, 86,  -1,  -1,  -1],  // Version 19
    [ 6, 34, 62, 90,  -1,  -1,  -1],  // Version 20
    [ 6, 28, 50, 72,  94,  -1,  -1],  // Version 21
    [ 6, 26, 50, 74,  98,  -1,  -1],  // Version 22
    [ 6, 30, 54, 78, 102,  -1,  -1],  // Version 23
    [ 6, 28, 54, 80, 106,  -1,  -1],  // Version 24
    [ 6, 32, 58, 84, 110,  -1,  -1],  // Version 25
    [ 6, 30, 58, 86, 114,  -1,  -1],  // Version 26
    [ 6, 34, 62, 90, 118,  -1,  -1],  // Version 27
    [ 6, 26, 50, 74,  98, 122,  -1],  // Version 28
    [ 6, 30, 54, 78, 102, 126,  -1],  // Version 29
    [ 6, 26, 52, 78, 104, 130,  -1],  // Version 30
    [ 6, 30, 56, 82, 108, 134,  -1],  // Version 31
    [ 6, 34, 60, 86, 112, 138,  -1],  // Version 32
    [ 6, 30, 58, 86, 114, 142,  -1],  // Version 33
    [ 6, 34, 62, 90, 118, 146,  -1],  // Version 34
    [ 6, 30, 54, 78, 102, 126, 150],  // Version 35
    [ 6, 24, 50, 76, 102, 128, 154],  // Version 36
    [ 6, 28, 54, 80, 106, 132, 158],  // Version 37
    [ 6, 32, 58, 84, 110, 136, 162],  // Version 38
    [ 6, 26, 54, 82, 110, 138, 166],  // Version 39
    [ 6, 30, 58, 86, 114, 142, 170],  // Version 40
];

// Type info cells at the left top corner.
MatrixUtil.TYPE_INFO_COORDINATES = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
];

// From Appendix D in JISX0510:2004 (p. 67)
MatrixUtil.VERSION_INFO_POLY = 0x1f25;  // 1 1111 0010 0101

// From Appendix C in JISX0510:2004 (p.65).
MatrixUtil.TYPE_INFO_POLY = 0x537;
MatrixUtil.TYPE_INFO_MASK_PATTERN = 0x5412;

// Set all cells to -1.  -1 means that the cell is empty (not set yet).
MatrixUtil.clearMatrix = function(matrix) { matrix.clear(-1); }

// Build 2D matrix of QR Code from "dataBits" with "ecLevel", "version" and "getMaskPattern". On
// success, store the result in "matrix" and return true.
MatrixUtil.buildMatrix = function(dataBits, ecLevel, version, maskPattern, matrix) {
    MatrixUtil.clearMatrix(matrix);
    MatrixUtil.embedBasicPatterns(version, matrix);
    // Type information appear with any version.
    MatrixUtil.embedTypeInfo(ecLevel, maskPattern, matrix);
    // Version info appear if version >= 7.
    MatrixUtil.maybeEmbedVersionInfo(version, matrix);
    // Data should be embedded at end.
    MatrixUtil.embedDataBits(dataBits, maskPattern, matrix);
}

// Embed basic patterns. On success, modify the matrix and return true.
// The basic patterns are:
// - Position detection patterns
// - Timing patterns
// - Dark dot at the left bottom corner
// - Position adjustment patterns, if need be
MatrixUtil.embedBasicPatterns = function(version, matrix) {
    // Let's get started with embedding big squares at corners.
    MatrixUtil.embedPositionDetectionPatternsAndSeparators(matrix);
    // Then, embed the dark dot at the left bottom corner.
    MatrixUtil.embedDarkDotAtLeftBottomCorner(matrix);

    // Position adjustment patterns appear if version >= 2.
    MatrixUtil.maybeEmbedPositionAdjustmentPatterns(version, matrix);
    // Timing patterns should be embedded after position adj. patterns.
    MatrixUtil.embedTimingPatterns(matrix);
}

// Embed type information. On success, modify the matrix.
MatrixUtil.embedTypeInfo = function(ecLevel, maskPattern, matrix) {
    var typeInfoBits = new BitArray();
    MatrixUtil.makeTypeInfoBits(ecLevel, maskPattern, typeInfoBits);

    for( var i = 0; i < typeInfoBits.getSize(); ++i ) {
        // Place bits in LSB to MSB order.  LSB (least significant bit) is the last value in
        // "typeInfoBits".
        var bit = typeInfoBits.get(typeInfoBits.getSize() - 1 - i);

        // Type info bits at the left top corner. See 8.9 of JISX0510:2004 (p.46).
        var x1 = MatrixUtil.TYPE_INFO_COORDINATES[i][0];
        var y1 = MatrixUtil.TYPE_INFO_COORDINATES[i][1];
        matrix.set(x1, y1, bit);

        if( i < 8 ) {
            // Right top corner.
            var x2 = matrix.getWidth() - i - 1;
            var y2 = 8;
            matrix.set(x2, y2, bit);
        } else {
            // Left bottom corner.
            var x2 = 8;
            var y2 = matrix.getHeight() - 7 + (i - 8);
            matrix.set(x2, y2, bit);
        }
    }
}

// Embed version information if need be. On success, modify the matrix and return true.
// See 8.10 of JISX0510:2004 (p.47) for how to embed version information.
MatrixUtil.maybeEmbedVersionInfo = function(version, matrix) {
    if( version < 7 ) {  // Version info is necessary if version >= 7.
        return;  // Don't need version info.
    }
    var versionInfoBits = new BitArray();
    MatrixUtil.makeVersionInfoBits(version, versionInfoBits);

    var bitIndex = 6 * 3 - 1;  // It will decrease from 17 to 0.
    for( var i = 0; i < 6; ++i ) {
        for( var j = 0; j < 3; ++j ) {
            // Place bits in LSB (least significant bit) to MSB order.
            var bit = versionInfoBits.get(bitIndex);
            bitIndex--;
            // Left bottom corner.
            matrix.set(i, matrix.getHeight() - 11 + j, bit);
            // Right bottom corner.
            matrix.set(matrix.getHeight() - 11 + j, i, bit);
        }
    }
}

// Embed "dataBits" using "getMaskPattern". On success, modify the matrix and return true.
// For debugging purposes, it skips masking process if "getMaskPattern" is -1.
// See 8.7 of JISX0510:2004 (p.38) for how to embed data bits.
MatrixUtil.embedDataBits = function(dataBits, maskPattern, matrix) {
    var bitIndex = 0;
    var direction = -1;
    // Start from the right bottom cell.
    var x = matrix.getWidth() - 1;
    var y = matrix.getHeight() - 1;
    while( x > 0 ) {
        // Skip the vertical timing pattern.
        if( x == 6 ) {
            x -= 1;
        }
        while( y >= 0 && y < matrix.getHeight() ) {
            for( var i = 0; i < 2; ++i ) {
                var xx = x - i;
                // Skip the cell if it's not empty.
                if( !MatrixUtil.isEmpty(matrix.get(xx, y)) ) {
                    continue;
                }
                var bit;
                if( bitIndex < dataBits.getSize() ) {
                    bit = dataBits.get(bitIndex);
                    ++bitIndex;
                } else {
                    // Padding bit. If there is no bit left, we'll fill the left cells with 0, as described
                    // in 8.4.9 of JISX0510:2004 (p. 24).
                    bit = false;
                }

                // Skip masking if mask_pattern is -1.
                if( maskPattern != -1 ) {
                    if( MaskUtil.getDataMaskBit(maskPattern, xx, y) ) {
                        bit = !bit;
                    }
                }
                matrix.set(xx, y, bit);
            }
            y += direction;
        }
        direction = -direction;  // Reverse the direction.
        y += direction;
        x -= 2;  // Move to the left.
    }
    // All bits should be consumed.
    if( bitIndex != dataBits.getSize() ) {
        throw new Error("Not all bits consumed: " + bitIndex + '/' + dataBits.getSize());
    }
}

// Return the position of the most significant bit set (to one) in the "value". The most
// significant bit is position 32. If there is no bit set, return 0. Examples:
// - findMSBSet(0) => 0
// - findMSBSet(1) => 1
// - findMSBSet(255) => 8
MatrixUtil.findMSBSet = function(value) {
    var numDigits = 0;
    while( value != 0 ) {
        value >>>= 1;
        ++numDigits;
    }
    return numDigits;
}

// Calculate BCH (Bose-Chaudhuri-Hocquenghem) code for "value" using polynomial "poly". The BCH
// code is used for encoding type information and version information.
// Example: Calculation of version information of 7.
// f(x) is created from 7.
//   - 7 = 000111 in 6 bits
//   - f(x) = x^2 + x^1 + x^0
// g(x) is given by the standard (p. 67)
//   - g(x) = x^12 + x^11 + x^10 + x^9 + x^8 + x^5 + x^2 + 1
// Multiply f(x) by x^(18 - 6)
//   - f'(x) = f(x) * x^(18 - 6)
//   - f'(x) = x^14 + x^13 + x^12
// Calculate the remainder of f'(x) / g(x)
//         x^2
//         __________________________________________________
//   g(x) )x^14 + x^13 + x^12
//         x^14 + x^13 + x^12 + x^11 + x^10 + x^7 + x^4 + x^2
//         --------------------------------------------------
//                              x^11 + x^10 + x^7 + x^4 + x^2
//
// The remainder is x^11 + x^10 + x^7 + x^4 + x^2
// Encode it in binary: 110010010100
// The return value is 0xc94 (1100 1001 0100)
//
// Since all coefficients in the polynomials are 1 or 0, we can do the calculation by bit
// operations. We don't care if cofficients are positive or negative.
MatrixUtil.calculateBCHCode = function(value, poly) {
    // If poly is "1 1111 0010 0101" (version info poly), msbSetInPoly is 13. We'll subtract 1
    // from 13 to make it 12.
    var msbSetInPoly = MatrixUtil.findMSBSet(poly);
    value <<= msbSetInPoly - 1;
    // Do the division business using exclusive-or operations.
    while( MatrixUtil.findMSBSet(value) >= msbSetInPoly ) {
        value ^= poly << (MatrixUtil.findMSBSet(value) - msbSetInPoly);
    }
    // Now the "value" is the remainder (i.e. the BCH code)
    return value;
}

// Make bit vector of type information. On success, store the result in "bits" and return true.
// Encode error correction level and mask pattern. See 8.9 of
// JISX0510:2004 (p.45) for details.
MatrixUtil.makeTypeInfoBits = function(ecLevel, maskPattern, bits) {
    // JL review, invalid mask patter error
    if( !QRCode.isValidMaskPattern(maskPattern) ) {
        throw new Error("Invalid mask pattern");
    }
    var typeInfo = (ecLevel.getBits() << 3) | maskPattern;
    bits.appendBits(typeInfo, 5);

    var bchCode = MatrixUtil.calculateBCHCode(typeInfo, MatrixUtil.TYPE_INFO_POLY);
    bits.appendBits(bchCode, 10);

    var maskBits = new BitArray();
    maskBits.appendBits(MatrixUtil.TYPE_INFO_MASK_PATTERN, 15);
    bits.xor(maskBits);

    if( bits.getSize() != 15 ) {  // Just in case.
        throw new Error("should not happen but we got: " + bits.getSize());
    }
}

// Make bit vector of version information. On success, store the result in "bits" and return true.
// See 8.10 of JISX0510:2004 (p.45) for details.
MatrixUtil.makeVersionInfoBits = function(version, bits) {
    bits.appendBits(version, 6);
    var bchCode = MatrixUtil.calculateBCHCode(version, MatrixUtil.VERSION_INFO_POLY);
    bits.appendBits(bchCode, 12);

    if( bits.getSize() != 18 ) {  // Just in case.
        throw new Error("should not happen but we got: " + bits.getSize());
    }
}

// Check if "value" is empty.
MatrixUtil.isEmpty = function(value) {
    return value == -1;
}

// Check if "value" is valid.
MatrixUtil.isValidValue = function(value) {
    return (value == -1 ||  // Empty.
        value == 0 ||  // Light (white).
        value == 1);  // Dark (black).
}

MatrixUtil.embedTimingPatterns = function(matrix) {
    // -8 is for skipping position detection patterns (size 7), and two horizontal/vertical
    // separation patterns (size 1). Thus, 8 = 7 + 1.
    for( var i = 8; i < matrix.getWidth() - 8; ++i ) {
        var bit = (i + 1) % 2;
        // Horizontal line.
        if( !MatrixUtil.isValidValue(matrix.get(i, 6)) ) {
            throw new Error();
        }
        if( MatrixUtil.isEmpty(matrix.get(i, 6)) ) {
            matrix.set(i, 6, bit);
        }
        // Vertical line.
        if( !MatrixUtil.isValidValue(matrix.get(6, i)) ) {
            throw new Error();
        }
        if( MatrixUtil.isEmpty(matrix.get(6, i)) ) {
            matrix.set(6, i, bit);
        }
    }
}

// Embed the lonely dark dot at left bottom corner. JISX0510:2004 (p.46)
MatrixUtil.embedDarkDotAtLeftBottomCorner = function(matrix) {
    if( matrix.get(8, matrix.getHeight() - 8) == 0 ) {
        throw new Error();
    }
    matrix.set(8, matrix.getHeight() - 8, 1);
}

MatrixUtil.embedHorizontalSeparationPattern = function(xStart, yStart, matrix) {
    // We know the width and height.
    if( MatrixUtil.HORIZONTAL_SEPARATION_PATTERN[0].length != 8 || MatrixUtil.HORIZONTAL_SEPARATION_PATTERN.length != 1 ) {
        throw new Error("Bad horizontal separation pattern");
    }
    for( var x = 0; x < 8; ++x ) {
        if( !MatrixUtil.isEmpty(matrix.get(xStart + x, yStart)) ) {
            throw new Error();
        }
        matrix.set(xStart + x, yStart, MatrixUtil.HORIZONTAL_SEPARATION_PATTERN[0][x]);
    }
}

MatrixUtil.embedVerticalSeparationPattern = function(xStart, yStart, matrix) {
    // We know the width and height.
    if( MatrixUtil.VERTICAL_SEPARATION_PATTERN[0].length != 1 || MatrixUtil.VERTICAL_SEPARATION_PATTERN.length != 7 ) {
        throw new Error("Bad vertical separation pattern");
    }
    for( var y = 0; y < 7; ++y ) {
        if( !MatrixUtil.isEmpty(matrix.get(xStart, yStart + y)) ) {
            throw new Error();
        }
        matrix.set(xStart, yStart + y, MatrixUtil.VERTICAL_SEPARATION_PATTERN[y][0]);
    }
}

// Note that we cannot unify the function with embedPositionDetectionPattern() despite they are
// almost identical, since we cannot write a function that takes 2D arrays in different sizes in
// C/C++. We should live with the fact.
MatrixUtil.embedPositionAdjustmentPattern = function(xStart, yStart, matrix) {
    // We know the width and height.
    if( MatrixUtil.POSITION_ADJUSTMENT_PATTERN[0].length != 5 || MatrixUtil.POSITION_ADJUSTMENT_PATTERN.length != 5 ) {
        throw new Error("Bad position adjustment");
    }
    for( var y = 0; y < 5; ++y ) {
        for( var x = 0; x < 5; ++x ) {
            if( !MatrixUtil.isEmpty(matrix.get(xStart + x, yStart + y)) ) {
                throw new Error();
            }
            matrix.set(xStart + x, yStart + y, MatrixUtil.POSITION_ADJUSTMENT_PATTERN[y][x]);
        }
    }
}

MatrixUtil.embedPositionDetectionPattern = function(xStart, yStart, matrix) {
    // We know the width and height.
    if( MatrixUtil.POSITION_DETECTION_PATTERN[0].length != 7 || MatrixUtil.POSITION_DETECTION_PATTERN.length != 7 ) {
        throw new Error("Bad position detection pattern");
    }
    for( var y = 0; y < 7; ++y ) {
        for( var x = 0; x < 7; ++x ) {
            if( !MatrixUtil.isEmpty(matrix.get(xStart + x, yStart + y)) ) {
                throw new Error();
            }
            matrix.set(xStart + x, yStart + y, MatrixUtil.POSITION_DETECTION_PATTERN[y][x]);
        }
    }
}

// Embed position detection patterns and surrounding vertical/horizontal separators.
MatrixUtil.embedPositionDetectionPatternsAndSeparators = function(matrix) {
    // Embed three big squares at corners.
    var pdpWidth = MatrixUtil.POSITION_DETECTION_PATTERN[0].length;
    // Left top corner.
    MatrixUtil.embedPositionDetectionPattern(0, 0, matrix);
    // Right top corner.
    MatrixUtil.embedPositionDetectionPattern(matrix.getWidth() - pdpWidth, 0, matrix);
    // Left bottom corner.
    MatrixUtil.embedPositionDetectionPattern(0, matrix.getWidth() - pdpWidth, matrix);

    // Embed horizontal separation patterns around the squares.
    var hspWidth = MatrixUtil.HORIZONTAL_SEPARATION_PATTERN[0].length;
    // Left top corner.
    MatrixUtil.embedHorizontalSeparationPattern(0, hspWidth - 1, matrix);
    // Right top corner.
    MatrixUtil.embedHorizontalSeparationPattern(matrix.getWidth() - hspWidth, hspWidth - 1, matrix);
    // Left bottom corner.
    MatrixUtil.embedHorizontalSeparationPattern(0, matrix.getWidth() - hspWidth, matrix);

    // Embed vertical separation patterns around the squares.
    var vspSize = MatrixUtil.VERTICAL_SEPARATION_PATTERN.length;
    // Left top corner.
    MatrixUtil.embedVerticalSeparationPattern(vspSize, 0, matrix);
    // Right top corner.
    MatrixUtil.embedVerticalSeparationPattern(matrix.getHeight() - vspSize - 1, 0, matrix);
    // Left bottom corner.
    MatrixUtil.embedVerticalSeparationPattern(vspSize, matrix.getHeight() - vspSize, matrix);
}

// Embed position adjustment patterns if need be.
MatrixUtil.maybeEmbedPositionAdjustmentPatterns = function(version, matrix) {
    if( version < 2 ) {  // The patterns appear if version >= 2
        return;
    }
    var index = version - 1;
    var coordinates = MatrixUtil.POSITION_ADJUSTMENT_PATTERN_COORDINATE_TABLE[index];
    var numCoordinates = MatrixUtil.POSITION_ADJUSTMENT_PATTERN_COORDINATE_TABLE[index].length;
    for( var i = 0; i < numCoordinates; ++i ) {
        for( var j = 0; j < numCoordinates; ++j ) {
            var y = coordinates[i];
            var x = coordinates[j];
            if( x == -1 || y == -1 ) {
                continue;
            }
            // If the cell is unset, we embed the position adjustment pattern here.
            if( MatrixUtil.isEmpty(matrix.get(x, y)) ) {
                // -2 is necessary since the x/y coordinates point to the center of the pattern, not the
                // left top corner.
                MatrixUtil.embedPositionAdjustmentPattern(x - 2, y - 2, matrix);
            }
        }
    }
}

exports.MatrixUtil = MatrixUtil;
