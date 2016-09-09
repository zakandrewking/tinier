/** @module tinier */

const VERBOSE = false

// constants
export const ARRAY_OF  = '@TINIER_ARRAY_OF'
export const OBJECT_OF = '@TINIER_OBJECT_OF'
export const COMPONENT = '@TINIER_COMPONENT'
export const ARRAY     = '@TINIER_ARRAY'
export const OBJECT    = '@TINIER_OBJECT'
export const NODE      = '@TINIER_NODE'
export const NULL      = '@TINIER_NULL'
export const TOP       = '@TINIER_TOP'
const FORCE_RENDER = '@TINIER_FORCE_RENDER'

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

function tail (array) {
  return [ array.slice(0, -1), last(array) ]
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

function isUndefined (object) {
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

/**
 * Check if the object is a function.
 * @param {*} object - The object to test.
 * @return {Boolean}
 */
export function isFunction (object) {
  return typeof(object) === 'function'
}

function notNull (val) {
  return val !== null
}

/**
 * Iterate over the keys and values of an object. Uses Object.keys to find
 * iterable keys.
 * @param {Object} obj - The input object.
 * @param {Function} fn - A function that takes the arguments (value, key).
 * @return {Object} A transformed object with values returned by the function.
 */
function mapValues (obj, fn) {
  return Object.keys(obj).reduce((c, v) => {
    return { ...c, [v]: fn(obj[v], v) }
  }, {})
}

/**
 * Use map for Array and mapValues for Object.
 * @param {Object} obj - The input object or array.
 * @param {Function} fn - A function that takes the arguments (value, key/index).
 * @return {Object} A transformed object/array with values returned by the
 *                  function.
 */
export function map (obj, fn) {
  return isArray(obj) ? obj.map(fn) : mapValues(obj, fn)
}

function reduceValues (obj, fn, init) {
  return Object.keys(obj).reduce((accum, k) => fn(accum, obj[k], k), init)
}

export function reduce (obj, fn, init) {
  return isArray(obj) ? obj.reduce(fn, init) : reduceValues(obj, fn, init)
}

function zipArrays (arrays) {
  const lenLongest = Math.max.apply(null, map(filter(arrays, x => x !== null),
                                              a => a.length))
  const res = []
  for (let i = 0; i < lenLongest; i++) {
    res.push(map(arrays, a => a !== null && i < a.length ? a[i] : null))
  }
  return res
}

function flatten (arrays) {
  return Array.prototype.concat(...arrays)
}

function zipObjects (objects) {
  const allKeys = flatten(map(filter(objects, x => x !== null), Object.keys))
  return fromPairs(map(allKeys, k => {
    return [ k, objects.map(o => o !== null && k in o ? o[k] : null) ]
  }))
}

export function zip (vals) {
  return isArray(get(vals, 0)) ? zipArrays(vals) : zipObjects(vals)
}

export function filterValues (object, fn) {
  const out = {}
  for (var key in object) {
    const value = object[key]
    if (fn(value, key)) out[key] = value
  }
  return out
}

export function filter (obj, fn) {
  return isArray(obj) ? obj.filter(fn) : filterValues(obj, fn)
}

// TODO make this lazy
function any (ar) {
  return ar.reduce((accum, val) => accum || val, false)
}

export function tagType (type, obj) {
  if (typeof type !== 'string') {
    throw new Error('First argument must be a string')
  }
  if (!isObject(obj)) {
    throw new Error('Second argument must be an object')
  }
  return { ...obj, type }
}

export function checkType (type, obj) {
  if (obj === null) {
    return type === NULL
  }
  if (typeof type !== 'string') {
    throw new Error('First argument must be a string')
  }
  if (!isObject(obj)) {
    throw new Error('Second argument must be an object or null')
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

/**
 * Run lifecycle functions for the component.
 * @param {Object} address -
 * @param {Object} component -
 * @param {Object} state -
 * @param {Object} diff -
 * @param {Object|nul} el - The element to render in, or null if a binding was
 *                          not provided or if needs_destroy.
 * @param {Object} stateCallers -
 * @return {Object}
 */
export function updateEl (address, component, state, diff, el, stateCallers) {
  // the object passed to lifecycle functions
  const reducers = patchReducers(address, component, stateCallers.callReducer)
  const signals = patchSignals(address, component, stateCallers.callSignal)
  const methods = patchMethods(address, component, stateCallers.callMethod,
                               reducers, signals)
  const arg = { state, methods, reducers, signals, el }

  // warn if the el is null
  if (el === null && !diff.needsDestroy && component.render !== noop) {
    console.warn('No binding provided for component ' + component.displayName +
                 ' at [' + address.join(', ') + '].')
  }

  if (diff.needsDestroy) {
    component.willUnmount(arg)
    return null
  }

  const shouldUpdateOut = component.shouldUpdate(arg)
  const shouldUpdate = diff.needsCreate ||
          ((shouldUpdateOut === null && diff.needsUpdate) || shouldUpdateOut)

  if      (diff.needsCreate) component.willMount(arg)
  else if (shouldUpdate) component.willUpdate(arg)

  if (VERBOSE && shouldUpdate) {
    console.log('Rendering ' + component.displayName + ' at [' +
                address.join(', ') + '].')
  }

  // render
  const bindings = shouldUpdate ? (component.render(arg) || null) : null
  // check result
  if (shouldUpdate && bindings === null && hasChildren(component.model)) {
    throw new Error('The render function of component ' + component.displayName +
                    ' did not return new bindings')
  }

  if      (diff.needsCreate) component.didMount(arg)
  else if (shouldUpdate) component.didUpdate(arg)

  return bindings
}

/**
 * Add the new userBindings to the tree at bindingsNode.
 * @param {Object} node - A model node.
 * @param {*} state - A state node.
 * @param {Object} userBindings - The new bindings returned by render.
 * @param {Object|null} bindingsNode - A node in the existing bindings tree.
 * @return {Object} The new node for the bindings tree.
 */
export function mergeBindings (node, state, userBindings, bindingsNode) {
  const updateRecurse = (s, k) => {
    const u = k === null ? userBindings : get(userBindings, k)
    if (userBindings !== null && u === null) {
      throw new Error('Shape of the bindings object does not match the model.' +
                      'Model: ' + node + '  Bindings object: ' + userBindings)
    }
    const existingBinding = (k === null ? bindingsNode :
                             get(bindingsNode, k))
    const data = u || get(existingBinding, 'data')
    const children = get(existingBinding, 'children')
    return tagType(NODE, { data, children })
  }
  const recurse = (n, k) => {
    return mergeBindings(n, get(state, k), get(userBindings, k),
                         get(bindingsNode, k))
  }
  return match(
    node,
    {
      [OBJECT_OF]: node => {
        // check for extra attributes
        if (userBindings !== null
            && any(Object.keys(userBindings).map(k => !(k in state)))) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        }
        return map(state, updateRecurse)
      },
      [ARRAY_OF]:  node => {
        // check array lengths
        if (userBindings !== null && state.length !== userBindings.length) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        }
        return map(state, updateRecurse)
      },
      [COMPONENT]: node => updateRecurse(state, null),
      [ARRAY]:  node => {
        if (userBindings !== null && !isArray(userBindings)) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        }
        return map(node, recurse)
      },
      [OBJECT]: node => {
        if (userBindings !== null && isArray(userBindings)) {
          throw new Error('Shape of the bindings object does not match the ' +
                          'model. Model: ' + node + ' Bindings object: ' +
                          userBindings)
        }
        return map(node, recurse)
      }
    }
  )
}

/**
 * Run create, update, and destroy for component.
 * @param {Array} address - The location of the component in the state.
 * @param {Object} node - A model or a node within a model.
 * @param {Object} diff - The diff object for this component.
 * @param {Object|null} bindings -
 * @param {Object} stateCallers -
 * @return {Object}
 */
function updateComponents (address, node, state, diff, bindings, stateCallers) {
  const updateRecurse = ([ d, s, b ], k) => {
    const component = k !== null ? node.component : node
    const newAddress = k !== null ? addressWith(address, k) : address
    // Update the component. If needs_destroy, then there will not be a binding.
    const userBindings = updateEl(newAddress, component, s, d.data,
                                  get(b, 'data'), stateCallers)
    // merge the bindings, preferring the new bindings
    const currBindings = userBindings === null ? get(b, 'children') :
            mergeBindings(component.model, s, userBindings, b.children)
    // update children
    const children = updateComponents(newAddress, component.model, s,
                                      d.children, currBindings, stateCallers)
    return b === null ? null : tagType(NODE, { data: b.data, children })
  }
  const mapRecurse = node => map(node, (n, k) => {
    return updateComponents(addressWith(address, k), n, get(state, k),
                            diff[k], get(bindings, k), stateCallers)
  })
  return match(
    node,
    {
      [OBJECT_OF]: node => {
        return filter(map(zip([ diff, state, bindings ]), updateRecurse),
                      notNull)
      },
      [ARRAY_OF]:  node => {
        return filter(map(zip([ diff, state, bindings ]), updateRecurse),
                      notNull)
      },
      [COMPONENT]: node => updateRecurse([ diff, state, bindings ], null),
      [ARRAY]:  mapRecurse,
      [OBJECT]: mapRecurse,
    })
}

// -------------------------------------------------------------------
// State
// -------------------------------------------------------------------

export function addressWith (address, key) {
  return key === null ? address : [ ...address, key ]
}

export function addressEqual (a1, a2) {
  if (a1 === null || a2 === null || a1.length !== a2.length) return false
  return a1.reduce((accum, v, i) => accum && v === a2[i], true)
}

/**
 * Get the value in state.
 * @param {Array} address -
 * @param {Object} object -
 * @return {*} -
 */
export function getState (address, object) {
  return address.reduce((accum, val) => accum[val], object)
}

/**
 * Set the value in state.
 * @param {Array} address -
 * @param {Object} object -
 * @param {*} value -
 */
export function setState (address, object, value) {
  const [ ar, last ] = tail(address)
  const parent = getState(ar, object)
  parent[last] = value
}

/**
 * Get the value at address in a tree of NODEs (signals, bindings, etc.).
 * @param {Array} address -
 * @param {Object} object -
 * @return {*} value -
 */
export function getTinierState (address, object) {
  return address.reduce((node, val) => {
    return checkType(NODE, node) ? node.children[val] : node[val]
  }, object)
}

/**
 * Set the value at address in a tree of NODEs (signals, bindings, etc.).
 * @param {Array} address -
 * @param {Object} object -
 * @param {*} value -
 */
export function setTinierState (address, object, value) {
  const [ ar, last ] = tail(address)
  const parent = getTinierState(ar, object)
  if (checkType(NODE, parent)) {
    parent.children[last] = value
  } else {
    parent[last] = value
  }
}

/**
 * Walk content and diff newState and oldState. Where differences exist, update
 * the needsCreate, needsUpdate, and needsDestroy labels in the view in the
 * content. Differences are determined by strict equality ===.
 *
 * TODO also check the state to make sure it's valid for this model.
 *
 * @param {Object} modelNode - A model or a node of a model.
 * @param {Object} newState - The new state corresponding to modelNode.
 * @param {Object|null} oldState - The old state corresponding to modelNode.
 * @param {Array} address - The current address.
 * @returns {Object} An object with the same shape as modelNode that specifies
 *                   which view need to be created, updated, and destroyed. Also
 *                   keeps track of the actions for each view.
 */
export function diffWithModel (modelNode, newState, oldState) {
  return match(
    modelNode,
    {
      [OBJECT_OF]: node => {
        if ((!isObject(newState) || isArray(newState)) && newState !== null) {
          throw new Error('Shape of the new state does not match the model. ' +
                          'Model: ' + node + '  State: ' + newState)
        }
        const isValid = (obj, k) => isObject(obj) && k in obj && obj[k] !== null
        const l = Object.assign({}, newState || {}, oldState || {})
        return mapValues(l, function (_, k) {
          const data = {
            needsCreate:  isValid(newState, k)  && !isValid(oldState, k),
            needsUpdate:  isValid(newState, k)  &&  isValid(oldState, k) &&
                            newState[k] !== oldState[k],
            needsDestroy: !isValid(newState, k) &&  isValid(oldState, k),
          }
          const children = diffWithModel(node.component.model,
                                         get(newState, k),
                                         get(oldState, k))
          return tagType(NODE, { data, children })
        })
      },
      [ARRAY_OF]: node => {
        if (!isArray(newState) && newState !== null) {
          throw new Error('Shape of the new state does not match the model.' +
                          'Model: ' + node + '  State: ' + newState)
        }
        const isValid = (obj, i) => {
          return isArray(obj) && i < obj.length && obj[i] !== null
        }
        const longest = Math.max(isArray(newState) ? newState.length : 0,
                                 isArray(oldState) ? oldState.length : 0)
        const l = Array.apply(null, { length: longest })
        return l.map(function (_, i) {
          const data = {
            needsCreate:   isValid(newState, i) &&  !isValid(oldState, i),
            needsUpdate:   isValid(newState, i) &&   isValid(oldState, i) &&
                             newState[i] !== oldState[i],
            needsDestroy: !isValid(newState, i) &&   isValid(oldState, i),
          }
          const children = diffWithModel(node.component.model,
                                         get(newState, i),
                                         get(oldState, i))
          return tagType(NODE, { data, children })
        })
      },
      [COMPONENT]: node => {
        const isValid = obj => obj !== null
        const data = {
          needsCreate:   isValid(newState) &&  !isValid(oldState),
          needsUpdate:   isValid(newState) &&   isValid(oldState) &&
                           newState !== oldState,
          needsDestroy: !isValid(newState) &&   isValid(oldState),
        }
        const children = diffWithModel(node.model,
                                       newState || null,
                                       oldState || null)
        return tagType(NODE, { data, children })
      },
      [ARRAY]: node => {
        if (!isArray(newState) && newState !== null) {
          throw new Error('Shape of the new state does not match the model.' +
                          'Model: ' + node + '  State: ' + newState)
        }
        return map(node, (n, i) => {
          return diffWithModel(n, get(newState, i), get(oldState, i))
        })
      },
      [OBJECT]: node => {
        if ((!isObject(newState) || isArray(newState)) && newState !== null) {
          throw new Error('Shape of the new state does not match the model. ' +
                          'Model: ' + node + '  State: ' + newState)
        }
        return map(node, (n, k) => {
          return diffWithModel(n, get(newState, k), get(oldState, k))
        })
      },
    })
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
  res.call = (...args) => map(res._onFns, fn => fn(...args))
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
  const mapFilterRecurse = node => {
    return filter(map(node, makeChildSignalsAPI), notNull)
  }
  return match(
    model,
    {
      [OBJECT_OF]: node => makeSignalsAPI(node.component.signalNames, true),
      [ARRAY_OF]:  node => makeSignalsAPI(node.component.signalNames, true),
      [COMPONENT]: node => makeSignalsAPI(node.signalNames, false),
      [ARRAY]:  mapFilterRecurse,
      [OBJECT]: mapFilterRecurse,
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
  const stateRecurse = node => fn(init, node.data, address)
  const reduceRecurse = node => {
    return reduce(node, (accum, n, k) => {
      return reduceChildren(n, fn, accum, addressWith(address, k))
    }, init)
  }
  return match(node, {
    [NODE]: stateRecurse,
    [ARRAY]: reduceRecurse,
    [OBJECT]: reduceRecurse,
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
    const diffData = d.data
    if (diffData.needsCreate) {
      // For create, apply the callbacks
      const { signalsAPI, childSignalsAPI } = runSignalSetup(component,
                                                             newAddress,
                                                             stateCallers)
      const newUpAddress = upAddress === null ? null : addressWith(upAddress, k)
      const signals = map(
        zip([ signalsAPI, upChild ]),
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
    } else if (diffData.needsDestroy) {
      // In the case of destroy, this leaf in the signals object will be null.
      return null
    } else {
      // update
      const { hasCreated, destroyed } = reduceChildren(
        d.children, (accum, diffData, address) => {
          const hasCreated = accum.hasCreated || diffData.needsCreate
          const destroyed = (diffData.needsDestroy ?
                             [ ...accum.destroyed, address ] :
                             accum.destroyed)
          return { hasCreated, destroyed }
        }, { hasCreated: false, destroyed: [] }
      )

      // if there are deleted children, delete references to them
      map(destroyed, childAddress => {
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
        map(childSignalsAPINode, obj => {
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
    [OBJECT_OF]: node => {
      return filter(map(zip([ diffNode, signalNode ]), updateRecurse), notNull)
    },
    [ARRAY_OF]: node => {
      return filter(map(zip([ diffNode, signalNode ]), updateRecurse), notNull)
    },
    [COMPONENT]: node => updateRecurse([ diffNode, signalNode ], null),
    [ARRAY]:  node => map(zip([ node, diffNode, signalNode, upChild ]), recurse),
    [OBJECT]: node => map(zip([ node, diffNode, signalNode, upChild ]), recurse),
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
    shouldUpdate: constant(null),
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
  return map(component.reducers, (reducer, name) => {
    return function (arg) {
      callReducer(address, component, reducer, arg, name)
    }
  })
}

function patchSignals (address, component, callSignal) {
  return fromPairs(map(component.signalNames, signalName => {
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
  const methods = map(component.methods, method => {
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

export function makeCallMethod (state) {
  /**
   * Call a method on the local state
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
    // check for uninitialized state
    if (state[TOP] === null) {
      throw new Error('Cannot call method before the app is initialized (e.g. ' +
                      'in signalSetup).')
    }
    // get the local state
    const localState = getState(address, state)
    // run the method
    method({ state: localState, signals, methods, reducers, target, event,
             ...arg })
  }
}

/**
 * Return a callSignal function.
 */
function makeCallSignal (signals) {
  return (address, signalName, arg) => {
    if (VERBOSE) {
      console.log('Called signal ' + signalName + ' at [' + address.join(', ') +
                  '].')
    }
    getTinierState(address, signals).data.signals[signalName].call(arg)
  }
}

/**
 * Return a new callReducer function.
 * @param state -
 * @param bindings -
 * @param signals -
 * @param stateCallers -
 * @returns {Function} -
 *   Call a reducer on the local state
 *   @param address - A location, as an array of keys (strings and integers).
 *   @param component
 *   @param reducer
 *   @param arg - An argument object.
 */
export function makeCallReducer (state, bindings, signals, stateCallers) {
  return (address, component, reducer, arg, name) => {
    // get the local state
    const localState = getState(address, state)
    const localBindings = getTinierState(address, bindings)
    const localSignals = getTinierState(address, signals)
    // run the reducer
    const newLocalState = reducer({ ...arg, state: localState })
    if (VERBOSE) {
      console.log('Called reducer ' + name + ' for ' + component.displayName +
                  ' at [' + address.join(', ') + '].')
      console.log(localState)
      console.log(newLocalState)
    }
    // diff
    const diff = diffWithModel(component, newLocalState, localState)
    // wait to set the state until after it gets checked in diffWithModel
    setState(address, state, newLocalState)
    // update the signals
    const newSignals = mergeSignals(component, address, diff, localSignals,
                                    stateCallers)
    setTinierState(address, signals, newSignals)
    // update the components
    const newBindings = updateComponents(address, component, newLocalState,
                                         diff, localBindings, stateCallers)
    // merge the returned bindings into a coherent object after updating each
    // component instances
    setTinierState(address, bindings, newBindings)
  }
}

/**
 * Return an object with functions callMethod, callSignal, and callReducer.
 * @param {Object} state - The global state.
 * @param {Object} bindings - The global bindings.
 * @param {Object} signals - The global signals.
 * @return {Object} An object with functions callMethod, callSignal, and
 *                  callReducer.
 */
export function makeStateCallers (state, bindings, signals) {
  const stateCallers = {}
  stateCallers.callMethod = makeCallMethod(state)
  stateCallers.callSignal = makeCallSignal(signals)
  stateCallers.callReducer = makeCallReducer(state, bindings, signals,
                                             stateCallers)
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
export function run (component, appEl, initialState = null) {
  // Create variables that will store the state for the whole lifetime of the
  // application. Similar to the redux model.
  let state    = { [TOP]: null }
  let bindings = { [TOP]: tagType(NODE, { data: appEl, children: null }) }
  let signals  = { [TOP]: null }
  const topAddress = [ TOP ]

  // functions that access state, signals, and bindings
  const stateCallers = makeStateCallers(state, bindings, signals)

  // first draw
  const initReducer = () => {
    return initialState !== null ? initialState : component.init()
  }
  stateCallers.callReducer(topAddress, component, initReducer, {})

  // return API
  const localSignals = getTinierState(topAddress, signals).data.signals
  const reducers = patchReducers(topAddress, component, stateCallers.callReducer)
  const signalsCall = patchSignals(topAddress, component, stateCallers.callSignal)
  const methods = patchMethods(topAddress, component, stateCallers.callMethod,
                               reducers, signalsCall)
  return { getState: () => state[TOP], signals: localSignals, methods }
}

export function forceRenderReducer ({ state }) {
  return { ...state, [FORCE_RENDER]: {} }
}
