'use strict'

import { createView, mapState, mapOrIdentity, mapValuesOrIdentity, run,
       } from '../main'

import { createStore, } from 'redux'

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
const defaultView = createView()

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
    const arrayView = createView({ model: [null, null, defaultView] })
    const res = mapState(data, arrayView, [], mapStateIdentity)
    assert.equal(data, res)
  })

  it('does not modify - object', () => {
    const data = { a: 'a', b: 'b', c: 'c'}
    const res = mapState(data, defaultView, [], mapStateIdentity)
    assert.equal(data, res)
  })

  it('does not modify - tree', () => {
    const res = mapState(tree, defaultView, [], mapStateIdentity)
    assert.equal(tree, res)
  })
})

describe('createView', () => {
  it('respects binding object for create and update', (done) => {
    const Child = createView({
      create: function (el) {
        assert.strictEqual(el, 'TAG')
      },
      update: function (el) {
        assert.strictEqual(el, 'TAG')
        done()
      },
    })
    const Parent = createView({
      model: {
        child: Child
      },
      init: function () {
        return { child: Child.init() }
      },
      update: function () {
        return { child: 'TAG' }
      }
    })
    run(Parent, null, createStore)
  })
})
