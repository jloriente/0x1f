function BlockPair(dataBytes, errorCorrectionBytes) {

  this.getDataBytes = function() { return dataBytes; }

  this.getErrorCorrectionBytes = function() { return errorCorrectionBytes; }

}

exports.BlockPair = BlockPair;
