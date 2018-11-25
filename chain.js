/**
 * markov-chainer module.
 * @module markov-chainer
 */

const { tuple } = require('immutable-tuple')

const { pick, randInt, internal } = require('./util')

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
 * @class
 */
class Chain {
  /**
   * Creates an instance of Chain.
   *
   * @param {any[][]} corpus - A list of actual runs
   * @param {object} [opt] - opt object
   * @param {number} [opt.stateSize=1] - Size of state nodes
   * @param {boolean} [opt.useTokenMap=true] - Should it map `token => state` ?
   * @param {Map} [opt.model] - A prebuilt model
   */
  constructor (corpus, { stateSize = 1, useTokenMap = true, model } = {}) {
    if (model) {
      internal(this).model = model
      internal(this).stateSize = model.keys().next().value.length
    } else {
      internal(this).stateSize = stateSize
      internal(this).model = Chain.buildModel(corpus, this)
    }

    if (useTokenMap && this.stateSize > 1) {
      internal(this).tokenMap = Chain.buildTokenMap(this.model)
    }
  }

  /**
   * Size of state nodes.
   * @readonly
   * @type {number}
   */
  get stateSize () {
    return internal(this).stateSize
  }

  /**
   * Map of chain states.
   * @readonly
   * @type {Map}
   */
  get model () {
    return internal(this).model
  }

  /**
   * Initial state with BEGIN tokens.
   * @readonly
   * @type {tuple}
   */
  get initialState () {
    return tuple(...new Array(this.stateSize).fill(BEGIN))
  }

  /**
   * Map of token to state.
   * @readonly
   * @type {Map}
   */
  get tokenMap () {
    return internal(this).tokenMap
  }

  /**
   * Builds a Markov chain model.
   *
   * @static
   * @param {any[][]} corpus - Corpus to build the model from
   * @param {object} opt - Options object
   * @param {tuple} opt.initialState - Begin state of chain
   * @param {number} [opt.stateSize=opt.initialState.length] - Chain state size
   * @returns {Map} Markov chain model
   */
  static buildModel (corpus, { initialState, stateSize = initialState.length } = {}) {
    const model = new Map()

    for (const run of corpus) {
      Chain.seed(run, { model, initialState, stateSize })
    }

    return model
  }

  /**
   * Builds a Map of token to states.
   *
   * @static
   * @param {Map} model - Markov chain model
   * @returns {Map} A token map
   */
  static buildTokenMap (model) {
    const tokenMap = new Map()

    for (const state of model.keys()) {
      for (const token of state) {
        if (!tokenMap.has(token)) {
          tokenMap.set(token, new Set())
        }

        const entry = tokenMap.get(token)
        entry.add(state)
      }
    }

    return tokenMap
  }

  /**
   * Updates a model from a single run.
   *
   * @static
   * @param {any[]} run - Array of tokens
   * @param {object} opt - Options object
   * @param {Map} opt.model - Model to update
   * @param {tuple} opt.initialState - Starting tuple
   * @param {number} opt.stateSize - Size of state nodes
   * @param {tuple} [opt.tokenMap] - Optional map of `token => state`
   */
  static seed (run, { model, tokenMap, initialState, stateSize } = {}) {
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

      if (tokenMap) {
        for (const token of state) {
          if (!tokenMap.has(token)) {
            tokenMap.set(token, new Set())
          }

          const entry = tokenMap.get(token)
          entry.add(state)
        }
      }
    }
  }

  /**
   * Randomly chooses the next step from a given state.
   *
   * @param {tuple} fromState - The state to move from
   * @returns {any} Possible next step on the chain
   */
  stepAhead (fromState) {
    return this._step(fromState)
  }

  /**
   * Randomly chooses the previous step from a given state.
   *
   * @param {tuple} fromState - The state to move from
   * @returns {any} Possible previous step on the chain
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
   */
  * walkForward (fromState) {
    yield * this._walk(fromState)
  }

  /**
   * Generates successive states until the chain reaches a BEGIN.
   *
   * @param {any[]} fromState - Starting state of the chain walk
   * @yield {any} A new preceeding state of the chain
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
   * Generates a state tuple from an array of tokens.
   *
   * @private
   * @param {any[]} [tokens=[]]
   * @returns {tuple} State tuple
   */
  _genStateFrom (tokens = []) {
    const { stateSize, initialState, model } = this
    const run = [...tokens]
    const tuples = []
    const items = [...initialState, ...run, END]

    for (let i = 0; i < run.length + 1; ++i) {
      tuples.push(tuple(...items.slice(i, i + stateSize)))
    }

    const starts = tuples.slice(1)
      .filter((t) => model.has(t))

    const result = starts[randInt(starts.length)]

    if (!result) {
      return initialState
    }

    return result
  }

  /**
   * Walks the Markov chain and returns all steps.
   *
   * @param {object} [opt] - opt object
   * @param {any[]} [opt.tokens=[]] - Starting state tokens
   * @param {boolean} [opt.backSearch=true] - Should walk back
   * @returns {any[][]} Array with back root and forward steps
   */
  run ({ tokens = [], backSearch = true, useTokenMap = true } = {}) {
    let startState = this._genStateFrom(tokens)

    if (startState === this.initialState && tokens.length > 0 && this.tokenMap && useTokenMap) {
      const validTokens = tokens.filter((t) => this.tokenMap.has(t))
      const token = validTokens[randInt(validTokens.length)]
      const possibleStates = [...this.tokenMap.get(token)]
      startState = possibleStates[randInt(possibleStates.length)]
    }

    let backSteps = []
    const forwardSteps = [...this.walkForward(startState)]
    let hasSteps = forwardSteps.length > 0

    if (backSearch) {
      backSteps = [...this.walkBackward(startState)].reverse()
      hasSteps = hasSteps || backSteps.length > 0
    }

    return [
      backSteps,
      hasSteps ? [...startState].filter((t) => t !== BEGIN && t !== END) : [],
      forwardSteps
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
   * @see https://mdn.io/stringify#toJSON()_behavior
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
