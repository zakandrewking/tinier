'use strict'

/**
 * Zip arrays together. If an argument is null or too short, then fill the
 * spaces for that array with nulls.
 *
 * @param {...Array} args - A number of arrays to zip.
 *
 * @return {Array} Array of arrays with values from arguments.
 */
export function zipFillNull(...args) {
  const lengthOrZero = x => x === null ? 0 : x.length
  const longest = args.reduce((a, b) => {
    return lengthOrZero(a) > lengthOrZero(b) ? a : b
  }, [])
  return longest.map((_, i) => {
    return args.map(array => {
      const x = array === null ? null : array[i]
      return typeof x === 'undefined' ? null : x
    })
  })
}
