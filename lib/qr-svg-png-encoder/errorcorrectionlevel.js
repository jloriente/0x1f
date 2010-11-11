/**
 * <p>See ISO 18004:2006, 6.5.1. This enum encapsulates the four error correction levels
 * defined by the QR code standard.</p>
 */
function ErrorCorrectionLevel(ordinal, bits, name) {

    this.ordinal = function() { return ordinal; }

    this.getBits = function() { return bits; }

    this.getName = function() { return name; }

    this.toString = function() { return name; }

}

/**
 * L = ~7% correction
 */
ErrorCorrectionLevel.L = new ErrorCorrectionLevel(0, 0x01, "L");
/**
 * M = ~15% correction
 */
ErrorCorrectionLevel.M = new ErrorCorrectionLevel(1, 0x00, "M");
/**
 * Q = ~25% correction
 */
ErrorCorrectionLevel.Q = new ErrorCorrectionLevel(2, 0x03, "Q");
/**
 * H = ~30% correction
 */
ErrorCorrectionLevel.H = new ErrorCorrectionLevel(3, 0x02, "H");

ErrorCorrectionLevel.FOR_BITS = [ ErrorCorrectionLevel.M, ErrorCorrectionLevel.L, ErrorCorrectionLevel.H, ErrorCorrectionLevel.Q ];

/**
 * @param bits int containing the two bits encoding a QR Code's error correction level
 * @return {@link ErrorCorrectionLevel} representing the encoded error correction level
 */
ErrorCorrectionLevel.forBits = function(bits) {
    if( bits < 0 || bits >= ErrorCorrectionLevel.FOR_BITS.length ) {
        throw new Error();
    }
    return ErrorCorrectionLevel.FOR_BITS[bits];
}
exports.ErrorCorrectionLevel = ErrorCorrectionLevel;
