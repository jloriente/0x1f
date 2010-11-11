/**
 * <p>Encapsulates a QR Code's format information, including the data mask used and
 * error correction level.</p>
 * @see DataMask
 * @see ErrorCorrectionLevel
 */
function FormatInformation(formatInfo) {

    // Bits 3,4
    var errorCorrectionLevel = ErrorCorrectionLevel.forBits((formatInfo >> 3) & 0x03);
    // Bottom 3 bits
    var dataMask = formatInfo & 0x07;

    this.getErrorCorrectionLevel = function() { return errorCorrectionLevel; }

    this.getDataMask = function() { return dataMask; }

    // TODO: Check where this is required
    //this.hashCode = function() { return (errorCorrectionLevel.ordinal() << 3) | dataMask; }

    this.equals = function(obj) {
        if( !(obj instanceof FormatInformation) ) {
            return false;
        }
        return errorCorrectionLevel == obj.errorCorrectionLevel && dataMask == obj.dataMask;
    }
}
FormatInformation.FORMAT_INFO_MASK_QR = 0x5412;
/**
 * See ISO 18004:2006, Annex C, Table C.1
 */
FormatInformation.FORMAT_INFO_DECODE_LOOKUP = [
    [0x5412, 0x00], [0x5125, 0x01], [0x5E7C, 0x02], [0x5B4B, 0x03],
    [0x45F9, 0x04], [0x40CE, 0x05], [0x4F97, 0x06], [0x4AA0, 0x07],
    [0x77C4, 0x08], [0x72F3, 0x09], [0x7DAA, 0x0A], [0x789D, 0x0B],
    [0x662F, 0x0C], [0x6318, 0x0D], [0x6C41, 0x0E], [0x6976, 0x0F],
    [0x1689, 0x10], [0x13BE, 0x11], [0x1CE7, 0x12], [0x19D0, 0x13],
    [0x0762, 0x14], [0x0255, 0x15], [0x0D0C, 0x16], [0x083B, 0x17],
    [0x355F, 0x18], [0x3068, 0x19], [0x3F31, 0x1A], [0x3A06, 0x1B],
    [0x24B4, 0x1C], [0x2183, 0x1D], [0x2EDA, 0x1E], [0x2BED, 0x1F]
];
/**
 * Offset i holds the number of 1 bits in the binary representation of i
 */
FormatInformation.BITS_SET_IN_HALF_BYTE = [ 0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4 ];

FormatInformation.numBitsDiffering = function(a, b) {
    a ^= b; // a now has a 1 bit exactly where its bit differs with b's
    // Count bits set quickly with a series of lookups:
    return FormatInformation.BITS_SET_IN_HALF_BYTE[a & 0x0F] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 4 & 0x0F)] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 8 & 0x0F)] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 12 & 0x0F)] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 16 & 0x0F)] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 20 & 0x0F)] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 24 & 0x0F)] +
        FormatInformation.BITS_SET_IN_HALF_BYTE[(a >>> 28 & 0x0F)];
}

/**
 * @param maskedFormatInfo1 format info indicator, with mask still applied
 * @param maskedFormatInfo2 second copy of same info; both are checked at the same time
 *  to establish best match
 * @return information about the format it specifies, or <code>null</code>
 *  if doesn't seem to match any known pattern
 */
FormatInformation.decodeFormatInformation = function(maskedFormatInfo1, maskedFormatInfo2) {
    var formatInfo = FormatInformation.doDecodeFormatInformation(maskedFormatInfo1, maskedFormatInfo2);
    if( formatInfo ) {
        return formatInfo;
    }
    // Should return null, but, some QR codes apparently
    // do not mask this info. Try again by actually masking the pattern
    // first
    return FormatInformation.doDecodeFormatInformation(maskedFormatInfo1 ^ FormatInformation.FORMAT_INFO_MASK_QR, maskedFormatInfo2 ^ FormatInformation.FORMAT_INFO_MASK_QR);
}

FormatInformation.doDecodeFormatInformation = function(maskedFormatInfo1, maskedFormatInfo2) {
    // Find the int in FORMAT_INFO_DECODE_LOOKUP with fewest bits differing
    var bestDifference = Number.MAX_VALUE;
    var bestFormatInfo = 0;
    for( var i = 0; i < FormatInformation.FORMAT_INFO_DECODE_LOOKUP.length; i++) {
        var decodeInfo = FormatInformation.FORMAT_INFO_DECODE_LOOKUP[i];
        var targetInfo = decodeInfo[0];
        if( targetInfo == maskedFormatInfo1 || targetInfo == maskedFormatInfo2 ) {
            // Found an exact match
            return new FormatInformation(decodeInfo[1]);
        }
        var bitsDifference = FormatInformation.numBitsDiffering(maskedFormatInfo1, targetInfo);
        if( bitsDifference < bestDifference ) {
            bestFormatInfo = decodeInfo[1];
            bestDifference = bitsDifference;
        }
        if( maskedFormatInfo1 != maskedFormatInfo2 ) {
            // also try the other option
            bitsDifference = FormatInformation.numBitsDiffering(maskedFormatInfo2, targetInfo);
            if( bitsDifference < bestDifference ) {
                bestFormatInfo = decodeInfo[1];
                bestDifference = bitsDifference;
            }
        }
    }
    // Hamming distance of the 32 masked codes is 7, by construction, so <= 3 bits
    // differing means we found a match
    if( bestDifference <= 3 ) {
        return new FormatInformation(bestFormatInfo);
    }
    return false;
}

