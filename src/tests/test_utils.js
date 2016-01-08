/* global describe it assert */

var utils = require('../utils');

describe('zipFillNull', () => {
  it('zips', () => {
    assert.deepEqual(utils.zipFillNull([1, 2], [3, 4], [5, 6]),
                     [[1, 3, 5], [2, 4, 6]]);
  });
  it('inserts null', () => {
    assert.deepEqual(utils.zipFillNull([1, 2], null, [5, 6]),
                     [[1, null, 5], [2, null, 6]]);
  });
});
