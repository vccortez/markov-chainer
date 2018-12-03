const test = require('tape')

const { Chain } = require('../lib')

const corpus = [
  ['Hello', 'world', 'of', 'Markov', 'chains'],
  ['These', 'are', 'my', "process'", 'tokens'],
  ['This', 'can', 'be', 'any', 'JSON', 'data'],
  ['I', 'can', 'use', 'other', { a: 'types' }]
]

test('chain serialisation', (t) => {
  t.plan(4)

  const options = { corpus, order: 1, useTokenMap: true }

  const original = new Chain(options)
  const serialised = JSON.stringify(original)

  t.ok(typeof serialised === 'string', 'chain should be serialisable by `JSON.stringify`')

  const generated = Chain.fromJSON(serialised, options)

  t.equal(generated.order, original.order, 'generated chain should have the same order as the original')
  t.same(generated.tokenMap, original.tokenMap, 'generated chain token map should be the same as the original')
  t.same(generated.model, original.model, 'generated chain model should be the same as the original')
})
