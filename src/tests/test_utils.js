/* global describe it assert */

var utils = require('../utils');

describe('zipFillNull', () => {
  it('zips', () => {
    assert.deepEqual(utils.zipFillNull([1, 2], [3, 4], [5, 6]),
                     [[1, 3, 5], [2, 4, 6]]);
  });
  it('inserts null for null argument', () => {
    assert.deepEqual(utils.zipFillNull([1, 2], null, [5, 6]),
                     [[1, null, 5], [2, null, 6]]);
  });
  it('inserts null for short arrays', () => {
    assert.deepEqual(utils.zipFillNull([1, 2, 3], [4, 5]),
                     [[1, 4], [2, 5], [3, null]]);
  });
});
