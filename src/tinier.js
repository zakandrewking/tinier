/** @module tinier */

// constants
export const ARRAY_OF  = '@TINIER_ARRAY_OF'
export const OBJECT_OF = '@TINIER_OBJECT_OF'
export const COMPONENT = '@TINIER_COMPONENT'
export const ARRAY     = '@TINIER_ARRAY'
export const OBJECT    = '@TINIER_OBJECT'
export const NODE      = '@TINIER_NODE'
export const NULL      = '@TINIER_NULL'
export const STRING    = '@TINIER_STRING'
export const TOP       = '@TINIER_TOP'
export const CREATE    = '@TINIER_CREATE'
export const UPDATE    = '@TINIER_UPDATE'
export const DESTROY   = '@TINIER_DESTROY'

// basic functions
function noop () {}

function constant (val) {
  return () => val
}

function identity (val) {
  return val
}

function last (array) {
  return array[array.length - 1]
}

export function tail (array) {
  return [ array.slice(0, -1), last(array) ]
}

export function head (array) {
  return [ array[0], array.slice(1) ]
}

function fromPairs (pairs) {
  return pairs.reduce((accum, [ key, val ]) => {
    return { ...accum, [key]: val }
  }, {})
}

/**
 * Get the property of the object or index of the array, or return the default
 * value.
 * @param {Object|Array} object - An object or array.
 * @param {String} property - An property of the object.
 * @return {*} The value of the property or, if not present, the default value.
 */
export function get (object, property) {
  return (object &&
          typeof object !== 'string' &&
          object.hasOwnProperty(property)) ? object[property] : null
}

export function isUndefined (object) {
  return typeof object === 'undefined'
}

/**
 * Check if the value is an object with enumerable properties. Also returns true
 * for arrays.
 * @param {*} value - The value to test.
 * @return {Boolean}
 */
export function isObject (object) {
  return object != null && (typeof object === 'object')
}

/**
 * Check if the object is an array
 * @param {*} object - The object to test.
 * @return {Boolean}
 */
export function isArray (object) {
  return Array.isArray(object)
}

export function isString (v) {
  return typeof v === 'string'
}

/**
 * Check if the object is a function.
 * @param {*} object - The object to test.
 * @return {Boolean}
 */
export function isFunction (object) {
  return typeof(object) === 'function'
}

export function notNull (val) {
  return val !== null
}

/**
 * Iterate over the keys and values of an object. Uses Object.keys to find
 * iterable keys.
 * @param {Object} obj - The input object.
 * @param {Function} fn - A function that takes the arguments (value, key).
 * @return {Object} A transformed object with values returned by the function.
 */
export function mapValues (obj, fn) {
  const newObj = {}
  for (let key in obj) {
    newObj[key] = fn(obj[key], key)
  }
  return newObj
}

export function reduceValues (obj, fn, init) {
  let accum = init
  for (let key in obj) {
    accum = fn(accum, obj[key], key)
  }
  return accum
}

export function zipArrays (arrays) {
  const lenLongest = Math.max.apply(null, arrays.filter(x => x !== null).map(a => a.length))
  const res = []
  for (let i = 0; i < lenLongest; i++) {
    res.push(arrays.map(a => a !== null && i < a.length ? a[i] : null))
  }
  return res
}

export function zipObjects (objects) {
  const len = objects.length
  // find all the keys
  const allKeys = {}
  for (let i = 0; i < len; i++) {
    const object = objects[i]
    if (object === null) {
      continue
    }
    for (let k in object) {
      allKeys[k] = true
    }
  }
  // make new object
  const res = {}
  for (let key in allKeys) {
    res[key] = Array(len)
    for (let i = 0; i < len; i++) {
      const object = objects[i]
      res[key][i] = get(object, key)
    }
  }
  return res
}

export function filterValues (object, fn) {
  const out = {}
  for (var key in object) {
    const value = object[key]
    if (fn(value, key)) out[key] = value
  }
  return out
}

// TODO make this lazy
function any (ar) {
  return ar.reduce((accum, val) => accum || val, false)
}

/**
 * Defers calling fn until the current process finishes.
 */
function defer (fn) {
  setTimeout(fn, 1)
}

/**
 * Adds a tag to the object.
 */
export function tagType (type, obj) {
  if (typeof type !== 'string') {
    throw new Error('First argument must be a string')
  }
  if (!isObject(obj)) {
    throw new Error('Second argument must be an object')
  }
  obj.type = type
  return obj
}

export function checkType (type, obj) {
  if (obj === null) {
    return type === NULL
  }
  if (typeof type !== 'string') {
    throw new Error('First argument must be a string')
  }
  if (isUndefined(obj)) {
    throw new Error('Bad second argument')
  }
  return get(obj, 'type') === type
}

/**
 * Basic pattern matching.
 * @param {Object|null} object - An object generated with tagType, an object, an
 *                               array, or null.
 * @param {Object} fns - An object with types for keys and functions for values.
 *                       Also accepts keys tinier.OBJECT, tinier.ARRAY, and
 *                       tinier.NULL. To avoid conflict, tinier.OBJECT has the
 *                       lowest priority.
 * @param {Function} defaultFn - A function to run if the object type is not
 *                               found. Takes `object` as a single argument.
 * @return {*} Return value from the called function.
 */
export function match (object, fns, defaultFn = throwUnrecognizedType) {
  for (let key in fns) {
    if ((key === NULL   && object === null ) ||
        (key === ARRAY  && isArray(object) ) ||
        (isObject(object) && checkType(key, object))) {
      return fns[key](object)
    }
  }
  if (OBJECT in fns && isObject(object)) {
    return fns[OBJECT](object)
  }
  return defaultFn(object)
}

function throwUnrecognizedType (node) {
  throw new Error('Unrecognized type in pattern matching: ' + node)
}

// -------------------------------------------------------------------
// Update components
// -------------------------------------------------------------------

/**
 * Determine whether the model has any child components.
 */
export function hasChildren (node) {
  return match(
    node,
    {
      [ARRAY_OF]: () => true,
      [OBJECT_OF]: () => true,
      [COMPONENT]: () => true,
      [ARRAY]: node => any(node.map(hasChildren)),
      [OBJECT]: node => any(Object.keys(node).map(k => hasChildren(node[k]))),
    }
  )
}

function checkRenderResultRecurse (userBindings, node, state) {
  const updateRecurse = (s, k) => {
    const u = k === null ? userBindings : get(userBindings, k)
    if (userBindings !== null && u === null) {
      throw new Error('Shape of the bindings object does not match the model.' +
                      'Model: ' + node + '  Bindings object: ' + userBindings)
    }
  }
  const recurse = (n, k) => {
    checkRenderResultRecurse(get(userBindings, k), n, get(state, k))
  }
  match(
    node,
    {
      [OBJECT_OF]: objOf => {
        // check for extra attributes
        if (userBindings !== null
            && any(Object.keys(userBindings).map(k => !(k in state)))) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        } else {
          mapValues(state, updateRecurse)
        }
      },
      [ARRAY_OF]: arOf => {
        // check array lengths
        if (userBindings !== null && state.length !== userBindings.length) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        } else {
          state.map(updateRecurse)
        }
      },
      [COMPONENT]: component => updateRecurse(state, null),
      [ARRAY]: ar => {
        if (userBindings !== null && !isArray(userBindings)) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        } else {
          ar.map(recurse)
        }
      },
      [OBJECT]: obj => {
        if (userBindings !== null && isArray(userBindings)) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        } else {
          mapValues(obj, recurse)
        }
      }
    }
  )
}

/**
 * Check the result of render against the model and state.
 * @param {Object} node - A model node.
 * @param {*} state - A state node.
 * @param {Object} userBindings - The new bindings returned by render.
 * @return {Object} The userBindings object.
 */
export function checkRenderResult (userBindings, node, state) {
  checkRenderResultRecurse(userBindings, node, state)
  return userBindings
}

/**
 * Run lifecycle functions for the component.
 * @param {Object} address -
 * @param {Object} component -
 * @param {Object} state -
 * @param {Object} diffVal -
 * @param {Object|null} lastRenderedEl - The element rendered in previously, if
 *                                       there was one.
 * @param {Object|null} el - The element to render in provided by
 *                           component.render.
 * @param {Object} stateCallers -
 * @return {Object}
 */
export function updateEl (address, component, state, diffVal, lastRenderedEl, el,
                          stateCallers, opts) {
  // the object passed to lifecycle functions
  const reducers = patchReducers(address, component, stateCallers.callReducer)
  const signals = patchSignals(address, component, stateCallers.callSignal)
  const methods = patchMethods(address, component, stateCallers.callMethod,
                               reducers, signals)
  const arg = { state, methods, reducers, signals, el, lastRenderedEl }

  // warn if the el is null
  if (el === null && !diffVal === DESTROY && component.render !== noop) {
    throw new Error('No binding provided for component ' + component.displayName
                    + ' at [' + address.join(', ') + '].')
  }

  if (diffVal === DESTROY) {
    // destroy
    component.willUnmount(arg)
    return { bindings: null, lastRenderedEl }
  } else {
    // create or update
    const shouldUpdate = (diffVal === CREATE || diffVal === UPDATE ||
                          el !== lastRenderedEl)

    if      (diffVal === CREATE) component.willMount(arg)
    else if (shouldUpdate)     component.willUpdate(arg)

    if (opts.verbose && shouldUpdate) {
      console.log('Rendering ' + component.displayName + ' at [' +
                  address.join(', ') + '].')
    }

    // render
    const bindings = shouldUpdate ?
            checkRenderResult(component.render(arg), component.model, state) :
            null
    // check result
    if (shouldUpdate && bindings === null && hasChildren(component.model)) {
      throw new Error('The render function of component ' +
                      component.displayName + ' did not return new bindings')
    }

    // These need to be asynchronous.
    if      (diffVal === CREATE) defer(() => component.didMount(arg))
    else if (shouldUpdate)     defer(() => component.didUpdate(arg))

    // If the component rendered, then change lastEl.
    return { bindings, lastRenderedEl: shouldUpdate ? el : lastRenderedEl }
  }
}

/**
 * For a tree, return everything down to the first set of NODES with data for
 * leaves.
 */
function dropNodes (tree) {
  return match(tree, {
    [NODE]: node => node.data,
    [OBJECT]: obj => mapValues(obj, dropNodes),
    [ARRAY]: ar => ar.map(dropNodes),
  })
}

/**
 * Run create, update, and destroy for component.
 * @param {Array} address - The location of the component in the state.
 * @param {Object} node - A model or a node within a model.
 * @param {Object} diff - The diff object for this component.
 * @param {Object|null} bindings -
 * @param {Object|null} renderResult -
 * @param {Object} stateCallers -
 * @return {Object}
 */
function updateComponents (address, node, state, diff, bindings, renderResult,
                           stateCallers, opts) {
  const updateRecurse = ([ d, s ], k) => {
    // TODO in updateRecurse functions where k can be null, there must be a
    // nicer way to organize things with fewer null checks
    const component = k !== null ? node.component : node
    const newAddress = k !== null ? addressWith(address, k) : address
    const b = k !== null ? get(bindings, k) : bindings
    const r = k !== null ? get(renderResult, k) : renderResult
    // Update the component. If DESTROY, then there will not be a binding.
    const res = updateEl(newAddress, component, s, d.data, get(b, 'data'), r,
                         stateCallers, opts)
    // Fall back on old bindings.
    const nextRenderResult = res.bindings !== null ? res.bindings :
            dropNodes(b.children)
    const data = res.lastRenderedEl
    // update children
    const children = updateComponents(newAddress, component.model, s,
                                      d.children, get(b, 'children'),
                                      nextRenderResult, stateCallers, opts)
    return tagType(NODE, { data, children })
  }
  const recurse = (n, k) => {
    return updateComponents(addressWith(address, k), n, get(state, k), diff[k],
                            get(bindings, k), get(renderResult, k),
                            stateCallers, opts)
  }
  return match(
    node,
    {
      [OBJECT_OF]: objOf => {
        return mapValues(zipObjects([ diff, state ]), updateRecurse)
      },
      [ARRAY_OF]: arOf => {
        return zipArrays([ diff, state ]).map(updateRecurse)
      },
      [COMPONENT]: component => updateRecurse([ diff, state ], null),
      [ARRAY]: ar => ar.map(recurse),
      [OBJECT]: obj => mapValues(obj, recurse),
    })
}

// -------------------------------------------------------------------
// State
// -------------------------------------------------------------------

export function addressWith (address, key) {
  if (key === null) {
    return address
  } else {
    const newAddress = address.slice(0)
    newAddress.push(key)
    return newAddress
  }
}

export function addressEqual (a1, a2) {
  if (a1 === null || a2 === null || a1.length !== a2.length) return false
  return a1.reduce((accum, v, i) => accum && v === a2[i], true)
}

/**
 * Get the value in a tree.
 * @param {Array} address -
 * @param {Object} tree -
 * @return {*} - The value at the given address.
 */
function treeGet (address, tree) {
  return address.reduce((accum, val) => {
    return checkType(NODE, accum) ? accum.children[val] : accum[val]
  }, tree)
}

/**
 * Set the value in a tree; immutable.
 * @param {Array} address -
 * @param {Object} tree -
 * @param {*} value - The new value to set at address.
 * @return (*) The new tree.
 */
function treeSet (address, tree, value) {
  if (address.length === 0) {
    return value
  } else {
    const [ k, rest ] = head(address)
    return (typeof k === 'string' ?
            { ...tree, [k]: treeSet(rest, treeGet([ k ], tree), value) } :
            [ ...tree.slice(0, k), treeSet(rest, treeGet([ k ], tree), value),
              ...tree.slice(k + 1) ])
  }
}

/**
 * Set the value in a tree; mutable.
 * @param {Array} address -
 * @param {Object} tree -
 * @param {*} value - The new value to set at address.
 * @return (*) The tree.
 */
function treeSetMutable (address, tree, value) {
  if (address.length === 0) {
    return value
  } else {
    const [ rest, last ] = tail(address)
    const parent = treeGet(rest, tree)
    if (checkType(NODE, parent)) {
      parent.children[last] = value
    } else {
      parent[last] = value
    }
    return tree
  }
}

export function makeTree (init, mutable) {
  let state = init
  return {
    get: (address) => {
      return treeGet(address, state)
    },
    set: (address, value) => {
      state = mutable ?
        treeSetMutable(address, state, value) :
        treeSet(address, state, value)
    },
  }
}

/**
 * Check that the new state is valid. If not, then throw an Error.
 * @param {Object} modelNode - A model or a node of a model.
 * @param {Object} newState - The new state corresponding to modelNode.
 */
export function checkState (modelNode, newState) {
  match(modelNode, {
    [OBJECT_OF]: objOf => {
      if ((!isObject(newState) || isArray(newState)) && newState !== null) {
        throw new Error('Shape of the new state does not match the model. ' +
                        'Model: ' + objOf + '  State: ' + newState)
      } else {
        mapValues(newState, s => checkState(modelNode.component.model, s))
      }
    },
    [ARRAY_OF]: arOf => {
      if (!isArray(newState) && newState !== null) {
        throw new Error('Shape of the new state does not match the model.' +
                        'Model: ' + arOf + '  State: ' + newState)
      } else {
        newState.map(s => checkState(modelNode.component.model, s))
      }
    },
    [COMPONENT]: component => {
      checkState(modelNode.model, newState)
    },
    [ARRAY]: ar => {
      if (!isArray(newState) && newState !== null) {
        throw new Error('Shape of the new state does not match the model.' +
                        'Model: ' + ar + '  State: ' + newState)
      } else {
        ar.map((a, i) => checkState(a, get(newState, i)))
      }
    },
    [OBJECT]: obj => {
      if ((!isObject(newState) || isArray(newState)) && newState !== null) {
        throw new Error('Shape of the new state does not match the model. ' +
                        'Model: ' + obj + '  State: ' + newState)
      } else {
        mapValues(obj, (o, k) => checkState(o, get(newState, k)))
      }
    },
  })
}

function computeDiffValue (state, lastState, key, isValidFn, shouldUpdate,
                           address, triggeringAddress) {
  const stateValid = isValidFn(state, key)
  const lastStateValid = isValidFn(lastState, key)
  if (stateValid && !lastStateValid) {
    return CREATE
  } else if (stateValid && lastStateValid) {
    const same = (key === null ? state !== lastState :
                  state[key] !== lastState[key])
    const componentTriggeredUpdate = addressEqual(address, triggeringAddress)
    if (same && shouldUpdate({ state, lastState, componentTriggeredUpdate })) {
      return UPDATE
    } else {
      return null
    }
  } else if (!stateValid && lastStateValid) {
    return DESTROY
  } else {
    return null
  }
}

/**
 * Compute the full diff tree for the model node. Calls shouldUpdate.
 */
function diffWithModel (modelNode, state, lastState, address,
                        triggeringAddress) {
  return match(
    modelNode,
    {
      [OBJECT_OF]: objOf => {
        const isValidFn = (obj, k) => {
          return isObject(obj) && k in obj && obj[k] !== null
        }
        const l = Object.assign({}, state || {}, lastState || {})
        return mapValues(l, function (_, k) {
          const data = computeDiffValue(state, lastState, k, isValidFn,
                                        objOf.component.shouldUpdate,
                                        addressWith(address, k),
                                        triggeringAddress)
          const children = diffWithModel(objOf.component.model,
                                         get(state, k),
                                         get(lastState, k),
                                         addressWith(address, k),
                                         triggeringAddress)
          return tagType(NODE, { data, children })
        })
      },
      [ARRAY_OF]: arOf => {
        const isValidFn = (obj, i) => {
          return isArray(obj) && i < obj.length && obj[i] !== null
        }
        const longest = Math.max(isArray(state) ? state.length : 0,
                                 isArray(lastState) ? lastState.length : 0)
        const l = Array.apply(null, { length: longest })
        return l.map(function (_, i) {
          const data = computeDiffValue(state, lastState, i, isValidFn,
                                        arOf.component.shouldUpdate,
                                        addressWith(address, i), triggeringAddress)
          const children = diffWithModel(arOf.component.model,
                                         get(state, i),
                                         get(lastState, i),
                                         addressWith(address, i),
                                         triggeringAddress)
          return tagType(NODE, { data, children })
        })
      },
      [COMPONENT]: component => {
        const isValidFn = (obj, _) => obj !== null
        const data = computeDiffValue(state, lastState, null, isValidFn,
                                      component.shouldUpdate,
                                      address, triggeringAddress)
        const children = diffWithModel(component.model, state || null,
                                       lastState || null, address,
                                       triggeringAddress)
        return tagType(NODE, { data, children })
      },
      [ARRAY]: ar => {
        return ar.map((n, i) => {
          return diffWithModel(n, get(state, i), get(lastState, i),
                               addressWith(address, i), triggeringAddress)
        })
      },
      [OBJECT]: obj => {
        return mapValues(obj, (n, k) => {
          return diffWithModel(n, get(state, k), get(lastState, k),
                               addressWith(address, k), triggeringAddress)
        })
      },
    })
}

/**
 * For an array of minSignals and minUpdate trees, return the minimal trees that
 * represent the whole array.
 */
function singleOrAll (modelNode, address, minTreeAr) {
  const getMin = indices => {
    if (indices.length === 0) {
      // If all elements in the array are null, return null.
      return null
    } else if (nonNullIndices.signals.length === 1) {
      // If there is a single value, return that tree, with an updated address.
      return {
        minSignals: {
          diff: minTreeAr.map(a => a.minSignals.diff),
          address,
          modelNode,
        },
        minUpdate: {
          diff: minTreeAr.map(a => a.minUpdate.diff),
          address,
          modelNode,
        },
      }
    } else {
      // Otherwise, return full trees from this level.
      return {
        minSignals: {
          diff: minTreeAr.map(a => a.minSignals.diff),
          address,
          modelNode,
        },
        minUpdate: {
          diff: minTreeAr.map(a => a.minUpdate.diff),
          address,
          modelNode,
        },
      }
    }
  }
  // Get the indices where the signal and update trees are not null.
  const nonNullIndices = minTreeAr.reduce((accum, val, i) => {
    return {
      signals: val.minSignals !== null ? [ ...accum.signals, i ]: accum.signals,
      update: val.minUpdate !== null ? [ ...accum.update, i ]: accum.update,
    }
  }, { signals: [], update: [] })
  // For each set of indices, test the diffs with these tests to get a minimum
  // tree.
  const minSignals = getMin(nonNullIndices.signals)
  const minUpdate = getMin(nonNullIndices.update)
  return { minSignals, minUpdate }
}

/**
 * 1. Run shouldUpdate for every component in the tree.
 * 2. Return the information about the minimal tree to update with
 *    updateComponents (whenever shouldUpdate is true) as minUpdate.
 * 3. Return the information about the minimal tree to update with
 *    mergeSignals (whenever nodes are added or deleted) as minSignals.
 *
 * @param {Object} modelNode - A model or a node of a model.
 * @param {Object} state - The new state corresponding to modelNode.
 * @param {Object|null} lastState - The old state corresponding to modelNode.
 * @param {Array} address -
 * @param {Array} triggeringAddress -
 * @returns {Object} An object with the attributes minSignals and
 *                   minUpdate. Each represents a minimal tree necessary for the
 *                   appropriate update function and has the attributes diff,
 *                   modelNode, and address.
 */
export function diffWithModelMin (modelNode, state, lastState, address,
                                  triggeringAddress) {
  // 1. calculate whole diff tree
  const diff = diffWithModel(modelNode, state, lastState, address,
                             triggeringAddress)
  // 2. trim the tree for the two needs
  return {
    minSignals: {
      diff,
      address,
      modelNode,
    },
    minUpdate: {
      diff,
      address,
      modelNode,
    },
  }
}

// -------------------------------------------------------------------
// Signals
// -------------------------------------------------------------------

/**
 * Make a signal.
 * @return {Object} A signal with attributes `on` and `call`.
 */
export function makeSignal () {
  const res = { _onFns: [] }
  res.on = fn => {
    if (!isFunction(fn)) {
      throw new Error('First argument to "on" must be a function')
    }
    res._onFns = [ ...res._onFns, fn ]
  }
  res.call = (...args) => res._onFns.map(fn => fn(...args))
  return res
}

/**
 * Create an object that with `on/onEach` and `call` attributes.
 * @param {Boolean} isCollection -
 * @return {Object}
 */
export function makeOneSignalAPI (isCollection) {
  // make a `_callFn` function that will be replaced later and is the target of
  // `call`
  const res = { _callFns: [] }
  // call will run all functions in `_callFns`
  res.call = (...args) => {
    if (args.length > 1 || !isObject(args[0])) {
      throw new Error('Call only accepts a single object as argument.')
    }
    res._callFns.map(({ fn }) => fn(args[0]))
  }
  // store callbacks passed with `on` or `onEach`
  res._onFns = []
  const onName = isCollection ? 'onEach' : 'on'
  res[onName] = fn => {
    if (!isFunction(fn)) {
      throw new Error('Argument to "' + onName + '" must be a function')
    }
    res._onFns.push(index => (...args) => {
      if (args.length > 1 || !isObject(args[0])) {
        throw new Error('On function only accepts a single object as argument.')
      }
      const argObject = ( typeof index === 'string' ? { k: index, ...args[0] } :
                          (typeof index === 'number' ? { i: index, ...args[0] } :
                           args[0]))
      fn(argObject)
    })
  }
  return res
}

/**
 * Implement the signals API.
 */
function makeSignalsAPI (signalNames, isCollection) {
  return fromPairs(signalNames.map(name => {
    return [ name, makeOneSignalAPI(isCollection) ]
  }))
}

/**
 * Implement the childSignals API.
 */
export function makeChildSignalsAPI (model) {
  return match(
    model,
    {
      [OBJECT_OF]: node => makeSignalsAPI(node.component.signalNames, true),
      [ARRAY_OF]:  node => makeSignalsAPI(node.component.signalNames, true),
      [COMPONENT]: node => makeSignalsAPI(node.signalNames, false),
      [ARRAY]: ar => ar.map(makeChildSignalsAPI).filter(notNull),
      [OBJECT]: obj => filterValues(mapValues(obj, makeChildSignalsAPI), notNull),
    },
    constant(null)
  )
}

/**
 * Reduce the direct children of the tree.
 * @param {Object} node - A node in a tree.
 * @param {Function} fn - Function with arguments (accum, object).
 * @param {*} init - An initial value.
 * @param {Array} address - The local address.
 * @return {*}
 */
export function reduceChildren (node, fn, init, address = []) {
  return match(node, {
    [NODE]: node => fn(init, node.data, address),
    [ARRAY]: ar => {
      return ar.reduce((accum, n, k) => {
        return reduceChildren(n, fn, accum, addressWith(address, k))
      }, init)
    },
    [OBJECT]: obj => {
      return reduceValues(obj, (accum, n, k) => {
        return reduceChildren(n, fn, accum, addressWith(address, k))
      }, init)
    },
  }, constant(init))
}

/**
 * Run signalSetup with the component.
 * @param {Object} component -
 * @param {Array} address -
 * @param {Object} stateCallers -
 * @return {Object} Object with keys signalsAPI and childSignalsAPI.
 */
function runSignalSetup (component, address, stateCallers) {
  const signalsAPI = makeSignalsAPI(component.signalNames, false)
  const childSignalsAPI = makeChildSignalsAPI(component.model)
  const reducers = patchReducers(address, component, stateCallers.callReducer)
  const signals = patchSignals(address, component, stateCallers.callSignal)
  const methods = patchMethods(address, component, stateCallers.callMethod,
                               reducers, signals)
  // cannot call signalSetup any earlier because it needs a reference to
  // `methods`, which must know the address
  component.signalSetup({
    methods,
    reducers,
    signals: signalsAPI,
    childSignals: childSignalsAPI,
  })
  return { signalsAPI, childSignalsAPI }
}

/**
 * Merge a signals object with signal callbacks from signalSetup.
 * @param {Object} node - A model node.
 * @param {Array} address - The address.
 * @param {Object} diffNode - A node in the diff tree.
 * @param {Object|null} signalNode - A node in the existing signals tree.
 * @param {Object} stateCallers - The object with 3 functions to modify global
 *                                state.
 * @param {Object|null} upChild - The childSignalsAPI object for the parent
 *                                Component.
 * @param {Array|null} upAddress - A local address specifying the location
 *                                 relative to the parent Component.
 * @return {Object} The new signals tree.
 */
export function mergeSignals (node, address, diffNode, signalNode, stateCallers,
                              upChild = null, upAddress = null) {
  const updateRecurse = ([ d, s ], k) => {
    const component = k !== null ? node.component : node
    const newAddress = k !== null ? addressWith(address, k) : address
    const diffVal = d.data
    if (diffVal === CREATE) {
      // For create, apply the callbacks
      const { signalsAPI, childSignalsAPI } = runSignalSetup(component,
                                                             newAddress,
                                                             stateCallers)
      const newUpAddress = upAddress === null ? null : addressWith(upAddress, k)
      const signals = mapValues(
        zipObjects([ signalsAPI, upChild ]),
        ([ callbackObj, upCallbackObj ], key) => {
          const signal = makeSignal()

          // For each callback, add each onFn to the signal,
          // and set the callFn to the signal dispatch. Only
          // on, not onEach, so execute the fn with no
          // argument.
          callbackObj._onFns.map(fn => signal.on(fn()))
          callbackObj._callFns = [ { fn: signal.call, address: null } ]

          // For the childSignalCallbacks from the parent
          if (upCallbackObj !== null) {
            upCallbackObj._onFns.map(fn => signal.on(fn(k)))
            upCallbackObj._callFns = [
              ...upCallbackObj._callFns,
              { fn: signal.call, address: newUpAddress }
            ]
          }

          return signal
        }
      )
      const data = { signals, signalsAPI, childSignalsAPI }

      // loop through the children of signals and node
      const children = mergeSignals(component.model, newAddress, d.children,
                                    get(s, 'children'), stateCallers,
                                    childSignalsAPI, [])

      return tagType(NODE, { data, children })
    } else if (diffVal === DESTROY) {
      // In the case of destroy, this leaf in the signals object will be null.
      return null
    } else {
      // update
      const { hasCreated, destroyed } = reduceChildren(
        d.children, (accum, diffVal, address) => {
          const hasCreated = accum.hasCreated || diffVal === CREATE
          const destroyed = (diffVal === DESTROY ?
                             [ ...accum.destroyed, address ] :
                             accum.destroyed)
          return { hasCreated, destroyed }
        }, { hasCreated: false, destroyed: [] }
      )

      // if there are deleted children, delete references to them
      destroyed.map(childAddress => {
        // get the right child within childSignalsAPI
        const childSignalsAPINode = childAddress.reduce((accum, k, i) => {
          if (k in accum) {
            return accum[k]
          } else if (i === childAddress.length - 1) {
            return accum
          } else {
            throw new Error('Bad address ' + childAddress + ' for object ' +
                            s.data.childSignalsAPI)
          }
        }, s.data.childSignalsAPI)
        mapValues(childSignalsAPINode, obj => {
          // remove the matching callFns
          obj._callFns = obj._callFns.filter(({ address }) => {
            return !addressEqual(address, childAddress)
          })
        })
      })

      const newUpChild = hasCreated ? s.data.childSignalsAPI : null
      const newUpAddress = hasCreated ? [] : null
      const children = mergeSignals(component.model, newAddress, d.children,
                                    s.children, stateCallers,
                                    newUpChild, newUpAddress)
      return tagType(NODE, { data: s.data, children })
    }
  }

  const recurse = ([ n, d, s, u ], k) => {
    const newAddress = addressWith(address, k)
    const newUpAddress = upAddress === null ? null : addressWith(upAddress, k)
    return mergeSignals(n, newAddress, d, s, stateCallers, u, newUpAddress)
  }

  return match(node, {
    [OBJECT_OF]: objOf => {
      return filterValues(mapValues(zipObjects([ diffNode, signalNode ]), updateRecurse), notNull)
    },
    [ARRAY_OF]: arOf => {
      return zipArrays([ diffNode, signalNode ]).map(updateRecurse).filter(notNull)
    },
    [COMPONENT]: component => updateRecurse([ diffNode, signalNode ], null),
    [ARRAY]: ar => zipArrays([ ar, diffNode, signalNode, upChild ]).map(recurse),
    [OBJECT]: obj => mapValues(zipObjects([ obj, diffNode, signalNode, upChild ]), recurse),
  }, constant(null))
}

// -------------------------------------------------------------------
// Component & run functions
// -------------------------------------------------------------------

/**
 * Create an object representing many instances of this component, for use in a
 * tinier model.
 * @param {Object} component - Tinier component.
 * @return {Object}
 */
export function objectOf (component) {
  return tagType(OBJECT_OF, { component })
}

/**
 * Create an array representing many instances of this component, for use in a
 * tinier model.
 * @param {Object} component - Tinier component.
 * @return {Object}
 */
export function arrayOf (component) {
  return tagType(ARRAY_OF, { component })
}

function defaultShouldUpdate ({ state, lastState }) {
  return state !== lastState
}

/**
 * Create a tinier component.
 * @param {Object} componentArgs - Functions defining the Tinier component.
 * @param {str} componentArgs.displayName - A name for the component.
 * @param {[str]} componentArgs.signals - An array of signal names.
 * @param {Object} componentArgs.model - The model object.
 * @param {Function} componentArgs.init - A function to initialize the state.
 * @param {Object} componentArgs.reducers -
 * @param {Object} componentArgs.methods -
 * @param {Function} componentArgs.willMount -
 * @param {Function} componentArgs.didMount -
 * @param {Function} componentArgs.shouldUpdate - Return true if the component
 *                                                should update, false if it
 *                                                should not, or null to use to
 *                                                default behavior (update when
 *                                                state changes).
 * @param {Function} componentArgs.willUpdate -
 * @param {Function} componentArgs.didUpdate -
 * @param {Function} componentArgs.willUnmount -
 * @param {Function} componentArgs.render -
 * @returns {Object} A tinier component.
 */
export function createComponent (options = {}) {
  // default attributes
  const defaults = {
    displayName:  '',
    signalNames:  [],
    signalSetup:  noop,
    model:        {},
    init:         constant({}),
    reducers:     {},
    methods:      {},
    willMount:    noop,
    didMount:     noop,
    shouldUpdate: defaultShouldUpdate,
    willUpdate:   noop,
    didUpdate:    noop,
    willUnmount:  noop,
    render:       noop,
  }
  // check inputs
  mapValues(options, (_, k) => {
    if (!(k in defaults)) {
      console.error('Unexpected argument ' + k)
    }
  })
  // check model
  if (options.model && checkType(COMPONENT, options.model)) {
    throw new Error('The model cannot be another Component. The top level of ' +
                    'the model should be an array or an object literal')
  }
  // set defaults & tag
  return tagType(COMPONENT, { ...defaults, ...options })
}

function patchReducers (address, component, callReducer) {
  return mapValues(component.reducers, (reducer, name) => {
    return function (arg) {
      callReducer(address, component, reducer, arg, name)
    }
  })
}

function patchSignals (address, component, callSignal) {
  return fromPairs(component.signalNames.map(signalName => {
    return [
      signalName,
      { call: arg => callSignal(address, signalName, arg) }
    ]
  }))
}

/**
 * Return an object of functions that call the methods with component-specific
 * arguments.
 */
export function patchMethods (address, component, callMethod, reducers, signals) {
  const methods = mapValues(component.methods, method => {
    return function (arg) {
      if (typeof Event !== 'undefined' && arg instanceof Event) {
        callMethod(address, method, signals, methods, reducers, this, arg, {})
      } else {
        callMethod(address, method, signals, methods, reducers, null, null, arg)
      }
    }
  })
  return methods
}

export function makeCallMethod (stateTree, opts) {
  /**
   * Call a method on the local stateTree
   * @param address
   * @param method
   * @param signals
   * @param methods - Patched method functions.
   * @param reducers - Patched reducer functions.
   * @param target - The value of this in the called function.
   * @param event - The event at the time of the function call.
   * @param arg - An argument object.
   */
  return (address, method, signals, methods, reducers, target, event, arg) => {
    // check for uninitialized stateTree
    if (stateTree.get([]) === null) {
      throw new Error('Cannot call method before the app is initialized (e.g. ' +
                      'in signalSetup).')
    }
    // get the local state
    const localState = stateTree.get(address)
    // run the method
    method({ state: localState, signals, methods, reducers, target, event,
             ...arg })
  }
}

/**
 * Return a callSignal function.
 */
function makeCallSignal (signals, opts) {
  return (address, signalName, arg) => {
    if (opts.verbose) {
      console.log('Called signal ' + signalName + ' at [' + address.join(', ') +
                  '].')
    }
    signals.get(address).data.signals[signalName].call(arg)
  }
}

/**
 * Return a new callReducer function.
 * @param {Object} topComponent - The top-level component.
 * @param {Object} stateTree - The global stateTree.
 * @param {Object} bindingTree - The global bindingTree.
 * @param {Object} signalTree - The global signalTree.
 * @param {Object} stateCallers - An object with functions callMethod,
 *                                callSignal, and callReducer.
 * @param {Object} opts - Options from `run`.
 * @returns {Function} - Call a reducer on the local state
 *   @param {Array} address - A location, as an array of keys (strings and
 *                            integers).
 *   @param {Object} triggeringComponent -
 *   @param {Function} reducer - A reducer.
 *   @param {Object} arg - An argument object.
 *   @param {String} name - The name of the reducer (for logging).
 */
export function makeCallReducer (topComponent, stateTree, bindingTree,
                                 signalTree, stateCallers, opts) {
  return (address, triggeringComponent, reducer, arg, name) => {
    if (!isFunction(reducer)) {
      throw new Error('Reducer ' + name + ' is not a function')
    }
    // Run the reducer, and optionally log the result.
    const localState = stateTree.get(address)
    const newLocalState = reducer({ ...arg, state: localState })
    if (opts.verbose) {
      console.log('Called reducer ' + name + ' for ' +
                  triggeringComponent.displayName + ' at [' + address.join(', ')
                  + '].')
      console.log(localState)
      console.log(newLocalState)
    }

    // Check that the new state is valid. If not, throw an Error, and the new
    // state will be thrown out.
    checkState(triggeringComponent.model, newLocalState)

    // Set the state with immutable objects and arrays. A reference to oldState
    // will used for diffing.
    const lastState = stateTree.get([])
    stateTree.set(address, newLocalState)

    // Run diffWithModelMin, which will do a few things:
    // 1. Run shouldUpdate for every component in the tree.
    // 2. Return the information about the minimal tree to update with
    //    updateComponents (whenever shouldUpdate is true) as minUpdate.
    // 3. Return the information about the minimal tree to update with
    //    mergeSignals (whenever nodes are added or deleted) as minSignals.
    // The output objects have the attributes diff, modelNode, and address.
    // TODO might be best to go back to returning just one full diff here
    const { minSignals, minUpdate } = diffWithModelMin(topComponent,
                                                       stateTree.get([]),
                                                       lastState, [], address)

    // Update the signals.
    const localSignals = signalTree.get(minSignals.address)
    const newSignals = mergeSignals(minSignals.modelNode, minSignals.address,
                                    minSignals.diff, localSignals, stateCallers)
    signalTree.set(minSignals.address, newSignals)

    // Update the components.
    const minUpdateBindings = bindingTree.get(minUpdate.address)
    const minUpdateEl = minUpdateBindings.data
    const minUpdateState = stateTree.get(minUpdate.address)
    const newBindings = updateComponents(minUpdate.address, minUpdate.modelNode,
                                         minUpdateState, minUpdate.diff,
                                         minUpdateBindings, minUpdateEl,
                                         stateCallers, opts)
    bindingTree.set(minUpdate.address, newBindings)
  }
}

/**
 * Return an object with functions callMethod, callSignal, and callReducer.
 * @param {Object} component - The top-level component.
 * @param {Object} stateTree - The global stateTree.
 * @param {Object} bindingTree - The global bindings.
 * @param {Object} signalTree - The global signalTree.
 * @return {Object} An object with functions callMethod, callSignal, and
 *                  callReducer.
 */
export function makeStateCallers (component, stateTree, bindingTree,
                                  signalTree, opts) {
  const stateCallers = {}
  stateCallers.callMethod = makeCallMethod(stateTree, opts)
  stateCallers.callSignal = makeCallSignal(signalTree, opts)
  stateCallers.callReducer = makeCallReducer(component, stateTree, bindingTree,
                                             signalTree, stateCallers, opts)
  return stateCallers
}

/**
 * Run a tinier component.
 * @param {Object} component - A tinier component.
 * @param {*} appEl - An element to pass to the component's create, update, and
 *                    destroy methods.
 * @param {Object|null} initialState - The initial state. If null, then init()
 *                                     will be called to initialize the state.
 * @return {Object} The API functions, incuding getState, signals, and methods.
 */
export function run (component, appEl, opts = {}) {
  // Create variables that will store the state for the whole lifetime of the
  // application. Similar to the redux model.
  let stateTree    = makeTree(null, false)
  const topBinding = tagType(NODE, { data: appEl, children: null })
  let bindingTree = makeTree(topBinding, true)
  let signalTree  = makeTree(null, true)

  // functions that access state, signals, and bindings
  const stateCallers = makeStateCallers(component, stateTree, bindingTree,
                                        signalTree, opts)

  // first draw
  const initReducer = () => {
    return 'initialState' in opts ? opts.initialState : component.init()
  }
  stateCallers.callReducer([], component, initReducer, {})

  // return API
  const reducers = patchReducers([], component, stateCallers.callReducer)
  const signalsCall = patchSignals([], component, stateCallers.callSignal)
  const methods = patchMethods([], component, stateCallers.callMethod, reducers,
                               signalsCall)
  return {
    getState: () => stateTree.get([]),
    signals: signalTree.get([]).data.signals,
    methods,
    reducers,
  }
}
