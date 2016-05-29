'use strict'

import {
  mapValues, createComponent, mapState, mapOrIdentity, mapValuesOrIdentity, run,
} from '../main'

import { createStore } from 'redux'

import { describe, it } from 'mocha'
import { assert } from 'chai'

const tree = {
  a: [ 1, 2, 3 ],
  b: {
    c: [ 4, 5, 6 ],
    d: 'e',
  }
}
const identity = x => x
const mapStateIdentity = (...args) => args[1]
const defaultComponent = createComponent()

describe('mapValues', () => {
  it('iterates over keys', () => {
    const obj = { a: 1, b: 2 }
    const res = mapValues(obj, (x, k) => k + String(x + 1))
    assert.deepEqual({ a: 'a2', b: 'b3' }, res)
  })
})

describe('mapOrIdentity', () => {
  it('returns original array', () => {
    const data = ['a', 'b', 'c']
    assert.equal(data, mapOrIdentity(data, identity))
  })

  it('can modify', () => {
    const data = [ 1, 2 ]
    assert.deepEqual([ 2, 3 ], mapOrIdentity(data, x => x + 1))
  })
})

describe('mapValuesOrIdentity', () => {
  it('returns original array', () => {
    const data = { a: 1, b: 2 }
    assert.equal(data, mapValuesOrIdentity(data, identity))
  })

  it('can modify', () => {
    const data = { a: 1, b: 2 }
    assert.deepEqual({ a: 2, b: 3 }, mapValuesOrIdentity(data, x => x + 1))
  })
})

describe('mapState', () => {
  it('does not modify - array', () => {
    const data = ['a', 'b', 'c']
    const arrayComponent = createComponent({ model: [null, null, defaultComponent] })
    const res = mapState(data, arrayComponent, [], mapStateIdentity)
    assert.equal(data, res)
  })

  it('does not modify - object', () => {
    const data = { a: 'a', b: 'b', c: 'c'}
    const res = mapState(data, defaultComponent, [], mapStateIdentity)
    assert.equal(data, res)
  })

  it('does not modify - tree', () => {
    const res = mapState(tree, defaultComponent, [], mapStateIdentity)
    assert.equal(tree, res)
  })
})

describe('createComponent', () => {
  it('respects binding object for create and render', (done) => {
    const Child = createComponent({
      name: 'Child',

      render: (state, methods, el) => {
        assert.strictEqual(el, 'TAG')
      },

      willMount: (state, methods, el) => {
        assert.strictEqual(el, 'TAG')
      },

      didMount: (state, methods, el) => {
        assert.strictEqual(el, 'TAG')
      },

      shouldUpdate: (oldState, newState) => {
        return true
      },

      willUpdate: (state, methods, el) => {
        assert.strictEqual(el, 'TAG')
      },

      didUpdate: (state, methods, el) => {
        assert.strictEqual(el, 'TAG')
        done()
      },

      willUnmount: (state, methods, el) => {
        assert.strictEqual(el, 'TAG')
      },
    })

    const Parent = createComponent({
      model: { child: Child },
      init: () => ({ child: Child.init() }),
      render: () => ({ child: 'TAG' }),
    })

    run(Parent, null, createStore)
  })
})
