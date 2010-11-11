function QRCode() {

    var mode;
    var ecLevel;
    var version = -1;
    var matrixWidth = -1;
    var maskPattern = -1;
    var numTotalBytes = -1;
    var numDataBytes = -1;
    var numECBytes = -1;
    var numRSBlocks = -1;
    var matrix;

    // Mode of the QR Code.
    this.getMode = function() { return mode; }

    // Error correction level of the QR Code.
    this.getECLevel = function() { return ecLevel; }

    // Version of the QR Code.  The bigger size, the bigger version.
    this.getVersion = function() { return version; }

    // ByteMatrix width of the QR Code.
    this.getMatrixWidth = function() { return matrixWidth; }

    // Mask pattern of the QR Code.
    this.getMaskPattern = function() { return maskPattern; }

    // Number of total bytes in the QR Code.
    this.getNumTotalBytes = function() { return numTotalBytes; }

    // Number of data bytes in the QR Code.
    this.getNumDataBytes = function() { return numDataBytes; }

    // Number of error correction bytes in the QR Code.
    this.getNumECBytes = function() { return numECBytes; }

    // Number of Reedsolomon blocks in the QR Code.
    this.getNumRSBlocks = function() { return numRSBlocks; }

    // ByteMatrix data of the QR Code.
    this.getMatrix = function() { return matrix; }
  

    // Return the value of the module (cell) pointed by "x" and "y" in the matrix of the QR Code. They
    // call cells in the matrix "modules". 1 represents a black cell, and 0 represents a white cell.
    this.at = function(x, y) {
        // The value must be zero or one.
        var value = matrix.get(x, y);
        if( !(value == 0 || value == 1) ) {
            throw new Error("Bad value");
        }
        return value;
    }

    // Checks all the member variables are set properly. Returns true on success. Otherwise, returns
    // false.
    this.isValid = function() {
        if(     // First check if all version are not uninitialized.
                mode !== undefined &&
                ecLevel !== undefined &&
                version != -1 &&
                matrixWidth != -1 &&
                maskPattern != -1 &&
                numTotalBytes != -1 &&
                numDataBytes != -1 &&
                numECBytes != -1 &&
                numRSBlocks != -1 &&
                // Then check them in other ways..
                QRCode.isValidMaskPattern(maskPattern) &&
                numTotalBytes == (numDataBytes + numECBytes) &&
                // ByteMatrix stuff.
                matrix !== undefined &&
                matrixWidth == matrix.getWidth() &&
                // See 7.3.1 of JISX0510:2004 (p.5).
                // Must be square.
                matrix.getWidth() == matrix.getHeight() ) {
            return true;
        }
        return false;
    }

    // Return debug String.
    this.toString = function() {
        var result = [];
        result.push("<<\n");
        result.push(" mode: ");
        result.push(mode);
        result.push("\n ecLevel: ");
        result.push(ecLevel);
        result.push("\n version: ");
        result.push(version);
        result.push("\n matrixWidth: ");
        result.push(matrixWidth);
        result.push("\n maskPattern: ");
        result.push(maskPattern);
        result.push("\n numTotalBytes: ");
        result.push(numTotalBytes);
        result.push("\n numDataBytes: ");
        result.push(numDataBytes);
        result.push("\n numECBytes: ");
        result.push(numECBytes);
        result.push("\n numRSBlocks: ");
        result.push(numRSBlocks);
        if (matrix == null) {
            result.push("\n matrix: null\n");
        } else {
            result.push("\n matrix:\n");
            result.push(matrix.toString());
        }
        result.push(">>\n");
        return result.join('');
    }

    this.setMode = function(value) { mode = value; }

    this.setECLevel = function(value) { ecLevel = value; }

    this.setVersion = function(value) { version = value; }

    this.setMatrixWidth = function(value) { matrixWidth = value; }

    this.setMaskPattern = function(value) { maskPattern = value; }

    this.setNumTotalBytes = function(value) { numTotalBytes = value; }

    this.setNumDataBytes = function(value) { numDataBytes = value; }

    this.setNumECBytes = function(value) { numECBytes = value; }

    this.setNumRSBlocks = function(value) { numRSBlocks = value; }

    this.setMatrix = function(value) { matrix = value; }

}
QRCode.NUM_MASK_PATTERNS = 8;
// Check if "mask_pattern" is valid.
QRCode.isValidMaskPattern = function(maskPattern) {
    return maskPattern >= 0 && maskPattern < QRCode.NUM_MASK_PATTERNS;
}
  
//exports.qrcode = new QRCode();
exports.QRCode = QRCode;
