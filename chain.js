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
   * @param {any[][]} corpus - A list of actual runs
   * @param {object} [opt] - Options object
   * @param {number} [opt.stateSize=1] - Size of state nodes
   * @param {Map} [opt.model] - A prebuilt model
   * @memberof Chain
   */
  constructor (corpus, { stateSize = 1, model } = {}) {
    this.stateSize = stateSize

    this.model = model || this.build(corpus)
  }

  /**
   * Initial state with BEGIN tokens.
   *
   * @readonly
   * @memberof Chain
   */
  get initialState () {
    return tuple(...new Array(this.stateSize).fill(BEGIN))
  }

  /**
   * Builds the Markov chain model.
   *
   * @param {any[][]} corpus - Corpus used to build the chain
   * @returns {Map} Markov model
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
   * @param {object} [options=this] - Options object
   * @param {Map} [options.model] - Model to update
   * @param {tuple} [options.initialState] - Starting tuple
   * @param {number} [options.stateSize] - Size of state nodes
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
   * @param {tuple} fromState - The state to move from
   * @returns {any} Possible next step on the chain
   * @memberof Chain
   */
  stepAhead (fromState) {
    return this._step(fromState)
  }

  /**
   * Randomly chooses the previous step from a given state.
   *
   * @param {tuple} fromState - The state to move from
   * @returns {any} Possible previous step on the chain
   * @memberof Chain
   */
  stepBack (fromState) {
    return this._step(fromState, false)
  }

  /**
   * Randomly chooses a new step from a given state.
   *
   * @private
   * @param {tuple} fromState - The state to move from
   * @param {boolean} [forward] - Movement direction
   * @returns {any} A possible next step of the chain
   * @memberof Chain
   */
  _step (fromState, forward = true) {
    const index = forward ? 0 : 1
    const failToken = forward ? END : BEGIN
    const stateArr = this.model.get(fromState)

    if (!stateArr) {
      return failToken
    }

    const choices = [...stateArr[index].keys()]
    const weights = [...stateArr[index].values()]

    const randomIndex = pick(weights)

    return choices[randomIndex]
  }

  /**
   * Generates successive states until the chain reaches an END.
   *
   * @param {any[]} [fromState] - Begin state of the chain walk
   * @yield {any} A new succeding state of the chain
   * @memberof Chain
   */
  * walkForward (fromState) {
    yield * this._walk(fromState)
  }

  /**
   * Generates successive states until the chain reaches a BEGIN.
   *
   * @param {any[]} fromState - Starting state of the chain walk
   * @yield {any} A new preceeding state of the chain
   * @memberof Chain
   */
  * walkBackward (fromState) {
    yield * this._walk(fromState, false)
  }

  /**
   * Generates successive states until it finds a stop token.
   *
   * @private
   * @param {any[]} fromState - Initial state
   * @param {boolean} [forward] - Movement direction
   * @yield {any} A new state of the chain
   * @memberof Chain
   */
  * _walk (fromState, forward = true) {
    const stopToken = forward ? END : BEGIN
    let state = fromState || this.initialState

    while (true) {
      const step = this._step(state, forward)

      if (step === stopToken) {
        break
      }

      yield step

      if (forward) {
        state = tuple(...state.slice(1), step)
      } else {
        state = tuple(step, ...state.slice(0, state.length - 1))
      }
    }
  }

  /**
   * Walks the Markov chain and returns all steps.
   *
   * @param {object} [opt] - Options object
   * @param {any[]} [opt.fromState=[]] - Starting state
   * @param {boolean} [opt.backSearch=true] - Should walk back
   * @returns {any[][]} Array with back root and forward steps
   * @memberof Chain
   */
  run ({ fromState = [], backSearch = true } = {}) {
    const root = fromState.slice(0, this.stateSize)
    const startState = [...root]

    while (startState.length < this.stateSize) {
      startState.unshift(BEGIN)
    }

    const stepsForward = [...this.walkForward(tuple(...startState))]

    if (!backSearch || root.length < this.stateSize) {
      return [
        [],
        stepsForward.length > 0 ? root : [],
        stepsForward
      ]
    }

    const stepsBack = [...this.walkBackward(tuple(...root))].reverse()

    return [
      stepsBack,
      stepsForward.length > 0 || stepsBack.length > 0 ? root : [],
      stepsForward
    ]
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
   * @param {string} jsonChain - A chain serialised with {Chain.toJSON}
   * @returns {Chain} A new chain instance
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

module.exports = { Chain }
