'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zipFillNull = zipFillNull;
function zipFillNull() {
  /** Zip arrays together. If an argument is null or too short, then fill the
  spaces for that array with nulls. */
  var args = [].slice.call(arguments);
  var lengthOrZero = function lengthOrZero(x) {
    return x === null ? 0 : x.length;
  };
  var longest = args.reduce(function (a, b) {
    return lengthOrZero(a) > lengthOrZero(b) ? a : b;
  }, []);
  return longest.map(function (_, i) {
    return args.map(function (array) {
      var x = array === null ? null : array[i];
      return typeof x === 'undefined' ? null : x;
    });
  });
}