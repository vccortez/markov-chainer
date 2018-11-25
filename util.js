const util = exports

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
util.pick = function pick (weights) {
  const distributionSum = weights.reduce((weightSum, currentWeight) => {
    const sum = util.last(weightSum) || 0
    return [...weightSum, (sum + currentWeight)]
  }, [])
  const r = Math.random() * util.last(distributionSum)
  const randomIndex = util.bisect(distributionSum, r)
  return randomIndex
}

/**
 * Picks a random number between min and max non-inclusive
 * @param {number} max
 * @param {number} [min=0]
 * @returns {number} Random number
 */
util.randInt = function randInt (max, min = 0) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

const privatesMap = new WeakMap()

/**
 * Returns an object for an instance.
 * @param {any} instance
 * @returns {object} Instance variables
 */
util.internal = function internal (instance) {
  if (!privatesMap.has(instance)) privatesMap.set(instance, {})
  return privatesMap.get(instance)
}
