/**
 * Gets last array element.
 * @private
 */
exports.last = function last (arr) {
  return arr[arr.length - 1]
}

/**
 * Port of python's `bisect.bisect` function.
 * @private
 * @see [docs]{https://docs.python.org/3.6/library/bisect.html#bisect.bisect}
 */
exports.bisect = function bisect (a, x, lo = 0, hi = a.length) {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (x < a[mid]) {
      hi = mid
    }
    else {
      lo = mid + 1
    }
  }
  return lo
}
