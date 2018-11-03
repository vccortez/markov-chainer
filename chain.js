/**
 * markov-chainer module.
 * @module markov-chainer
 */
const { tuple } = require('immutable-tuple')

const { pick } = require('./util')

/**
 * Token to represent the start of runs.
 * @constant
 * @type Symbol
 */
const BEGIN = Symbol('@@BEGIN')

/**
 * Token to represent the end of runs.
 * @constant
 * @type Symbol
 */
const END = Symbol('@@END')

/**
 * A Markov chain.
 * @class Chain
 */
class Chain {
  /**
   * Creates an instance of Chain.
   *
   * @param {any[][]} corpus - a list of actual runs
   * @param {object} [options] - options object
   * @param {number} [options.stateSize=1] - size of state nodes
   * @param {Map} [options.model] - a prebuilt model
   * @memberof Chain
   */
  constructor (corpus, { stateSize = 1, model } = {}) {
    this.stateSize = stateSize

    this.model = model || this.build(corpus)
  }

  /**
   * Initial state of BEGIN tokens.
   *
   * @readonly
   * @memberof Chain
   */
  get initialState () {
    return tuple(...new Array(this.stateSize).fill(BEGIN))
  }

  /**
   * Builds the markov chain model.
   *
   * @param {any[][]} corpus - corpus used to build the chain
   * @returns {Map} markov model
   * @memberof Chain
   */
  build (corpus) {
    const model = new Map()
    const { initialState, stateSize } = this

    for (const run of corpus) {
      this.seed(run, { model, initialState, stateSize })
    }

    return model
  }

  /**
   * Updates model from a single run.
   *
   * @param {any[]} run
   * @param {object} [options=this] - options object
   * @param {Map} [options.model] - model to update
   * @param {tuple} [options.initialState] - starting tuple
   * @param {number} [options.stateSize] - size of state nodes
   * @memberof Chain
   */
  seed (run, { model, initialState, stateSize } = this) {
    const items = [...initialState, ...run, END]

    for (let i = 0; i < run.length + 1; ++i) {
      const state = tuple(...items.slice(i, i + stateSize))
      const next = items[i + stateSize]
      const prev = items[i - 1] || BEGIN

      if (!model.has(state)) {
        model.set(state, [new Map(), new Map()])
      }

      const stateMaps = model.get(state)
      const nextCount = stateMaps[0].get(next) || 0
      const prevCount = stateMaps[1].get(prev) || 0

      stateMaps[0].set(next, nextCount + 1)
      stateMaps[1].set(prev, prevCount + 1)
    }
  }

  /**
   * Randomly chooses the next step from a given state.
   *
   * @param {tuple} fromState - the state to move from
   * @returns {any} possible next step on the chain
   * @memberof Chain
   */
  stepAhead (fromState) {
    const stateArr = this.model.get(fromState)

    if (!stateArr) {
      return END
    }

    const choices = [...stateArr[0].keys()]
    const weights = [...stateArr[0].values()]

    const randomIndex = pick(weights)

    return choices[randomIndex]
  }

  /**
   * Randomly chooses the previous step from a given state.
   *
   * @param {tuple} fromState - the state to move from
   * @returns {any} possible previous step on the chain
   * @memberof Chain
   */
  stepBack (fromState) {
    const stateArr = this.model.get(fromState)

    if (!stateArr) {
      return BEGIN
    }

    const choices = [...stateArr[1].keys()]
    const weights = [...stateArr[1].values()]

    const randomIndex = pick(weights)

    return choices[randomIndex]
  }

  /**
   * Generates successive states until the chain reaches an END.
   *
   * @param {any[]} [fromState] - begin state of the chain walk
   * @yield {any} a new succeding state of the chain
   * @memberof Chain
   */
  *walkForward (fromState) {
    let state = fromState || this.initialState

    while (true) {
      const step = this.stepAhead(state)

      if (step === END) {
        break
      }

      yield step

      state = tuple(...state.slice(1), step)
    }
  }

  /**
   * Generates successive states until the chain reaches a BEGIN.
   *
   * @param {any[]} fromState - starting state of the chain walk
   * @yield {any} a new preceeding state of the chain
   * @memberof Chain
   */
  *walkBackward (fromState) {
    let state = fromState || this.initialState

    while (true) {
      const step = this.stepBack(state)

      if (step === BEGIN) {
        break
      }

      yield step

      state = tuple(step, ...state.slice(0, state.length - 1))
    }
  }

  /**
   * Serialises the chain into a JSONable array.
   *
   * The returned array will look like:
   *
   *   [ [ [state], [ [next, count], ...], [ [prev, count], ...] ], ...]
   *
   * @returns {any[]} JSON array
   * @memberof Chain
   * @see [MDN]{https://mdn.io/stringify#toJSON()_behavior}
   */
  toJSON () {
    const serialised = []

    for (const [state, [next, prev]] of this.model) {
      const stateArr = [...state].map((value) => {
        if (value === BEGIN) return BEGIN.toString()
        return value
      })

      const nextArr = [...next].map(([value, count]) => {
        if (value === END) return [END.toString(), count]
        return [value, count]
      })

      const prevArr = [...prev].map(([value, count]) => {
        if (value === BEGIN) return [BEGIN.toString(), count]
        return [value, count]
      })

      serialised.push([stateArr, [nextArr, prevArr]])
    }

    return serialised
  }

  /**
   * Creates a Chain from a JSON string.
   *
   * @static
   * @param {string} jsonChain - a Chain serialised with {Chain.toJSON}
   * @returns {Chain} a new Chain instance
   * @memberof Chain
   */
  static fromJSON (jsonChain) {
    let stateSize

    const states = JSON.parse(jsonChain).map(
      ([state, [nextList, prevList]], index) => {
        const curStateSize = state.length

        if (index === 0) {
          stateSize = curStateSize
        } else if (curStateSize !== stateSize) {
          throw new Error(
            'Invalid state size. ' +
            `Expected ${stateSize} but got ${curStateSize} (${state}).`
          )
        }

        const stateTuple = state.map((value) => {
          if (value === BEGIN.toString()) return BEGIN
          return value
        })

        const nextMap = new Map()

        for (const [jsonKey, count] of nextList) {
          const next = jsonKey === END.toString() ? END : jsonKey
          nextMap.set(next, count)
        }

        const prevMap = new Map()

        for (const [jsonKey, count] of prevList) {
          const prev = jsonKey === BEGIN.toString() ? BEGIN : jsonKey
          prevMap.set(prev, count)
        }

        return [tuple(...stateTuple), [nextMap, prevMap]]
      })

    return new Chain(null, { stateSize, model: new Map(states) })
  }

}

module.exports = { Chain, BEGIN, END }
