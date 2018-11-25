# markov-chainer

Yet another simple Markov chain generator for Node

## Goal

The goal of `markov-chainer` is providing a chain implementation that can generate “on topic” states most of the time

This library is currently WIP, I have the intention to publish it on NPM when complete

It was made specifically to create chatbots

## Work in progress

When requesting a run from an input state to the chain, the input may be greater than or less than the chain's state size, and in any case an input state does not exist in the chain we can not respond on topic

In order to maximise the generation of on topic states, here are some ideas:

- [x] 1. If an input's size is less than the chain's state size, it is possible to left-pad the input with begin tokens until the sizes match
- [x] 2. If an input's size is greater than the chain's state size, it is possible to generate state tuples with the same state size with the input tokens; then, we can filter the generated tuples for the ones that are states on the chain and select one randomly
- [x] 3. If the chain's state size is greater than 1, it would be possible to add a map from single tokens to a state on the chain, similar to a chain of order 1; this map would allow us to jump from any given token to a full state, which means we could filter the input tokens for the ones that lead to chain states and select one randomly

Idea 3 could be useful if the previous solutions fail to find full state and we want to stay on topic, however the downside would be a more random sentence (starting from a random token of the input) and it would increase the chain's size

In any case, it is still possible to not find a starting state, or to get a starting state that does not exist in the chain (if it was a state made by solution 1, or from an already complete input) and we may choose to return an empty answer or start from the beginning state (an off topic sentence), which could be decided with a flag

## Inspirations

- [`markovify`](https://github.com/jsvine/markovify)
- [`markov-chains`](https://github.com/bdchauvette/markov-chains)
- [`node-markov`](https://github.com/substack/node-markov)
