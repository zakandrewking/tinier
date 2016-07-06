import {
  ARRAY_OF, OBJECT_OF, COMPONENT, ARRAY, OBJECT, get, isObject, map, filter,
  tagType, checkType, handleNodeTypes, updateEl, addressWith, getState,
  setState, getTinierState, setTinierState, makeSignal, makeChildSignals,
  arrayOf, objectOf, createComponent, run,
} from '../main'

import { describe, it } from 'mocha'
import { assert } from 'chai'

const EL = 'EL'
const TAG = 'TAG'
const DefaultComponent = createComponent()
const NestedComponent = createComponent({
  model: {
    hello: arrayOf(createComponent({
      model: {
        friend: createComponent(),
        ghost: 'GHOST',
      }
    }))
  },
})

describe('get', () => {
  it('gets a value from an object with a default return value', () => {
    const object = { a: 10 }
    assert.strictEqual(get(object, 'a', 20), 10)
    assert.strictEqual(get(object, 'b', 20), 20)
  })

  it('default for null, undefined, true, false', () => {
    assert.strictEqual(get(null, 'b', 20), 20)
    assert.strictEqual(get(undefined, 'b', 20), 20)
    assert.strictEqual(get(true, 'b', 20), 20)
    assert.strictEqual(get(false, 'b', 20), 20)
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

describe('map', () => {
  it('iterates over keys for objects', () => {
    const obj = { a: 1, b: 2 }
    const res = map(obj, (x, k) => k + String(x + 1))
    assert.deepEqual({ a: 'a2', b: 'b3' }, res)
  })
  it('iterates over indices for arrays', () => {
    const arr = [ 1, 2 ]
    const res = map(arr, (x, i) => i + String(x + 1))
    assert.deepEqual([ '02', '13' ], res)
  })
})

describe('filter', () => {
  it('filters an object', () => {
    const obj = { a: 1, b: 2 }
    const res = filter(obj, a => a === 1)
    assert.deepEqual(res, { a: 1 })
  })
  it('filters an array', () => {
    const arr = [ 1, 2 ]
    const res = filter(arr, a => a === 1)
    assert.deepEqual(res, [ 1 ])
  })
})

describe('tagType', () => {
  it('returns a new object with the type', () => {
    assert.deepEqual(tagType({ a: 10 }, 'TAG'), { a: 10, type: 'TAG' })
  })
})

describe('checkType', () => {
  it('checks for a type tag', () => {
    assert.isTrue(checkType('TAG', { a: 10, type: 'TAG' }))
  })
})

describe('handleNodeTypes', () => {
  it('tests for tags', () => {
    const result = handleNodeTypes(tagType({ a: 10 }, OBJECT_OF), {
      [OBJECT_OF]: (node) => node.a,
    })
    assert.strictEqual(result, 10)
  })
})

describe('getState', () => {
  it('traverses arrays and objects', () => {
    const obj = { a: [ 0, { b: 10 } ] }
    assert.strictEqual(getState([ 'a', 1, 'b' ], obj), 10)
  })
})

describe('setState', () => {
  it('sets an object', () => {
    const object = { a: [ 0, { b: 10 } ] }
    const address = [ 'a', 1, 'b' ]
    setState(address, object, 20)
    assert.strictEqual(getState(address, object), 20)
  })
})

describe('getTinierState', () => {
  it('traverses arrays, objects, and children', () => {
    // model: { child1: arrayOf(Child1({ model: { a: [ 0, Child2 ] } })) }
    const obj = { child1: {
      signals: [],
      bindings: { a: [ null, TAG ] },
      children: [
        {
          a: [ 0, { signals: [TAG], bindings: [], children: [] } ]
        },
      ],
    } }
    const address = [ 'child1', 0, 'a', 1 ]
    assert.strictEqual(getTinierState(address, obj).signals[0], TAG)
  })
})

describe('setTinierState', () => {
  it('sets an object', () => {
    // model: { child1: arrayOf(Child1({ model: { a: [ 0, Child2 ] } })) }
    const obj = { child1: {
      signals: [],
      bindings: { a: [ null, TAG ] },
      children: [
        {
          a: [ 0, { signals: [TAG], bindings: [], children: [] } ]
        },
      ],
    } }
    const address = [ 'child1', 0, 'a', 1 ]
    const newState = {
      signals: [TAG],
      bindings: [TAG],
      children: [],
    }
    setState(address, obj, newState)
    assert.deepEqual(getTinierState(address, obj), newState)
  })
})

describe('addressWith', () => {
  it('adds a key', () => {
    const obj = { a: [ 0, { b: 10 } ] }
    const address = addressWith([ 'a', 1 ], 'b')
    assert.strictEqual(getState(address, obj), 10)
  })
  it('returns original if key is null', () => {
    const obj = { a: [ 0, { b: 10 } ] }
    const address = addressWith([ 'a', 1 ], null)
    assert.deepEqual(getState(address, obj), { b: 10 })
  })
})

describe('updateEl', () => {
  it('returns null if needsDestroy', () => {
    const res = updateEl(DefaultComponent, false, false, true, { el: 'el' })
    assert.isNull(res)
  })
  it('returns binding', () => {
    const component = createComponent({ render: ({ el }) => el })
    const res = updateEl(component, false, true, false, { el: 'EL' })
    assert.strictEqual(res, 'EL')
  })
  it('create always updates', () => {
    const component = createComponent({ render: ({ el }) => el,
                                        shouldUpdate: () => false, })
    const res = updateEl(component, true, false, false, { el: 'EL' })
    assert.strictEqual(res, 'EL')
  })
  it('shouldUpdate can force update', () => {
    const component = createComponent({ render: ({ el }) => el,
                                        shouldUpdate: () => true, })
    const res = updateEl(component, false, false, false, { el: 'EL' })
    assert.strictEqual(res, 'EL')
  })
  it('shouldUpdate can stop update', () => {
    const component = createComponent({ render: ({ el }) => el,
                                        shouldUpdate: () => false, })
    const res = updateEl(component, false, true, false, { el: 'EL' })
    assert.isNull(res)
  })
})

describe('makeSignal', () => {
  it('stores functions', () => {
    const signal = makeSignal()
    signal.on(() => 10)
    signal.call(() => 20)
    assert.strictEqual(signal._onFns[0](), 10)
    assert.strictEqual(signal._callFns[0](), 20)
  })
})

describe('makeChildSignals', () => {
  it('keeps model shape', () => {
    const HasSignal = createComponent({
      signals: [ 'ribose' ],
    })
    const Parent = createComponent({
      model: {
        deoxy: arrayOf(HasSignal)
      }
    })
    const childSignals = makeChildSignals(Parent.model)
    childSignals.deoxy.ribose.onEach((i) => 10)
    assert.strictEqual(childSignals.deoxy.ribose._onFns[0](), 10)
  })
})

describe('createComponent and run', () => {
  it('respects binding object for create and render', (done) => {
    const Child = createComponent({
      render: ({ state, methods, el }) => {
        assert.strictEqual(el, TAG)
      },

      willMount: ({ el }) => {
        assert.strictEqual(el, TAG)
      },

      didMount: ({ el }) => {
        assert.strictEqual(el, TAG)
      },

      shouldUpdate: () => {
        return true
      },

      willUpdate: ({ el }) => {
        assert.strictEqual(el, TAG)
      },

      didUpdate: ({ el }) => {
        assert.strictEqual(el, TAG)
        done()
      },

      willUnmount: ({ el }) => {
        assert.strictEqual(el, TAG)
      },
    })

    const Parent = createComponent({
      model: { child: Child },
      init: () => ({ child: Child.init() }),
      render: () => ({ child: TAG }),
    })

    run(Parent, EL)
  })

  it('errors if the model is a single component', () => {
    assert.throws(() => {
      createComponent({ model: DefaultComponent })
    }, /cannot be another Component/)
  })
})
