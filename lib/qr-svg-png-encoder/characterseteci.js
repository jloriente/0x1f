/**
 * Encapsulates a Character Set ECI, according to "Extended Channel Interpretations" 5.3.1.1
 * of ISO 18004.
 */
function CharacterSetECI(value, encodingName) {

    this.getValue = function() { return value; }

    this.getEncodingName = function() { return encodingName; }

}

/**
 * @param value ECI value
 * @return {@link ECI} representing ECI of given value, or null if it is legal but unsupported
 * @throws IllegalArgumentException if ECI value is invalid
 */
CharacterSetECI.getECIByValue = function(value) {
    if( value < 0 || value > 999999 ) {
        throw new Error("Bad ECI value: " + value);
    }
    if( value < 900 ) { // Character set ECIs use 000000 - 000899
        return CharacterSetECI.getCharacterSetECIByValue(value);
    }
    return undefined;
}

CharacterSetECI.addCharacterSet = function(value, encodingNames) {
    var eci = new CharacterSetECI(value, encodingNames[0]);
    CharacterSetECI.VALUE_TO_ECI[value] = eci; // can't use valueOf
    for( var i = 0; i < encodingNames.length; i++ ) {
        CharacterSetECI.NAME_TO_ECI[encodingNames[i]] = eci;
    }
}

/**
 * @param value character set ECI value
 * @return {@link CharacterSetECI} representing ECI of given value, or null if it is legal but
 *   unsupported
 * @throws IllegalArgumentException if ECI value is invalid
 */
CharacterSetECI.getCharacterSetECIByValue = function(value) {
    if( value < 0 || value >= 900 ) {
      throw new Error("Bad ECI value: " + value);
    }
    return CharacterSetECI.VALUE_TO_ECI[value];
}

/**
 * @param name character set ECI encoding name
 * @return {@link CharacterSetECI} representing ECI for character encoding, or null if it is legal
 *   but unsupported
 */
CharacterSetECI.getCharacterSetECIByName = function(name) {
    return CharacterSetECI.NAME_TO_ECI[name];
}

CharacterSetECI.VALUE_TO_ECI = {};
CharacterSetECI.NAME_TO_ECI = {};

// TODO figure out if these values are even right!
CharacterSetECI.addCharacterSet(0, [ "Cp437" ]);
CharacterSetECI.addCharacterSet(1, [ "ISO8859_1", "ISO-8859-1" ] );
CharacterSetECI.addCharacterSet(2, [ "Cp437" ]);
CharacterSetECI.addCharacterSet(3, [ "ISO8859_1", "ISO-8859-1" ] );
CharacterSetECI.addCharacterSet(4, [ "ISO8859_2" ]);
CharacterSetECI.addCharacterSet(5, [ "ISO8859_3" ]);
CharacterSetECI.addCharacterSet(6, [ "ISO8859_4" ]);
CharacterSetECI.addCharacterSet(7, [ "ISO8859_5" ]);
CharacterSetECI.addCharacterSet(8, [ "ISO8859_6" ]);
CharacterSetECI.addCharacterSet(9, [ "ISO8859_7" ]);
CharacterSetECI.addCharacterSet(10, [ "ISO8859_8" ]);
CharacterSetECI.addCharacterSet(11, [ "ISO8859_9" ]);
CharacterSetECI.addCharacterSet(12, [ "ISO8859_10" ]);
CharacterSetECI.addCharacterSet(13, [ "ISO8859_11" ]);
CharacterSetECI.addCharacterSet(15, [ "ISO8859_13" ]);
CharacterSetECI.addCharacterSet(16, [ "ISO8859_14" ]);
CharacterSetECI.addCharacterSet(17, [ "ISO8859_15" ]);
CharacterSetECI.addCharacterSet(18, [ "ISO8859_16" ]);
CharacterSetECI.addCharacterSet(20, [ "SJIS", "Shift_JIS" ] );

exports.CharacterSetECI = CharacterSetECI;
