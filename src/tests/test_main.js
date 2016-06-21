import {
    mapValues, get, isObject, tagType, handleNodeTypes, mapOrIdentity,
    mapValuesOrIdentity, mapState, createComponent, reducerForModel, run,
} from '../main'

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

describe('get', () => {
    it('gets a value from an object with a default return value', () => {
        const object = { a: 10 }
        assert.strictEqual(get(object, 'a', 20), 10)
        assert.strictEqual(get(object, 'b', 20), 20)
    })
})

describe('isObject', () => {
  it('is true for object literals', () => {
    assert.isTrue(isObject({ a: 10 }))
  })
  it('is true for array literals', () => {
    assert.isTrue(isObject([ 10 ]))
  })
  it('is false for functions, strings, numbers', () => {
    assert.isFalse(isObject(() => [ 10 ]))
    assert.isFalse(isObject(10))
    assert.isFalse(isObject('10'))
  })
})

describe('tagType', () => {
  it('returns a new object with the type', () => {
    assert.deepEqual(tagType({ a: 10 }, 'TAG'), { a: 10, type: 'TAG' })
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

describe('reducerForModel', () => {
    it('combines reducers for a model', () => {
        // define components
        const activate = (state, _) => ({ ...state, active: true })
        const Child = createComponent({
            init: () => ({ active: false }),
            reducers: { activate },
        })
        const Parent = createComponent({
            model: { child: Child },
            init: () => ({ child: Child.init(), active: false }),
            reducers: { activate },
        })
        // make a reducer
        const combinedReducer = reducerForModel(Parent)
        // run reducer
        const testState = Parent.init()
        assert.isFalse(result.active)
        assert.isFalse(result.child.active)
        const result = combinedReducer(testState, 'EMPTY')
        assert.isTrue(result.active)
        assert.isTrue(result.child.active)
    })
})

describe('createComponent', () => {
  it('respects binding object for create and render', (done) => {
    const Child = createComponent({
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

    run(Parent, null)
  })
})
