# markov-chainer

> Markov chain library for Node.js

[![npm version](https://badge.fury.io/js/markov-chainer.svg)](https://badge.fury.io/js/markov-chainer)

An implementation of stationary [Markov chains](https://en.wikipedia.org/wiki/Markov_chain#Discrete-time_Markov_chain) with optional memory.
The main goal of `markov-chainer` is supporting the creation of simple chat bots.

## Installation

The library is available on [npm](https://www.npmjs.com/package/markov-chainer) as `markov-chainer`:

```bash
npm install markov-chainer
```

## Features

- **Small API**: at most 6 new methods to learn
- **Seeding**: model can grow after instantiation
- **On topic**: responses are often related to input
- **JSON states**: states can be any JSONable data type
- **Serialisation**: import/export a model from/to JSON

## Usage

To create a new model from scratch, first provide a *corpus*, that is, a collection of example *runs* for your Markov process:
```javascript
/* example of corpus: lines is sample runs
   elements are valid states of your process */
const corpus = [
  ['Hello', 'world', 'of', 'Markov', 'chains'],
  ['Lines', 'are', 'a', 'sample', 'of', 'run'],
  ['Each', 'value', 'is', 1, 'valid', 'state'],
  ['This', 'can', 'be', 'any', 'JSON', 'type'],
  ['It', 'may', 'be', 'even', { a: 'object' }]
]
```

Then, create a `Chain` object using the main constructor:
```javascript
const { Chain } = require('markov-chainer')
// takes an object with settings
// one of which is called `corpus`
const chain = new Chain({ corpus })
```

Finally, request runs from your chain:
```javascript
// `res` contains three lists of states:
// the `previous`, `initial`, and `next`
// states taken by the Markov chain run
const res = chain.run()
console.log(res)
```

Possible output:
```javascript
[ [], [], [ 'It', 'may', 'be', 'any', 'JSON', 'type' ] ]
```

Runs can also begin at a given state:
```javascript
console.log(chain.run({ tokens: ['sample'] }))
```

Possible output:
```javascript
[ [ 'Lines', 'are', 'a' ], [ 'sample' ], [ 'of', 'Markov', 'chains' ] ]
```

## API

API documentation can be found at [vekat.github.io/markov-chainer](https://vekat.github.io/markov-chainer/).

## Acknowledgements

- [`markovify`](https://github.com/jsvine/markovify) - Python implementation and main inspiration for this library
- [`markov-chains`](https://github.com/bdchauvette/markov-chains) - JavaScript library inspired by `markovify` with browser support
- [`node-markov`](https://github.com/substack/node-markov)

## Licence

The `vekat/markov-chainer` project is licensed under the [MIT](licence) licence.
