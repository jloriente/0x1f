/**
 * <p>See ISO 18004:2006, 6.4.1, Tables 2 and 3. This enum encapsulates the various modes in which
 * data can be encoded to bits in the QR code standard.</p>
 */
function Mode(characterCountBitsForVersions, bits, name) {

    /**
     * @param version version in question
     * @return number of bits used, in this QR Code symbol {@link Version}, to encode the
     *         count of characters that will follow encoded in this {@link Mode}
     */
    this.getCharacterCountBits = function(version) {
        if( characterCountBitsForVersions === undefined ) {
            throw new Error("Character count doesn't apply to this mode");
        }
        var number = version.getVersionNumber();
        var offset;
        if( number <= 9 ) {
            offset = 0;
        } else if( number <= 26 ) {
            offset = 1;
        } else {
            offset = 2;
        }
        return characterCountBitsForVersions[offset];
    }

    this.getBits = function() { return bits; }

    this.getName = function() { return name; }

    this.toString = function() { return name; }

}
/**
 * @param bits four bits encoding a QR Code data mode
 * @return {@link Mode} encoded by these bits
 * @throws IllegalArgumentException if bits do not correspond to a known mode
 */
Mode.forBits = function(bits) {
    switch(bits) {
    case 0x0:
        return Mode.TERMINATOR;
    case 0x1:
        return Mode.NUMERIC;
    case 0x2:
        return Mode.ALPHANUMERIC;
    case 0x3:
        return Mode.STRUCTURED_APPEND;
    case 0x4:
        return Mode.BYTE;
    case 0x5:
        return Mode.FNC1_FIRST_POSITION;
    case 0x7:
        return Mode.ECI;
    case 0x8:
        return Mode.KANJI;
    case 0x9:
        return Mode.FNC1_SECOND_POSITION;
    default:
        throw new Error();
    }
}

Mode.TERMINATOR           = new Mode( [ 0, 0, 0 ],    0x00, "TERMINATOR"); // Not really a mode...
Mode.NUMERIC              = new Mode( [ 10, 12, 14 ], 0x01, "NUMERIC");
Mode.ALPHANUMERIC         = new Mode( [ 9, 11, 13 ],  0x02, "ALPHANUMERIC");
Mode.STRUCTURED_APPEND    = new Mode( [ 0, 0, 0 ],    0x03, "STRUCTURED_APPEND"); // Not supported
Mode.BYTE                 = new Mode( [ 8, 16, 16 ],  0x04, "BYTE");
Mode.ECI                  = new Mode( undefined,      0x07, "ECI"); // character counts don't apply
Mode.KANJI                = new Mode( [ 8, 10, 12 ],  0x08, "KANJI");
Mode.FNC1_FIRST_POSITION  = new Mode( undefined,      0x05, "FNC1_FIRST_POSITION");
Mode.FNC1_SECOND_POSITION = new Mode( undefined,      0x09, "FNC1_SECOND_POSITION");

exports.Mode = Mode;
