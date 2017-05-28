/** @module tinier */

// constants
export const ARRAY_OF    = '@TINIER_ARRAY_OF'
export const OBJECT_OF   = '@TINIER_OBJECT_OF'
export const COMPONENT   = '@TINIER_COMPONENT'
export const INSTANCE    = '@TINIER_INSTANCE'
export const ARRAY       = '@TINIER_ARRAY'
export const OBJECT      = '@TINIER_OBJECT'
export const NODE        = '@TINIER_NODE'
export const NULL        = '@TINIER_NULL'
export const STRING      = '@TINIER_STRING'
export const NUMBER      = '@TINIER_NUMBER'
export const BOOLEAN     = '@TINIER_BOOLEAN'
export const ANY         = '@TINIER_ANY'
export const NO_ARGUMENT = '@TINIER_NO_ARGUMENT'
export const TOP         = '@TINIER_TOP'
export const CREATE      = '@TINIER_CREATE'
export const UPDATE      = '@TINIER_UPDATE'
export const DESTROY     = '@TINIER_DESTROY'
export const BINDING     = '@TINIER_BINDING'
export const BINDINGS    = '@TINIER_BINDINGS'
export const ELEMENT     = '@TINIER_ELEMENT'
const LISTENER_OBJECT    = '@TINIER_LISTENERS'

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

export function fromPairs (pairs) {
  return pairs.reduce((accum, [ key, val ]) => {
    return { ...accum, [key]: val }
  }, {})
}

/**
 * Get the property of the object or index of the array, or return null.
 * @param {Object|Array} object - An object or array.
 * @param {String} property - An property of the object.
 * @return {*} The value of the property or, if not present, null.
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

export function isNumber (v) {
  return typeof v === 'number'
}

export function isBoolean (v) {
  return typeof v === 'boolean'
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
  for (let key in object) {
    const value = object[key]
    if (fn(value, key)) out[key] = value
  }
  return out
}

/**
 * Lazy any function.
 * @param {[Boolean]}
 * @return {Boolean}
 */
export function any (ar) {
  for (let i = 0, l = ar.length; i < l; i++) {
    const val = ar[i]
    if (!isBoolean(val)) {
      throw new Error('Not a boolean: ' + val)
    }
    if (val) {
      return true
    }
  }
  return false
}

/**
 * Defers calling fn until the current process finishes.
 */
function defer (fn) {
  setTimeout(fn, 1)
}

/**
 * Adds a tag to the object.
 * TODO Do this inline for performance.
 */
export function tagType (type, obj) {
  if (!isString(type)) {
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
export function match (object, fns, defaultFn = null, ...args) {
  if (defaultFn === null) {
    defaultFn = throwUnrecognizedType
  }
  for (let key in fns) {
    if ((key === NULL   && object === null ) ||
        (key === ARRAY  && isArray(object) ) ||
        (isObject(object) && checkType(key, object))) {
      return fns[key](object, ...args)
    }
  }
  if (OBJECT in fns && isObject(object)) {
    return fns[OBJECT](object, ...args)
  }
  return defaultFn(object, ...args)
}

function throwUnrecognizedType (node) {
  throw new Error('Unrecognized type in pattern matching: ' + node)
}

// -------------------------------------------------------------------
// Update components
// -------------------------------------------------------------------

const match_hasChildren = {
  [ARRAY_OF]: () => true,
  [OBJECT_OF]: () => true,
  [COMPONENT]: () => true,
  [ARRAY]: node => any(node.map(hasChildren)),
  [OBJECT]: node => any(Object.keys(node).map(k => hasChildren(node[k]))),
}

/**
 * Determine whether the model has any child components.
 * @param {Object} A node.
 * @return {Boolean} True if the node has any children.
 */
export function hasChildren (node) {
  return match(node, match_hasChildren)
}

/**
 * Convert string, number, or array to hashable string.
 * @param {String|Number|Array} input
 * @return {String} Hashable string.
 */
export function makeBindingKey (input) {
  if (isArray(input)) {
    // Separate with , and escape commas
    return input
      .map(x => String(x).replace(',', '\\,').replace(/\\$/, '\\\\'))
      .join(',')
  } else {
    return String(input)
  }
}

/**
 * Check the result of render against the model and state.
 * @param {Object} node - A model node.
 * @param {*} state - A state node.
 * @param {Object} bindings - The new bindings returned by render.
 * @return {Object} The render result object.
 */
export function processBindings (bindings) {
  const renderResult = {}
  for (let i = 0, l = bindings.data.length; i < l; i++) {
    const thisBinding = bindings.data[i]
    renderResult[makeBindingKey(thisBinding[0])] = thisBinding[1]
  }
  return renderResult
}

/**
 *
 */
function runAndProcessRender (shouldUpdate, component, arg) {
  if (shouldUpdate) {
    const res = component.render(arg)
    if (res == null) {
      // Render might return null or undefined if there are no children
      return null
    } else if (checkType(BINDINGS, res)) {
      return processBindings(res)
    } else if (isArray(res)) {
      return processBindings(render(arg.el, ...res))
    } else {
      return processBindings(render(arg.el, res))
    }
  } else {
    return null
  }
}

/**
 * Run lifecycle functions for the component.
 * @param {Array} address -
 * @param {Object} component -
 * @param {Object} state -
 * @param {Object} diffVal -
 * @param {Object|null} lastRenderedEl - The element rendered in previously, if
 *                                       there was one.
 * @param {Object} renderResult - The bindings lookup object.
 * @param {Array} relativeAddress - The address relative to the parent
 *                                  component.
 * @param {Object} stateCallers -
 * @return {Object}
 */
export function updateEl (address, component, state, diffVal, lastRenderedEl,
                          el, stateCallers, opts) {
  // The object passed to lifecycle functions

  // TODO running these every time is inefficient. Replace lastRenderedEl with
  // lastRenderData, and store any calculated quantities (el, reducers, signals,
  // methods). When to trash the cache?
  const reducers = patchReducersWithState(address, component, stateCallers.callReducer)
  const signals = patchSignals(address, component, stateCallers.callSignal)
  const methods = patchMethods(address, component, stateCallers.callMethod,
                               reducers, signals)

  // Warn if the el is null
  if (el === null && !(diffVal === DESTROY) && component.render !== noop) {
    throw new Error('No binding provided for component ' + component.displayName
                    + ' at [' + address.join(', ') + '].')
  }

  const arg = { state, methods, reducers, signals, el, lastRenderedEl }

  if (diffVal === DESTROY) {
    // Destroy
    component.willUnmount(arg)
    return { renderResult: null, lastRenderedEl }
  } else {
    // Create or update
    const shouldUpdate = (diffVal === CREATE
                          || diffVal === UPDATE
                          || el !== lastRenderedEl)

    if (diffVal === CREATE) {
      component.willMount(arg)
    } else if (shouldUpdate) {
      component.willUpdate(arg)
    }

    if (opts.verbose && shouldUpdate) {
      console.log('Rendering ' + component.displayName + ' at [' +
                  address.join(', ') + '].')
    }

    const nextRenderResult = runAndProcessRender(shouldUpdate, component, arg)

    // Check result
    if (shouldUpdate
        && nextRenderResult === null
        && hasChildren(component.model)) {
      throw new Error('The render function of component ' +
                      component.displayName + ' did not return new bindings')
    }

    // These need to be asynchronous
    if (diffVal === CREATE && component.didMount !== noop) {
      defer(() => component.didMount(arg))
    } else if (shouldUpdate && component.didUpdate !== noop) {
      defer(() => component.didUpdate(arg))
    }

    // If the component rendered, then change lastEl
    return {
      renderResult: nextRenderResult,
      lastRenderedEl: shouldUpdate ? el : lastRenderedEl
    }
  }
}

const match_updateComponents = {
  [OBJECT_OF]: (objOf, diff, state, updateRecurse) => {
    return mapValues(zipObjects([ diff, state ]), updateRecurse)
  },
  [ARRAY_OF]: (arOf, diff, state, updateRecurse) => {
    return zipArrays([ diff, state ]).map(updateRecurse)
  },
  [COMPONENT]: (component, diff, state, updateRecurse) => {
    return updateRecurse([ diff, state ], null)
  },
  [ARRAY]: (ar, _, __, ___, recurse) => ar.map(recurse),
  [OBJECT]: (obj, _, __, ___, recurse) => mapValues(obj, recurse),
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
                           relativeAddress, stateCallers, opts) {
  // TODO pull these out to top level
  const updateRecurse = ([ d, s ], k) => {
    // TODO in updateRecurse functions where k can be null, there must be a
    // nicer way to organize things with fewer null checks
    const component = k !== null ? node.component : node
    const newAddress = k !== null ? addressWith(address, k) : address
    const newRelativeAddress = k !== null
          ? addressWith(relativeAddress, k)
          : relativeAddress
    const b = k !== null ? get(bindings, k) : bindings

    // Get binding el
    const lastRenderedEl = get(b, 'data')
    const el = renderResult !== null
          ? renderResult[makeBindingKey(newRelativeAddress)]
          : lastRenderedEl

    // Update the component. If DESTROY, then there will not be a binding.
    const res = updateEl(newAddress, component, s, d.data, lastRenderedEl, el,
                         stateCallers, opts)
    // Fall back on old bindings.
    const nextRenderResult = res.renderResult !== null
          ? res.renderResult
          : null
    // Update children
    const children = updateComponents(newAddress, component.model, s,
                                      d.children, get(b, 'children'),
                                      nextRenderResult, [], stateCallers, opts)
    return tagType(NODE, { data: el, children })
  }

  // TODO pull these out to top level
  const recurse = (n, k) => {
    return updateComponents(addressWith(address, k), n, get(state, k), diff[k],
                            get(bindings, k), renderResult,
                            addressWith(relativeAddress, k), stateCallers, opts)
  }

  return match(node, match_updateComponents, null, diff, state, updateRecurse,
               recurse)
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
 * Determine whether to update, create, destroy, or do nothing for a new state
 * and old state. Also run shouldUpdate to potentially ignore the update.
 */
function computeDiffValue (state, lastState, shouldUpdate, address,
                           triggeringAddress) {
  if (state !== null && lastState === null) {
    return CREATE
  } else if (state !== null && lastState !== null) {
    const shouldUpdateRes = shouldUpdate({
      state,
      lastState,
      componentTriggeredUpdate: addressEqual(address, triggeringAddress),
    })
    if (state !== lastState && shouldUpdateRes) {
      return UPDATE
    } else {
      // Do nothing
      return null
    }
  } else if (state === null && lastState !== null) {
    return DESTROY
  }
  // Both old and new state null, then doing nothing
  return null
}

const match_diffTree = {
  [INSTANCE]: (instance, last, address, triggeringAddress) => {
    const state = instance.state
    const shouldUpdate = instance.component.shouldUpdate
    const lastState = get(last, 'state')
    const data = computeDiffValue(state, lastState, shouldUpdate, address,
                                  triggeringAddress)
    // LEFTOFF TODO stop diffing if not necessary. E.g. if deleted the tree
    const children = diffTree(state, lastState, address, triggeringAddress)
    return { type: NODE, data, children }
  },
  [ARRAY]: (ar, last, address, triggeringAddress) => {
    return ar.map((n, i) => {
      return diffTree(n, get(last, i), addressWith(address, i),
                      triggeringAddress)
    })
  },
  [OBJECT]: (obj, last, address, triggeringAddress) => {
    return mapValues(obj, (n, k) => {
      return diffTree(n, get(last, k), addressWith(address, k),
                      triggeringAddress)
    })
  },
}

/**
 * Compute the full diff tree for the model node. Calls shouldUpdate.
 */
function diffTree (state, lastState, address, triggeringAddress) {
  return match(state, match_diffTree, constant(null), lastState, address,
               triggeringAddress)
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
 * @param {Object} state - The new state corresponding to modelNode.
 * @param {Object|null} lastState - The old state corresponding to modelNode.
 * @param {Array} address -
 * @param {Array} triggeringAddress -
 * @returns {Object} An object with the attributes minSignals and
 *                   minUpdate. Each represents a minimal tree necessary for the
 *                   appropriate update function and has the attributes diff,
 *                   modelNode, and address.
 */
export function diffMin (state, lastState, address, triggeringAddress) {
  // Calculate whole diff tree
  const diff = diffTree(state, lastState, address, triggeringAddress)
  // TODO Trim the tree for the two needs, if it's clear that there is a
  // performance benefit
  return {
    minSignals: { diff, address },
    minUpdate: { diff, address },
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

const match_makeChildSignalsAPI = {
  [OBJECT_OF]: node => makeSignalsAPI(node.component.signalNames, true),
  [ARRAY_OF]:  node => makeSignalsAPI(node.component.signalNames, true),
  [COMPONENT]: node => makeSignalsAPI(node.signalNames, false),
  [ARRAY]: ar => ar.map(makeChildSignalsAPI).filter(notNull),
  [OBJECT]: obj => filterValues(mapValues(obj, makeChildSignalsAPI), notNull),
}

/**
 * Implement the childSignals API.
 */
export function makeChildSignalsAPI (model) {
  return match(model, match_makeChildSignalsAPI, constant(null))
}

const match_reduceChildren = {
  [NODE]: (node, fn, init, address) => fn(init, node.data, address),
  [ARRAY]: (ar, fn, init, address) => {
    return ar.reduce((accum, n, k) => {
      return reduceChildren(n, fn, accum, addressWith(address, k))
    }, init)
  },
  [OBJECT]: (obj, fn, init, address) => {
    return reduceValues(obj, (accum, n, k) => {
      return reduceChildren(n, fn, accum, addressWith(address, k))
    }, init)
  },
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
  return match(node, match_reduceChildren, constant(init), fn, init, address)
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
  const reducers = patchReducersWithState(address, component, stateCallers.callReducer)
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

const match_mergeSignals = {
  [OBJECT_OF]: (objOf, diffNode, signalNode, updateRecurse) => {
    return filterValues(mapValues(zipObjects([ diffNode, signalNode ]), updateRecurse), notNull)
  },
  [ARRAY_OF]: (arOf, diffNode, signalNode, updateRecurse) => {
    return zipArrays([ diffNode, signalNode ]).map(updateRecurse).filter(notNull)
  },
  [COMPONENT]: (component, diffNode, signalNode, updateRecurse) => {
    return updateRecurse([ diffNode, signalNode ], null)
  },
  [ARRAY]: (ar, diffNode, signalNode, _, upChild, recurse) => {
    return zipArrays([ ar, diffNode, signalNode, upChild ]).map(recurse)
  },
  [OBJECT]: (obj, diffNode, signalNode, _, upChild, recurse) => {
    return mapValues(zipObjects([ obj, diffNode, signalNode, upChild ]), recurse)
  },
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

  // TODO pull these out to top level
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
      // Update
      const { hasCreated, destroyed } = reduceChildren(
        d.children, (accum, diffVal, address) => {
          const hasCreated = accum.hasCreated || diffVal === CREATE
          const destroyed = (diffVal === DESTROY ?
                             [ ...accum.destroyed, address ] :
                             accum.destroyed)
          return { hasCreated, destroyed }
        }, { hasCreated: false, destroyed: [] }
      )

      // If there are deleted children, delete references to them
      destroyed.map(childAddress => {
        // Get the right child within childSignalsAPI
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
          // Remove the matching callFns
          obj._callFns = obj._callFns.filter(({ address }) => {
            return !addressEqual(address, childAddress)
          })
        })
      })

      const newUpChild = hasCreated ? s.data.childSignalsAPI : null
      const newUpAddress = hasCreated ? [] : null
      const children = mergeSignals(component.model, newAddress, d.children,
                                    get(s, 'children'), stateCallers,
                                    newUpChild, newUpAddress)
      return tagType(NODE, { data: get(s, 'data'), children })
    }
  }

  // TODO pull these out to top level
  const recurse = ([ n, d, s, u ], k) => {
    const newAddress = addressWith(address, k)
    const newUpAddress = upAddress === null ? null : addressWith(upAddress, k)
    return mergeSignals(n, newAddress, d, s, stateCallers, u, newUpAddress)
  }

  return match(node, match_mergeSignals, constant(null), diffNode, signalNode,
               updateRecurse, upChild, recurse)
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

function checkInputs (options, defaults) {
  mapValues(options, (_, k) => {
    if (!(k in defaults)) {
      console.error('Unexpected argument ' + k)
    }
  })
}

function patchInitNoArg (init) {
  return (...args) => {
    if (args.length === 0) {
      return init({})
    } else if (args.length > 1 || !isObject(args[0])) {
      throw new Error('Init function can only take 1 or 0 arguments, and the ' +
                      'argument should be an object.')
    } else {
      return init(args[0])
    }
  }
}

function patchReducersOneArg (reducers) {
  return mapValues(reducers, (reducer, name) => {
    return (...args) => {
      if (args.length !== 1 || !isObject(args[0])) {
        throw new Error('Reducers can only take 1 arguments, and the ' +
                        'argument should be an object.')
      } else if (!('state' in args[0])) {
        throw new Error('The argument to the reducer must have a "state" ' +
                        'attribute.')
      } else {
        return reducer(args[0])
      }
    }
  })
}

// default attributes
const component_defaults = {
  displayName:  '',
  signalNames:  [],
  signalSetup:  noop,
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
  // Check inputs
  checkInputs(options, component_defaults)

  // TODO move these checks later so that a Component can be modified on the
  // fly, e.g. `component.reducers.myReducer = ...`.
  // if ('reducers' in options) {
  //   options.reducersRaw = options.reducers
  //   options.reducers = patchReducersOneArg(options.reducers)
  // }

  // Create component object. A Component called as a function invokes init and
  // returns an Instance.
  const component = (...args) => ({
    type: INSTANCE,
    state: component.init(...args),
    component: component
  })
  component.type = COMPONENT
  for (let key in component_defaults) {
    component[key] = key in options ? options[key] : component_defaults[key]
  }
  return component
}

function patchReducersWithState (address, component, callReducer) {
  return mapValues(component.reducersRaw, (reducer, name) => {
    return function (...args) {
      if (args.length === 0) {
        callReducer(address, component, reducer, {}, name)
      } else if (args.length > 1 || !isObject(args[0])) {
        throw new Error('Reducers can only take 1 or 0 arguments, and the ' +
                        'argument should be an object.')
      } else {
        callReducer(address, component, reducer, args[0], name)
      }
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
export function makeCallReducer (stateTree, bindingTree, signalTree,
                                 stateCallers, opts) {
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

    // Set the state with immutable objects and arrays. A reference to oldState
    // will used for diffing.
    const lastState = stateTree.get([])
    stateTree.set(address, newLocalState)

    // Run diffMin, which will do a few things:
    // 1. Run shouldUpdate for every component in the tree.
    // 2. Return the information about the minimal tree to update with
    //    updateComponents (whenever shouldUpdate is true) as minUpdate.
    // 3. Return the information about the minimal tree to update with
    //    mergeSignals (whenever nodes are added or deleted) as minSignals.
    // The output objects have the attributes diff, modelNode, and address.
    // TODO might be best to go back to returning just one full diff here
    const { minSignals, minUpdate } = diffMin(stateTree.get([]), lastState, [], address)

    // Update the signals
    const localSignals = signalTree.get(minSignals.address)
    const newSignals = mergeSignals(minSignals.address, minSignals.diff,
                                    localSignals, stateCallers)
    signalTree.set(minSignals.address, newSignals)

    // Update the components
    const minUpdateBindings = bindingTree.get(minUpdate.address)
    const minUpdateEl = minUpdateBindings.data
    const minUpdateState = stateTree.get(minUpdate.address)
    const newBindings = updateComponents(minUpdate.address,
                                         minUpdateState, minUpdate.diff,
                                         minUpdateBindings,
                                         { relTop: minUpdateEl }, [ 'relTop' ],
                                         stateCallers, opts)
    bindingTree.set(minUpdate.address, newBindings)
  }
}

/**
 * Return an object with functions callMethod, callSignal, and callReducer.
 * @param {Object} stateTree - The global stateTree.
 * @param {Object} bindingTree - The global bindings.
 * @param {Object} signalTree - The global signalTree.
 * @return {Object} An object with functions callMethod, callSignal, and
 *                  callReducer.
 */
export function makeStateCallers (stateTree, bindingTree, signalTree, opts) {
  const stateCallers = {}
  stateCallers.callMethod = makeCallMethod(stateTree, opts)
  stateCallers.callSignal = makeCallSignal(signalTree, opts)
  stateCallers.callReducer = makeCallReducer(stateTree, bindingTree, signalTree,
                                             stateCallers, opts)
  return stateCallers
}

/**
 * Run Tinier.
 * @param {Object} instance - An evaluated Tinier Component, i.e. Instance. If a
 *                            Component is passed, it will be evaluate with no
 *                            arguments.
 * @param {*} appEl - An element to pass to the Component's create, update, and
 *                    destroy methods.
 * @param {Boolean} opts.verbose - If true, print messages.
 * @return {Object} The API functions, incuding getState, signals, and methods.
 */
export function run (instance, appEl, opts = {}) {
  // If a component was passed in, then evaluate.
  if (instance.type === 'COMPONENT') instance = instance()
  const component = instance.component

  // Create variables that will store the state for the whole lifetime of the
  // application. Similar to the redux model.
  const stateTree = makeTree(null, false)
  const topBinding = { type: NODE, data: appEl, children: null }
  const bindingTree = makeTree(topBinding, true)
  const signalTree = makeTree(null, true)

  // Functions that access state, signals, and bindings
  const stateCallers = makeStateCallers(stateTree, bindingTree, signalTree, opts)

  // First draw
  const setStateReducer = ({ newState }) => newState
  const setState = newState => {
    return stateCallers.callReducer([], instance, setStateReducer,
                                    { newState }, 'setState')
  }
  setState(instance.state)

  // Return API
  const getState = () => stateTree.get([])
  const reducers = patchReducersWithState([], instance, stateCallers.callReducer)
  const signalsCall = patchSignals([], instance, stateCallers.callSignal)
  const methods = patchMethods([], instance, stateCallers.callMethod, reducers,
                               signalsCall)
  // If state is null, then data will be null
  const signals = get(signalTree.get([]).data, 'signals')

  return { getState, reducers, methods, signals }
}

// -------------------------------------------------------------------
// DOM
// -------------------------------------------------------------------

function reverseObject (obj) {
  const newObj = {}
  for (let k in obj) {
    newObj[obj[k]] = k
  }
  return newObj
}

// some attribute renaming as seen in React
const ATTRIBUTE_RENAME = {}
const ATTRIBUTE_RENAME_REV = reverseObject(ATTRIBUTE_RENAME)
const ATTRIBUTE_APPLY = {
  checked: (el, name, val = false) => {
    if (name !== 'input') {
      throw new Error('"checked" attribute is only supported on input elements.')
    }
    el.checked = val
  },
  value: (el, name, val = false) => {
    if ([ 'input', 'textarea' ].indexOf(name) === -1) {
      throw new Error('"value" attribute is only supported on input and ' +
                      'textarea elements.')
    }
    el.value = val
  },
}

// namespace management inspired by of D3.js, Mike Bostock, BSD license
const NAMESPACES = {
  svg: 'http://www.w3.org/2000/svg',
  xhtml: 'http://www.w3.org/1999/xhtml',
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xmlns: 'http://www.w3.org/2000/xmlns/',
}

/**
 * Turn an array of objects into a new object of objects where the keys are
 * given by the value of `key` in each child object.
 * @param {[Object]} arr - The array of objects.
 * @param {String} key - The key to look for.
 */
function keyBy (arr, key) {
  var obj = {}
  arr.map(x => obj[x[key]] = x)
  return obj
}

// Make sure default is null so undefined type constant do not match
const isTinierBinding = obj => checkType(BINDING, obj)
const isTinierElement = obj => checkType(ELEMENT, obj)

/**
 * Returns true if it is a DOM element.
 * http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
 */
function isElement (o) {
  return (o && typeof o === 'object' && o !== null &&
          o.nodeType === 1 && typeof o.nodeName === 'string')
}

/**
 * Returns true if it is a DOM text element.
 */
function isText (o) {
  return (o && typeof o === 'object' && o !== null &&
          o.nodeType === 3 && typeof o.nodeName === 'string')
}

/**
 * Create a new TinierDOM element.
 * @param {String} tagName - The name for the element.
 * @param {Object|null} attributesIn - The attributes. Note that JSX will pass
 *                                     null in when there are no attributes. In
 *                                     the resulting object, this will be an
 *                                     empty object {}.
 * @param {Object[]|Object|String} ...children - A single binding or a mix of
 *                                               elements and strings.
 * @return {Object} A TinierDOM element.
 */
export function createElement (tagName, attributesIn, ...children) {
  const attributes = attributesIn == null ? {} : attributesIn
  return tagType(ELEMENT, { tagName, attributes, children })
}

/**
 * Create a new TinierDOM binding.
 * @param {Array|String|Number} address - An address array, single key, or index
 * @return {Object} A TinierDOM binding
 */
export function bind (address) {
  return { type: BINDING, data: address }
}

function explicitNamespace (name) {
  const i = name.indexOf(':')
  if (i !== -1) {
    const prefix = name.slice(0, i)
    if (prefix in NAMESPACES) {
      // for xmlns or xlink, treat the whole name (e.g. xmlns:xlink) as the name
      const newName = prefix === 'xmlns' || prefix === 'xlink'
            ? name
            : name.slice(i + 1)
      return { name: newName, explicit: NAMESPACES[prefix] }
    } else {
      return { name, explicit: null }
    }
  } else {
    return { name, explicit: null }
  }
}

/**
 * Create a DOM element, inheriting namespace or choosing one based on tag.
 * @param {Object} tinierEl - A TinierDOM element.
 * @param {Object} parent - The parent el.
 * @return {Object} The DOM element.
 */
export function createDOMElement (tinierEl, parent) {
  const tag = tinierEl.tagName
  const { name, explicit } = explicitNamespace(tag)
  const ns = (explicit !== null ? explicit :
              (tag in NAMESPACES ? NAMESPACES[tag] : parent.namespaceURI))
  const el = ns === NAMESPACES.xhtml
        ? document.createElement(name)
        : document.createElementNS(ns, name)
  return updateDOMElement(el, tinierEl)
}

export function getStyles (cssText) {
  const reg = /([^:; ]+):/g
  const res = []
  let ar
  while ((ar = reg.exec(cssText)) !== null) {
    res.push(ar[1])
  }
  return res
}

function toCamelCase (name) {
  return name
  // Uppercase the first character in each group immediately following a dash
    .replace(/-(.)/g, m => m.toUpperCase())
  // Remove dashes
    .replace(/-/g, '')
}

function stripOn (name) {
  return name.slice(2).toLowerCase()
}

function setAttributeCheckBool (namespace, el, name, val) {
  // set boolean appropriately
  const valToSet = val === true ? name : val
  if (namespace === NAMESPACES.xlink || namespace === NAMESPACES.xmlns) {
    el.setAttributeNS(namespace, name, valToSet)
  } else {
    el.setAttribute(name, valToSet)
  }
}

/**
 * Update the DOM element to match a TinierDOM element.
 * @param {Element} el - An existing DOM element.
 * @param {Object} tinierEl - A TinierDOM element.
 */
export function updateDOMElement (el, tinierEl) {
  let thenFn = null
  const parentNamespace = el.namespaceURI

  // remove event listeners first, because they cannot simply be replaced
  if (el.hasOwnProperty(LISTENER_OBJECT)) {
    mapValues(el[LISTENER_OBJECT], (onFn, name) => {
      el.removeEventListener(name, onFn)
    })
    delete el[LISTENER_OBJECT]
  }

  // Update the attributes.
  // TODO is it faster to check first, or set first?
  mapValues(tinierEl.attributes, (v, k) => {
    if (k === 'id') {
      // ID is set directly
      el.id = v
    } else if (k === 'style' && !isString(v)) {
      // For a style object. For a style string, use setAttribute below.
      mapValues(v, (sv, sk) => {
        el.style.setProperty(sk, sv)
      })
    } else if (k.indexOf('on') === 0) {
      // Special handling for listeners
      if (!el.hasOwnProperty(LISTENER_OBJECT)) {
        el[LISTENER_OBJECT] = {}
      }
      // allow null
      if (v !== null) {
        const name = stripOn(k)
        if (!isFunction(v) && v !== null) {
          throw new Error(v + ' is not a function.')
        }
        el[LISTENER_OBJECT][name] = v
        el.addEventListener(name, v)
      }
    } else if (k in ATTRIBUTE_RENAME) {
      // By default, set the attribute.
      const { name, explicit } = explicitNamespace(k)
      setAttributeCheckBool(explicit !== null ? explicit : parentNamespace,
                            el, ATTRIBUTE_RENAME[explicit], v)
    } else if (k in ATTRIBUTE_APPLY) {
      ATTRIBUTE_APPLY[k](el, tinierEl.tagName, v)

    } else if (k === 'then') {
      if (v !== null) {
        if (!isFunction(v)) {
          throw new Error(v + ' is not a function or null.')
        }
        thenFn = v
      }
    } else {
      // By default, set the attribute.
      const { name, explicit } = explicitNamespace(k)
      setAttributeCheckBool(explicit !== null ? explicit : parentNamespace,
                            el, name, v)
    }
  })
  // Delete attributes if not provided. First, loop through this attributes
  // object to get a nice array.
  let attributeNames = []
  for (let i = 0, l = el.attributes.length; i < l; i++) {
    attributeNames.push(el.attributes[i].name)
  }
  attributeNames
    .filter(k => !(k in tinierEl.attributes) || tinierEl.attributes[k] === false)
    .map(k => {
      if (k in ATTRIBUTE_RENAME_REV) {
        el.removeAttribute(ATTRIBUTE_RENAME_REV[k])
      } else if (k in ATTRIBUTE_APPLY) {
        ATTRIBUTE_APPLY[k](el, tinierEl.tagName)
      } else {
        el.removeAttribute(k)
      }
    })
  // Delete styles if not provided.
  const tStyle = tinierEl.attributes.style
  if (tStyle && !isString(tStyle)) {
    getStyles(el.style.cssText)
      .filter(a => !(a in tStyle || toCamelCase(a) in tStyle))
      .map(a => el.style.removeProperty(a))
  }

  // Call the callback
  if (thenFn) {
    defer(() => thenFn(el))
  }

  return el
}

/**
* flatten the elements array
*/
function flattenElementsAr (ar) {
  return ar.reduce((acc, el) => {
    return isArray(el) ? [ ...acc, ...el ] : [ ...acc, el ]
  }, []).filter(notNull) // null means ignore
}

function removeExtraNodes (container, length) {
  for (let i = container.childNodes.length - 1; i >= length; i--) {
    container.removeChild(container.childNodes[i])
  }
}

/**
 * Render the given element tree into the container.
 * @param {Element} container - A DOM element that will be the container for
 *                              the renedered element tree.
 * @param {...[Object|String]|Object|String} tinierElementsAr -
 *   Any number of TinierDOM elements or strings that will be rendered.
 * @return {Array} An array of bindings.
 */
export function renderRecurse (container, ...tinierElementsAr) {
  // check arguments
  if (!isElement(container)) {
    throw new Error('First argument must be a DOM Element.')
  }

  const tinierElements = flattenElementsAr(tinierElementsAr)

  // If it's just a binding, then return that. Otherwise, continue to
  // automatically create a div or g below.
  const first = get(tinierElements, 0)
  if (isTinierBinding(first) && tinierElements.length === 1) {
    return [ [ first.data, container ] ]
  }

  // get the children with IDs
  const childrenWithKeys = Array.from(container.children).filter(c => c.id)
  const elementsByID = keyBy(childrenWithKeys, 'id')

  // Render each element
  const bindings = tinierElements.map((tinierEl, i) => {
    // If an element if a binding, then there can only be one child.
    if (isUndefined(tinierEl)) {
      // Cannot be undefined
      throw new Error('Children in Tinier Elements cannot be undefined.')
    } else if (isTinierElement(tinierEl)) {
      // container.childNodes is a live collection, so get the current node at
      // this index.
      const el = container.childNodes[i]
      // tinierEl is a TinierDOM element.
      if (tinierEl.attributes.id in elementsByID) {
        // If el exist, then check for a matching node by ID
        const movedEl = elementsByID[tinierEl.attributes.id]
        if (el) {
          // If match and existing el, then replace the element
          container.replaceChild(movedEl, el)
        } else {
          // If match and el is undefined, then append the element
          container.appendChild(movedEl)
        }
        // Then render children
        return renderRecurse(movedEl, ...tinierEl.children)
      } else if (el) {
        // Both defined, check type and id
        if (el.tagName
            && el.tagName.toLowerCase() === tinierEl.tagName.toLowerCase()) {
          // Matching tag, then update the node to match. Be aware that existing
          // nodes with IDs might get moved, so we should clone them?
          const elToUpdate = el.id ? el.cloneNode(true) : el
          updateDOMElement(elToUpdate, tinierEl)
          if (el.id) container.replaceChild(elToUpdate, el)
          return renderRecurse(elToUpdate, ...tinierEl.children)
        } else {
          // not a matching tag, then replace the element with a new one
          const newEl = createDOMElement(tinierEl, container)
          container.replaceChild(newEl, el)
          return renderRecurse(newEl, ...tinierEl.children)
        }
      } else {
        // no el and no ID match, then add a new Element or string node
        const newEl2 = createDOMElement(tinierEl, container)
        container.appendChild(newEl2)
        return renderRecurse(newEl2, ...tinierEl.children)
      }
    } else if (isTinierBinding(tinierEl)) {
      // Automatically add a div or g for raw bindings
      const isSvg = container.namespaceURI === NAMESPACES.svg
      const newEl = createDOMElement(createElement(isSvg ? 'g' : 'div'),
                                     container)
      container.appendChild(newEl)
      return renderRecurse(newEl, tinierEl)
    } else {
      const el = container.childNodes[i]
      const s = String(tinierEl)
      // This should be a text node.
      if (isText(el)) {
        // If already a text node, then set the text content.
        el.textContent = s
      } else if (el) {
        // If not a text node, then replace it.
        container.replaceChild(document.createTextNode(s), el)
      } else {
        // If no existing node, then add a new one.
        container.appendChild(document.createTextNode(s))
      }
      // No binding here. TODO test for this case
      return null
    }
  }).reduce((acc, val) => [ ...acc, ...val ], [])

  // remove extra nodes
  // TODO This should not run if the child is a binding. Make a test for
  // this. When else should it not run?
  removeExtraNodes(container, tinierElements.length)

  return bindings.filter(x => x !== null)
}

/**
 * Render the given element tree into the container.
 * @param {Element} container - A DOM element that will be the container for
 *                              the renedered element tree.
 * @param {...[Object|String]|Object|String} tinierElementsAr -
 *   Any number of TinierDOM elements or strings that will be rendered.
 * @return {Object} A bindings object.
 */
export function render (container, ...tinierElementsAr) {
  const bindingsAr = renderRecurse(container, ...tinierElementsAr)
  return { type: BINDINGS, data: bindingsAr }
}

// Export API
export default { createComponent, run, bind, createElement, render }
