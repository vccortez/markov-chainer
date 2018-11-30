# markov-chainer

> Markov chain library for Node.js

[![npm version](https://badge.fury.io/js/markov-chainer.svg)](https://badge.fury.io/js/markov-chainer)

A library implementation of stationary [Markov chains](https://en.wikipedia.org/wiki/Markov_chain#Discrete-time_Markov_chain) with optional memory.
The focus of `markov-chainer` is keeping responses on topic, helping with the creation of chat bots.

## Installation

The library is available on [npm](https://www.npmjs.com/package/markov-chainer) as `markov-chainer`:

```bash
npm install markov-chainer
```

## Features

Some of the main features:
- **Seeding**: chain can grow after instantiation
- **On topic**: chain responses are often on topic
- **Small API**: only around 6 methods you may learn
- **JSON states**: accepts any JSONable data type as states

## Usage

To create a new chain you a *corpus*, that is, a collection of *sentences* of your Markov process:
```javascript
const corpus = [
  ['Hello', 'world', 'of', 'Markov', 'chains'],
  ['These', 'are', 'my', "process'", 'tokens'],
  ['This', 'can', 'be', 'any', 'JSON', 'data'],
  ['I', 'can', 'use', 'other', { a: 'types' }]
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
let res = chain.run()
// `res` is an array of three arrays,
// the `back`, `root`, and `forward`
// steps your chain took
console.log(res)
```

Possible output:
```javascript
[ [], [], [ 'I', 'can', 'be', 'any', 'JSON', 'data' ] ]
```

## API

API documentation can be found at [vekat.github.io/markov-chainer](https://vekat.github.io/markov-chainer/).

## Acknowledgements

- [`markovify`](https://github.com/jsvine/markovify) - Python implementation and main inspiration for this library
- [`markov-chains`](https://github.com/bdchauvette/markov-chains) - JavaScript library inspired by `markovify` with browser support
- [`node-markov`](https://github.com/substack/node-markov)

## Licence

The `vekat/markov-chainer` project is licensed under the [MIT](licence) licence.
