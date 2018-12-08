const util = exports

const privatesMap = new WeakMap()

/**
 * Returns an unique object for an instance.
 * @param {any} instance
 * @returns {object} Instance variables
 */
util.internal = function internal (instance) {
  if (!privatesMap.has(instance)) privatesMap.set(instance, {})
  return privatesMap.get(instance)
}

/**
 * Returns a random array element.
 * @param {any[]} arr - Array-like input
 * @param {number[]} [weights] - Weight of elements
 * @returns {any} A random element
 */
util.randomElement = function randomElement (arr, weights) {
  if (weights && weights.length === arr.length) {
    return arr[util.weightedPick(weights)]
  }
  return arr[util.randomInt(arr.length)]
}

/**
 * Gets last array element.
 */
util.last = function last (arr) {
  return arr[arr.length - 1]
}

/**
 * Port of python's `bisect.bisect` function.
 * @see [docs]{https://docs.python.org/3.6/library/bisect.html#bisect.bisect}
 */
util.bisect = function bisect (a, x, lo = 0, hi = a.length) {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (x < a[mid]) {
      hi = mid
    } else {
      lo = mid + 1
    }
  }
  return lo
}

/**
 * Picks a random index considering their weights.
 * @param {number[]} weights
 * @returns {number} Random index
 */
util.weightedPick = function weightedPick (weights) {
  const distributionSum = weights.reduce((result, weight) => {
    const sum = util.last(result) || 0
    return result.concat(sum + weight)
  }, [])
  return util.bisect(distributionSum, Math.random() * util.last(distributionSum))
}

/**
 * Picks a random number between min and max non-inclusive
 * @param {number} max
 * @param {number} [min=0]
 * @returns {number} Random number
 */
util.randomInt = function randomInt (max, min = 0) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}
