const util = exports

/**
 * Gets last array element.
 * @private
 */
util.last = function last (arr) {
  return arr[arr.length - 1]
}

/**
 * Port of python's `bisect.bisect` function.
 * @private
 * @see [docs]{https://docs.python.org/3.6/library/bisect.html#bisect.bisect}
 */
util.bisect = function bisect (a, x, lo = 0, hi = a.length) {
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

/**
 * Picks a random index considering their weights.
 *
 * @param {number[]} weights
 * @returns {number} random index
 */
util.pick = function pick (weights) {
  const distributionSum = weights.reduce((weightSum, currentWeight) => {
    const sum = util.last(weightSum) || 0
    return [...weightSum, (sum + currentWeight)]
  }, [])
  const r = Math.random() * util.last(distributionSum)
  const randomIndex = util.bisect(distributionSum, r)
  return randomIndex
}
