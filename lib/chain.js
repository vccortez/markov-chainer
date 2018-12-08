/**
 * Immutable tuple.
 * @typedef {external:tuple} Tuple
 */
const { tuple } = require('immutable-tuple')

const { internal, randomElement } = require('./util')

/**
 * Token to tag a complex JSON value.
 * @constant
 * @type {Symbol}
 */
const OBJECT = Symbol('@@OBJECT')

/**
 * Token to represent the start of runs.
 * @constant
 * @type {Symbol}
 */
const BEGIN = Symbol('@@BEGIN')

/**
 * Token to represent the end of runs.
 * @constant
 * @type {Symbol}
 */
const END = Symbol('@@END')

/**
 * A time-homogeneous Markov chain with optional memory.
 */
class Chain {
  /**
   * @param {object} [options={}] Options object
   * @param {Array<Array<any>>} [options.corpus=[]] Sample runs of the process
   * @param {number} [options.order=0] Size of the chain's memory
   * @param {boolean} [options.useTokenMap=false] Whether to map token to states
   * @param {Map<Tuple<any>,any>} [options.model] Prebuilt state space
   */
  constructor ({ corpus = [], order = 0, useTokenMap = false, model } = {}) {
    if (model) {
      internal(this).model = model
      internal(this).order = (model.keys().next()).value.length - 1
    } else {
      internal(this).order = order
      internal(this).model = buildModel(corpus, this)
    }

    if (useTokenMap && this.order > 0) {
      internal(this).tokenMap = buildTokenMap(this.model)
    }
  }

  /**
   * Order of chain.
   * @readonly
   * @type {number}
   */
  get order () {
    return internal(this).order
  }

  /**
   * Map of chain states.
   * @readonly
   * @type {Map<Tuple<any>,any>}
   */
  get model () {
    return internal(this).model
  }

  /**
   * Initial state with BEGIN tokens.
   * @readonly
   * @type {Tuple<any>}
   */
  get initialState () {
    if (!internal(this).initialState) {
      internal(this).initialState = getInitialState(this.order)
    }
    return internal(this).initialState
  }

  /**
   * Map of token to state.
   * @readonly
   * @type {Map<any,Tuple<any>>}
   */
  get tokenMap () {
    return internal(this).tokenMap
  }

  /**
   * Updates a model from a single run.
   *
   * @static
   * @param {Array<any>} run Array of tokens
   * @param {object} [chain={}] Chain object
   * @param {Map<Tuple<any>,any>} chain.model Model to update
   * @param {Tuple<any>} chain.initialState Starting tuple
   * @param {number} chain.order Order of chain
   * @param {Map<any,Tuple<any>>} [chain.tokenMap] Map of token to states
   */
  static seed (run, { model, tokenMap, initialState, order } = {}) {
    const items = [...initialState, ...run, END]

    for (let i = 0; i < run.length + 1; ++i) {
      const state = tuple(...items.slice(i, i + 1 + order))
      const next = items[i + 1 + order]
      const prev = items[i - 1] || BEGIN

      if (!model.has(state)) {
        model.set(state, [weightMap(), weightMap()])
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
   * Randomly chooses a new step from a given state.
   *
   * @private
   * @param {Tuple<any>} fromState The state to move from
   * @param {boolean} [forward] Movement direction
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

    return randomElement(choices, weights)
  }

  /**
   * Generates successive states until it finds a stop token.
   *
   * @private
   * @param {Tuple<any>} [fromState] Initial state
   * @param {boolean} [forward=true] Movement direction
   * @yield {any} Next step on the chain
   */
  * _walk (fromState, forward = true) {
    const stopToken = forward ? END : BEGIN
    let state = fromState || this.initialState

    while (true) {
      let step = this._step(state, forward)

      if (step === stopToken) {
        break
      }

      if (isObjectToken(step)) {
        try {
          step = JSON.parse(step[1])
        } catch (_) {}
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
   * Generates successive states until the chain reaches an END.
   *
   * @param {Tuple<any>} [fromState] Begin state of the chain walk
   * @yield {any} Next succeding step of the chain
   */
  * walkForward (fromState) {
    yield * this._walk(fromState)
  }

  /**
   * Generates successive states until the chain reaches a BEGIN.
   *
   * @param {Tuple<any>} [fromState] Starting state of the chain walk
   * @yield {any} Next preceeding step of the chain
   */
  * walkBackward (fromState) {
    yield * this._walk(fromState, false)
  }

  /**
   * Generates a state tuple from an array of tokens.
   *
   * @private
   * @param {Array<any>} [tokens=[]] Input tokens
   * @param {boolean} [useTokenMap=false] Whether to use token map
   * @returns {Tuple<any>} State tuple
   */
  _genStateFrom (tokens = [], useTokenMap = false) {
    const { order, initialState, model } = this
    const run = [...tokens]
    const tuples = []
    const items = [...initialState, ...run, END]

    for (let i = 0; i < run.length + 1; ++i) {
      tuples.push(tuple(...items.slice(i, i + 1 + order)))
    }

    const starts = tuples.slice(1)
      .filter((t) => model.has(t))

    let result = randomElement(starts)

    if (!result && useTokenMap && tokens.length > 0 && this.tokenMap) {
      const choices = tokens.filter((t) => this.tokenMap.has(t))
      if (choices.length > 0) {
        const token = randomElement(choices)
        const possibleStates = [...this.tokenMap.get(token)]
        result = randomElement(possibleStates)
      }
    }

    return result || initialState
  }

  /**
   * Walks the Markov chain and returns all steps.
   *
   * The returned step array will look like:
   * ```javascript
   * [ [backward_steps], [starting_tokens], [forward_steps] ]
   * ```
   *
   * The starting tokens are only returned when forward or backward steps were
   * actually generated from a subset of the {options.tokens} parameter.
   *
   * @param {object} [options] Options object
   * @param {Array<any>} [options.tokens=[]] Starting state tokens
   * @param {boolean} [options.backSearch=true] Should walk back
   * @param {boolean} [options.useTokenMap=true] Whether to use token map
   * @param {boolean} [options.runMissingTokens=true] Whether to answer when tokens are not in model
   * @returns {Array<Array<any>>} Array with back root and forward steps
   */
  run ({ tokens = [], backSearch = true, useTokenMap = true, runMissingTokens = true } = {}) {
    const startState = this._genStateFrom(tokens, useTokenMap)

    let hasSteps = startState !== this.initialState
    if (!runMissingTokens && tokens.length > 0 && !hasSteps) {
      return [[], [], []]
    }

    const forwardSteps = [...this.walkForward(startState)]
    hasSteps = hasSteps || forwardSteps.length > 0

    let backSteps = []
    if (backSearch) {
      backSteps = [...this.walkBackward(startState)].reverse()
      hasSteps = hasSteps || backSteps.length > 0
    }

    return [
      backSteps,
      hasSteps ? [...startState].filter((t) => t !== BEGIN) : [],
      forwardSteps
    ]
  }

  /**
   * Serialises the chain into a JSONable array.
   *
   * The returned array will look like:
   * ```javascript
   * [ [ [state], [ [next, count], ...], [ [prev, count], ...] ], ...]
   * ```
   *
   * @returns {Array<any>} JSON array
   * @see {@link https://mdn.io/stringify#toJSON()_behavior}
   */
  toJSON () {
    const serialised = []

    for (const [state, [next, prev]] of this.model) {
      const stateArr = [...state].map(stringifyToken)

      const nextArr = [...next].map(([value, count]) => {
        return [stringifyToken(value), count]
      })

      const prevArr = [...prev].map(([value, count]) => {
        return [stringifyToken(value), count]
      })

      serialised.push([stateArr, [nextArr, prevArr]])
    }

    return serialised
  }

  /**
   * Creates a Chain from a JSON string.
   *
   * @static
   * @param {string} jsonChain A chain serialised with `Chain.toJSON`
   * @param {object} options Additional options to Chain constructor
   * @returns {Chain} A new chain instance
   */
  static fromJSON (jsonChain, options) {
    let order

    const states = JSON.parse(jsonChain).map(
      ([state, [nextList, prevList]], index) => {
        const curStateSize = state.length

        if (index === 0) {
          order = curStateSize - 1
        } else if (curStateSize !== order + 1) {
          throw new Error('Inconsistent Markov chain order. ' +
            `Expected ${order} but got ${curStateSize - 1} (${state}).`)
        }

        const stateTuple = state.map(parseTokenString)

        const nextMap = weightMap()
        for (const [key, count] of nextList) {
          nextMap.set(parseTokenString(key), count)
        }

        const prevMap = weightMap()
        for (const [key, count] of prevList) {
          prevMap.set(parseTokenString(key), count)
        }

        return [tuple(...stateTuple), [nextMap, prevMap]]
      })

    const model = stateSpace()

    for (const [state, follow] of states) {
      model.set(state, follow)
    }

    return new Chain({ ...options, model })
  }
}

/**
 * Generates a initial state for a chain of the given order.
 * @param {number} order Order of chain
 * @returns {Tuple<any>} Initial state
 */
function getInitialState (order) {
  return tuple(...Array(1 + order).fill(BEGIN))
}

/**
 * Tests if token is complex object.
 * @param {any} token
 * @returns {boolean}
 */
function isObjectToken (token) {
  return tuple.isTuple(token) && token[0] === OBJECT
}

const symbolRegex = /^Symbol\((@@BEGIN|@@END)\)$/
const objectRegex = /^Object\((.*)\)$/

/**
 * Transforms token type to proper token string.
 * @param {any} token
 * @returns {string} String token
 */
function stringifyToken (token) {
  if (token === BEGIN) return BEGIN.toString()
  if (token === END) return END.toString()
  if (isObjectToken(token)) return `Object(${token[1]})`
  if (typeof token === 'string' && (symbolRegex.test(token) || objectRegex.test(token))) {
    return `"${token}"`
  }
  return token
}

/**
 * Transforms token string to proper token type.
 * @param {string} string
 * @returns {any} Chain token
 */
function parseTokenString (string) {
  if (string === BEGIN.toString()) return BEGIN
  if (string === END.toString()) return END
  let res
  if ((res = objectRegex.exec(string))) return JSON.parse(res[1])
  return string
}

/**
 * Builds a Markov chain model.
 * @param {Array<Array<any>>} corpus Corpus to build the model from
 * @param {object} [options={}] Options object
 * @param {number} [options.order] Order of chain
 * @param {Tuple<any>} [options.initialState] Initial state of the chain
 * @returns {Map<Tuple<any>,any>} Markov chain model
 */
function buildModel (corpus, { order, initialState } = {}) {
  const model = stateSpace()

  if (order < 0) {
    throw new Error('Invalid Markov chain order. ' +
    `Expected \`order >= 0\` but got ${order}.`)
  }

  if (!initialState || initialState.length - 1 !== order) {
    initialState = getInitialState(order)
  }

  for (const run of corpus) {
    Chain.seed(run, { model, initialState, order })
  }

  return model
}

/**
 * Builds a Map of token to states.
 * @param {Map<Tuple<any>,any>} model Markov chain model
 * @returns {Map<any,Tuple<any>>} Token map
 */
function buildTokenMap (model) {
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
 * Creates a proxy map handler.
 * @param {Function} keyFn Function to make keys
 * @returns {object} Proxy handler
 */
function mapHandler (keyFn) {
  return {
    get (target, propertyKey) {
      let property = Reflect.get(target, propertyKey)
      if (typeof property === 'function') {
        if (['set', 'get', 'has'].includes(propertyKey)) {
          return this._op.bind(this, target, propertyKey)
        } else {
          property = property.bind(target)
        }
      }
      return property
    },
    _op (map, method, ...args) {
      args[0] = this._genKey(args[0])
      return map[method](...args)
    },
    _genKey: keyFn
  }
}

/**
 * Proxy for a state space Map.
 * @param {Map<Tuple<any>,any>} [map=new Map()] Regular Map
 * @returns {Proxy}
 */
function stateSpace (map = new Map()) {
  return new Proxy(map, mapHandler(function (key) {
    if (!tuple.isTuple(key)) {
      throw new Error('Invalid Markov chain state. ' +
      `Expected tuple but got ${typeof key} (${key || key.toString()}).`)
    }
    return key.map((v) => {
      if (typeof v === 'object') v = makeObjectToken(v)
      return v
    })
  }))
}

/**
 * Proxy for a weight Map.
 * @param {Map<any,Number>} [map=new Map()] Regular Map
 * @returns {Proxy}
 */
function weightMap (map = new Map()) {
  return new Proxy(map, mapHandler(function (key) {
    if (typeof key === 'object') {
      return makeObjectToken(key)
    }
    return key
  }))
}

/**
 * Creates a tuple to represent complex JSON data.
 * @param {any} data
 * @returns {Tuple<Symbol,any>} Complex data token
 */
function makeObjectToken (data) {
  const value = typeof data === 'string' ? data : JSON.stringify(data)
  return tuple(OBJECT, value)
}

module.exports = Chain
