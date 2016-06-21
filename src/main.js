/** @module tinier */

import mergeWith from 'lodash.mergewith'
import omitBy from 'lodash.omitby'
import reduce from 'lodash.reduce'
import reverse from 'lodash.reverse'
import zipObject from 'lodash.zipobject'

import { createStore as reduxCreateStore, applyMiddleware } from 'redux'

// basic functions
function noop () {}

function constant (val) {
  return () => val
}

export function nthArg (i) {
  return (...args) => args[i]
}

function arrayEqual (a1, a2) {
  if (a1.length !== a2.length)
    return false
  for (let i = 0, l = a1.length; i < l; i++)
    if (a1[i] !== a2[i]) return false
  return true
}

function arrayEqualWith (a1, a2, fn) {
  if (a1.length !== a2.length)
    return false
  for (let i = 0, l = a1.length; i < l; i++)
    if (!fn(a1[i], a2[i])) return false
  return true
}

function partial (fn, arg) {
  return (...args) => fn(arg, ...args)
}

/**
* Iterate over the keys and values of an object. Uses Object.keys to find
* iterable keys.
* @param {Object} obj - The input object.
* @param {Function} fn - A function that takes the arguments (value, key).
* @return {Object} A transformed object with values returned by the function.
*/
export function mapValues (obj, fn) {
  return Object.keys(obj).reduce((c, v) => {
    return { ...c, [v]: fn(obj[v], v) }
  }, {})
}

/**
 * Get the property of the object, or return the default value.
 * @param {Object} object - An object.
 * @param {String} property - An property of the object.
 * @param {*} defaultValue - The default if the property is not present.
 * @return {*} The value of the property or, if not present, the default value.
 */
export function get (object, property, defaultValue) {
  return object.hasOwnProperty(property) ? object[property] : defaultValue
}

/**
 * Check if the value is an object with enumerable properties. Also returns true
 * for arrays.
 * @param {*} value - The value to test.
 * @return {Boolean}
 */
export function isObject (value) {
  return value != null && (typeof value === 'object')
}

const UPDATE_STATE     = '@TINIER_UPDATE_STATE'
const ARRAY_OF         = '@TINIER_ARRAY_OF'
const OBJECT_OF        = '@TINIER_OBJECT_OF'
const COMPONENT        = '@TINIER_COMPONENT'
const ARRAY            = '@TINIER_ARRAY'
const OBJECT           = '@TINIER_OBJECT'
const ADDRESSED_ACTION = '@TINIER_ADDRESSED_ACTION'
const ADDRESS_UP       = '@TINIER_ADDRESS_UP'
const ADDRESS_DOWN     = '@TINIER_ADDRESS_DOWN'
const NEEDS_CREATE     = '@TINIER_NEEDS_CREATE'
const NEEDS_UPDATE     = '@TINIER_NEEDS_UPDATE'
const NEEDS_DESTROY    = '@TINIER_NEEDS_DESTROY'
const ACTION           = '@TINIER_ACTION'

export function tagType (obj, type) {
  return { ...obj, type }
}

/**
 * Create an object representing many instances of this view, for use in a tinier
 * model.
 * @param {Object} view - Tinier view.
 * @return {Object}
 */
export function objectOf (view) {
  return tagType({ view }, OBJECT_OF)
}

/**
 * Create an array representing many instances of this view, for use in a tinier
 * model.
 * @param {Object} view - Tinier view.
 * @return {Object}
 */
export function arrayOf (view) {
  return tagType({ view }, ARRAY_OF)
}

// Make sure default is null so undefined type constant do not match
const checkType      = (type, obj) => get(obj, 'type', null) === type
const isObjectOf     = partial(checkType, OBJECT_OF)
const isArrayOf      = partial(checkType, ARRAY_OF)
const isView         = partial(checkType, COMPONENT)
const isTinierAction = partial(checkType, ACTION)
const isArray        = Array.isArray

/**
 * Run functions depending on the object type of node.
 *
 * @param {Object} node
 * @param {Object} caseFns
 * @param {Function} defaultFn
 *
 * @return {*} Return value from the callback function.
 */
function handleNodeTypes (node, caseFns, defaultFn) {
  if      (isObjectOf(node))    return caseFns[OBJECT_OF](node, node.view)
  else if (isArrayOf(node))     return caseFns[ARRAY_OF](node, node.view)
  else if (isView(node))        return caseFns[COMPONENT](node, node)
  else if (isArray(node))       return caseFns[ARRAY](node)
  else if (isObject(node))      return caseFns[OBJECT](node)
  else                          return defaultFn(node)
}

function throwUnrecognizedType (node) {
  throw Error('Unrecognized node type in model: ' + node)
}

function throwContentMismatch (state, node, ...args) {
  throw Error('Content shape does not match state shape: ' + node +
              ' <-> Array ' + state)
}

// -------------------------------------------------------------------
// Addresses
// -------------------------------------------------------------------

/**
 * Resolve a relative address.
 *
 * @param {Array} address - A starting address.
 *
 * @param {Array} relativeKeyList - A list of directions from the starting
 * address.
 *
 * @return {Array|null} A new address, or null if the directions do not apply.
 */
function relativeAddress (address, relativeKeyList) {
  return relativeKeyList.reduce((add, rel) => {
    if (add === null)
      return null
    switch (rel[0]) {
    case ADDRESS_UP:
      return rel[1] === add[add.length - 1] ? add.slice(0, -1) : null
    case ADDRESS_DOWN:
      return [ ...add, rel[1] ]
    default:
      throw Error('Unrecognized relative address key: ' + rel)
    }
  }, address)
}

function addressWith (address, key) {
  return [ ...address, key ]
}

export function addressAction (action, relativeAddress) {
  /** Return an addressed action. */
  return tagType({ action, relativeAddress }, ADDRESSED_ACTION)
}

/**
 * Returns a relative address from somewhere to the given address
 */
export function addressRelFrom (relativeKeyList, address = []) {
  return reverse(relativeKeyList.map(a => [ ADDRESS_UP, a ])).concat(address)
}

/**
 * Returns a relative address to somewhere from the given address
 */
export function addressRelTo (relativeKeyList, address = []) {
  return address.concat(relativeKeyList.map(a => [ ADDRESS_DOWN, a ]))
}

// -------------------------------------------------------------------
// 1. Reduce state by mapping over state tree
// -------------------------------------------------------------------

function orIdentity (obj, callback, init, mapFn, collectFn) {
  const [ newObject, identical ] = reduce(
    mapFn(obj, (val, ...args) => {
      const out = callback(val, ...args)
      return [ out, out === val ]
    }),
    (accum, current, key) => {
      const [ vals, allSame ] = accum
      const [ val,  same    ] = current
      return [ collectFn(vals, val, key), allSame && same ]
    },
    [ init, true ]
  )
  return identical ? obj : newObject
}

/**
 * Map over an array.  If none of the values changed, then return the original
 * array.
 *
 * @param {Array} array - An array.
 * @param {Function} callback - A function that takes the same parameters as
 * Array.prototype.map.
 * @return {Array} An array of modified values or the original array if there
 * were no changes
 */
export function mapOrIdentity (array, callback) {
  const arrayMap = (ar, fn) => ar.map(fn)
  return orIdentity(array, callback, [], arrayMap,
                    (cur, val, i) => [ ...cur, val ])
}

/**
 * Map over an object, as in lodash.mapValues.  If none of the values changed,
 * then return the original object.
 *
 * @param {Object} object - An object.
 * @param {Function} callback - A function that takes the same parameters as
 * lodash.mapValues.
 * @return {Object} An object of modified values or the original object if there
 * were no changes.
 */
export function mapValuesOrIdentity (object, callback) {
  return orIdentity(object, callback, {}, mapValues,
                    (cur, val, key) => Object.assign(cur, { [key]: val }))
}

/**
 * Return the state after calling fn for each view in content.
 *
 * @param {Object} state - The current state.
 *
 * @param {Object} modelNode - A model or an element of a modelNode
 * corresponding to this state.
 *
 * @param {Array} address - The current address.
 *
 * @param {Function} fn - The callback with arguments: (view, localState, address).
 *
 * @returns {Object} The new state.
 */
export function mapState (state, modelNode, address, fn) {
  if (isArray(state)) {
    return handleNodeTypes(
      modelNode,
      {
        [OBJECT_OF]: partial(throwContentMismatch, state),
        [ARRAY_OF]: (node, view) => {
          return mapOrIdentity(state, (s, i) => {
            const newAddress = addressWith(address, i)
            const newState = fn(view, s, newAddress)
            return mapState(newState, view.model, newAddress, fn)
          })
        },
        [COMPONENT]: (node, view) => {
          const newState = fn(view, state, address)
          return mapState(newState, view.model, address, fn)
        },
        [OBJECT]: partial(throwContentMismatch, state),
        [ARRAY]: (node) => {
          return mapOrIdentity(state, (s, i) => {
            const n = get(node, i, null)
            return mapState(s, n, addressWith(address, i), fn)
          })
        },
      },
      constant(state)
    )
  } else if (isObject(state)) {
    return handleNodeTypes(
      modelNode,
      {
        [OBJECT_OF]: (node, view) => {
          return mapValuesOrIdentity(state, (s, k) => {
            const newAddress = addressWith(address, k)
            const newState = fn(view, s, newAddress)
            return mapState(newState, view.model, newAddress, fn)
          })
        },
        [ARRAY_OF]: partial(throwContentMismatch, state),
        [COMPONENT]: (node, view) => {
          const newState = fn(view, state, address)
          return mapState(newState, view.model, address, fn)
        },
        [OBJECT]: (node) => {
          return mapValuesOrIdentity(state, (s, k) => {
            return mapState(s, get(node, k, null), addressWith(address, k), fn)
          })
        },
        [ARRAY]: partial(throwContentMismatch, state),
      },
      constant(state)
    )
  } else {
    return state
  }
}

/**
 * Combine the reducers in all children of the given view.
 *
 * @param {Object} content - A model for a tinier view.
 * @returns {Function} A reducer.
 */
function reducerForModel (model) {
  return (state, action) => {
    return mapState(state, model, [], (view, localState, address) => {
      if (isTinierAction(action) && !arrayEqual(action.address, address)) {
        // If there is an address but it doesn't match, then ignore.
        return localState
      } else {
        // Ordinary actions and actions with matching addresses.
        return view.reducer(localState, action)
      }
    })
  }
}

// -------------------------------------------------------------------
// 2. Collect actionCreators by walking content.
// -------------------------------------------------------------------

/**
 * Update the table with actions for the view.
 */
function newTable(view, genAddress, table) {
  const newEntries = mapValues(view.actionCreators, v => [ genAddress, v ])
  return mergeWith(table, newEntries, (t, n) => t ? [ ...t, n ] : [ n ])
}

/**
 * Create a lookup table for action creators and addresses through a recursive
 * reduce over the model.
 *
 * @param {Object} model - A tinier model.
 * @param {Function} dispatch - The redux dispatch function.
 * @param {Array} [genAddress = []] - A generic address, i.e. an address that
 * can include ':'.
 * @return {Object} The lookup table. The table is an object where keys are
 * action types and values are pairs with a generic address and an action
 * creator reference. A generic address uses ':' in place of integer indices and
 * keys.
 */
function findActionCreators (modelNode, genAddress = [], table = {}) {
  return handleNodeTypes(
    modelNode,
    {
      [OBJECT_OF]: (node, view) => {
        const newGenAddress = addressWith(genAddress, ':')
        const t = newTable(view, newGenAddress, table)
        return findActionCreators(view.model, newGenAddress, t)
      },
      [ARRAY_OF]: (node, view) => {
        const newGenAddress = addressWith(genAddress, ':')
        const t = newTable(view, newGenAddress, table)
        return findActionCreators(view.model, newGenAddress, t)
      },
      [COMPONENT]: (node, view) => {
        const t = newTable(view, genAddress, table)
        return findActionCreators(view.model, genAddress, t)
      },
      [OBJECT]: (node) => {
        return Object.keys(node).reduce((t, k) => {
          return findActionCreators(node[k], addressWith(genAddress, k), t)
        }, table)
      },
      [ARRAY]: (node) => {
        return node.reduce((t, n, i) => {
          return findActionCreators(n, addressWith(genAddress, i), t)
        }, table)
      },
    },
    throwUnrecognizedType
  )
}

/**
 * Compare a generic address with an absolute, non-generic address.
 */
function checkAddress (genAddress, absoluteAddress) {
  return arrayEqualWith(genAddress, absoluteAddress, (a1, a2) => {
    if (a1 === ':') return true
    else            return a1 === a2
  })
}

/**
 * Intercept the action creator and add the given address.
 */
function applyAddress (address, actionCreator) {
  return (...args) => {
    const actionObj = actionCreator(...args)
    // only intercept ordinary objects, not functions
    if (isObject(actionObj))
      return Object.assign({}, actionObj, { address })
    else
      return actionObj
  }
}

/**
 * Intercept the action creators and add the given address.
 */
function applyAddressMany (address, actionCreators) {
  return mapValues(actionCreators, partial(applyAddress, address))
}

/**
 * Find the first action result in an action creator lookup table.
 *
 * @param {Object} table - The lookup table.
 * @param {Object} address - An address.
 * @param {Object} addressedAction - An addressed action.
 * @return {Function} The first action creator found, or else null.
 */
function findFirstActionCreator (table, address, addressedAction) {
  const absoluteAddress = relativeAddress(address, addressedAction.relativeAddress)
  const results = get(table, addressedAction.action, [])
          .filter(row => checkAddress(row[0], absoluteAddress))
          .map(row => row[1])
  return get(results, 0, null)
}

/**
 * Make a function called actionWithAddressRelative that will be passed into
 * middleware actions functions so they can look up and run actions from other
 * views.
 *
 * @param {Object} model - A tinier model.
 * @param {Function} dispatch - The redux dispatch function.
 * @return {Function} The actionWithAddressRelative function. Call this on an
 * address to create the actionWithAddress function. That function takes an
 * addressed action and returns the action function (JEEZ!).
 */
function makeActionWithAddressRelative (model, dispatch) {
  const actionsTable = findActionCreators(model)
  const lookup = partial(findFirstActionCreator, actionsTable)
  return address => addressedAction => {
    return withDispatch(
      dispatch,
      applyAddress(
        relativeAddress(address, addressedAction.relativeAddress),
        lookup(address, addressedAction)
      )
    )
  }
}

/**
 * Find all actions creators for an address in an action creator lookup table.
 *
 * @param {Object} table - The lookup table.
 * @param {Object} address - An address.
 *
 * @return {Object} An object where keys are action types and values are action
 * creator functions whose addresses match address.
 */
function findAllActionCreators (table, address) {
  // map over all keys
  const allVals = mapValues(table, rows => {
    const matchingActionCreators = rows
            .filter(row => checkAddress(row[0], address))
            .map(row => row[1])
    return get(matchingActionCreators, 0, null)
  })
  // omit keys with no matching rows
  return omitBy(allVals, rows => rows === null)
}

/**
 * Find all actions available to an address.
 *
 * Used by the middleware to pass actions to an async action creator.
 */
function makeAllActionsForAddress (model, dispatch) {
  const actionsTable = findActionCreators(model)
  const lookup = partial(findAllActionCreators, actionsTable)
  return address => withDispatchMany(dispatch,
                                     applyAddressMany(address, lookup(address)))
}

// -------------------------------------------------------------------
// 3. Diff state by walking model
// -------------------------------------------------------------------

/**
 * Walk content and diff newState and oldState. Where differences exist, update
 * the needsCreate, needsUpdate, and needsDestroy labels in the view in the
 * content.
 *
 * @param {Object} modelNode - A model or a node of a model.
 * @param {Object} newState - The new state corresponding to modelNode.
 * @param {Object|null} oldState - The old state corresponding to modelNode.
 * @param {Array} address - The current address.
 * @returns {Object} An object with the same shape as modelNode that specifies which
 * view need to be created, updated, and destroyed. Also keeps track of the
 * actions for each view.
 */
function diffWithModel (modelNode, newState, oldState, address) {
  return handleNodeTypes(
    modelNode,
    {
      [OBJECT_OF]: (node, view) => {
        const isValid = (obj, k) => isObject(obj) && k in obj && obj[k] !== null
        const l = Object.assign({}, newState || {}, oldState || {})
        return mapValues(l, function (_, k) {
          const res = diffWithModel(view.model, get(newState, k, null), get(oldState, k, null),
                                    addressWith(address, k))
          res[NEEDS_CREATE]  =  isValid(newState, k) && !isValid(oldState, k)
          res[NEEDS_UPDATE]  =  isValid(newState, k) &&  isValid(oldState, k) && newState[k] !== oldState[k]
          res[NEEDS_DESTROY] = !isValid(newState, k) &&  isValid(oldState, k)
          return res
        })
      },
      [ARRAY_OF]: (node, view) => {
        const isValid = (obj, i) => isArray(obj) && i < obj.length && obj[i] !== null
        const longest = Math.max(isArray(newState) ? newState.length : 0,
                                 isArray(oldState) ? oldState.length : 0)
        const l = Array.apply(null, { length: longest })
        return l.map(function (_, i) {
          const res = diffWithModel(view.model, get(newState, i, null), get(oldState, i, null),
                                    addressWith(address, i))
          res[NEEDS_CREATE]  =  isValid(newState, i) &&  !isValid(oldState, i)
          res[NEEDS_UPDATE]  =  isValid(newState, i) &&   isValid(oldState, i) && newState[i] !== oldState[i]
          res[NEEDS_DESTROY] = !isValid(newState, i) &&   isValid(oldState, i)
          if (arrayEqual(addressWith(address, i), ['cells', 0]))
            debugger
          return res
        })
      },
      [COMPONENT]: (node, view) => {
        const isValid = obj => obj !== null
        const res = diffWithModel(view.model, newState || null, oldState || null,
                                  address)
        res[NEEDS_CREATE]  =  isValid(newState) &&  !isValid(oldState)
        res[NEEDS_UPDATE]  =  isValid(newState) &&   isValid(oldState) && newState !== oldState
        res[NEEDS_DESTROY] = !isValid(newState) &&   isValid(oldState)
        return res
      },
      [ARRAY]: (node) => {
        return modelNode.map((v, i) => {
          return diffWithModel(v, get(newState, i, null), get(oldState, i, null),
                               addressWith(address, i))
        })
      },
      [OBJECT]: (node) => {
        return mapValues(modelNode, (v, k) => {
          return diffWithModel(v, get(newState, k, null), get(oldState, k, null),
                               addressWith(address, k))
        })
      }
    },
    throwUnrecognizedType
  )
}

// -------------------------------------------------------------------
// 4. Update views by walking content
// -------------------------------------------------------------------

/**
 * Run lifecycle functions for the view.
 *
 * @param {Object} view
 * @param {Object} binding
 * @param {Object} state
 * @param {Array} address
 * @param {Boolean} needsCreate
 * @param {Boolean} needsUpdate
 * @param {Boolean} needsDestroy
 * @param {Function} dispatch
 *
 * @return {Object} New bindings if needsUpdate is true. Otherwise null.
 */
function updateEl (view, binding, state, needsCreate, needsUpdate, needsDestroy) {
  if (needsDestroy) {
    view.willUnmount(binding, state, view.methods)
    return null
  }
  if (needsCreate)
    view.willMount(binding, state, view.methods)
  else if (needsUpdate)
    view.willUpdate(binding, state, view.methods)
  const res = (needsCreate || (needsUpdate && view.shouldUpdate(binding, state, view.methods))) ?
          view.render(binding, state, view.methods) : null
  if (needsCreate)
    view.didMount(binding, state, view.methods)
  else if (needsUpdate)
    view.didUpdate(binding, state, view.methods)
  return res
}

/**
 * Run create, update, and destroy for view. Recursive.
 *
 * @param {Object} modelNode - A model or an element of a modelNode.
 * @param {Object} state - The user state corresponding to the model nodes
 * @param {Object} tinierState - The tinier state corresponding to the model nodes.
 * @param {Object} data - Some data that will be passed to updateEl.
 */
function updateWithModel (modelNode, userState, tinierState, appState,
                          bindings, dispatch,
                          address = []) {
  return handleNodeTypes(
    modelNode,
    {
      // TODO check the userState, tinierState, bindings, and modelNode shapes
      [OBJECT_OF]: (node, view) => {
        // tinierState might have more keys than bindings, userState, and
        // modelNode, so map over tinierState
        mapValues(tinierState, (t, k) => {
          const newAddress = addressWith(address, k)
          // TODO make these accessions into gets and add nice error messages
          const s = userState[k]
          const newBindings = updateEl(view, bindings[k], s, t[NEEDS_CREATE],
                                       t[NEEDS_UPDATE], t[NEEDS_DESTROY])
          if (newBindings)
            updateWithModel(view.model, s, t, appState, newBindings,
                            dispatch, newAddress)
        })
      },
      [ARRAY_OF]: (node, view) => {
        // tinierState might have more keys than bindings, userState, and
        // modelNode, so map over tinierState
        tinierState.map((t, i) => {
          const newAddress = addressWith(address, i)
          const s = userState[i]
          const newBindings = updateEl(view, bindings[i], s, t[NEEDS_CREATE],
                                       t[NEEDS_UPDATE], t[NEEDS_DESTROY])
          if (newBindings)
            updateWithModel(view.model, s, t, appState, newBindings,
                            dispatch, newAddress)
        })
      },
      [COMPONENT]: (node, view) => {
        const s = userState
        const t = tinierState
        const newBindings = updateEl(view, bindings, userState, t[NEEDS_CREATE],
                                     t[NEEDS_UPDATE], t[NEEDS_DESTROY])
        if (newBindings)
          updateWithModel(view.model, s, t, appState, newBindings,
                          dispatch, address)
      },
      [ARRAY]: (node) => {
        node.map((n, i) => {
          updateWithModel(n, userState[i], tinierState[i], appState,
                          bindings[i], dispatch,
                          addressWith(address, i))
        })
      },
      [OBJECT]: (node) => {
        mapValues(node, (n, k) => {
          updateWithModel(n, userState[k], tinierState[k], appState,
                          bindings[k], dispatch,
                          addressWith(address, k))
        })
      }
    },
    throwUnrecognizedType
  )
}

/**
 * Apply the dispatch function through function composition with the action
 * creator.
 *
 * @param {Function} actionCreator - An action creator.
 * @param {Function} dispatch - A dispatch function.
 * @returns {Object} An object where values are functions that dispatch actions.
 */
function withDispatch (dispatch, actionCreator) {
  return (...args) => { dispatch(actionCreator(...args)) }
}

/**
 * Apply the dispatch function through function composition with the action
 * creators.
 *
 * @param {Object} actionCreators - An object where values are action creators.
 * @param {Function} dispatch - A dispatch function.
 * @returns {Object} An object where values are functions that dispatch actions.
 */
function withDispatchMany (dispatch, actionCreators) {
  return mapValues(actionCreators, partial(withDispatch, dispatch))
}

/**
 * Create a tinier component.
 *
 * @param {Object} componentArgs - Functions defining the tinier view.
 * @param {str} componentArgs.displayName - A name for the view, to make
 * debugging easier.
 * @param {Object} componentArgs.model - The model object.
 * @param {Function} componentArgs.init - A function to initialize the state for
 * the component.
 * @param {Function} componentArgs.getReducer - A function that takes the model as an
 * argument and produces a redux reducer.
 * @param {Function} componentArgs.actionCreators -
 * @param {Function} componentArgs.willMount -
 * @param {Function} componentArgs.didMount -
 * @param {Function} componentArgs.willUpdate -
 * @param {Function} componentArgs.didUpdate -
 * @param {Function} componentArgs.willUnmount -
 * @param {Function} componentArgs.render -
 * @param {Function} componentArgs.getAPI -
 *
 * @returns {Object} A tinier component.
 */
export function createComponent (options = {}) {
  // default attributes
  const defaults = {
    displayName:  '',
    model:        {},
    init:         constant({}),
    reducers:     {},
    willMount:    noop,
    didMount:     noop,
    willUpdate:   noop,
    didUpdate:    noop,
    willUnmount:  noop,
    render:       constant({}),
  }
  // check inputs
  mapValues(options, (_, k) => {
    if (!(k in defaults)) {
      console.error('Unexpected argument ' + k)
    }
  })
  // set defaults & tag
  return tagType({ ...defaults, ...options }, COMPONENT)
}

function getWithEmptyOK (obj, loc, def) {
  return isArray(loc) && loc.length === 0 ?
    obj :
    get(obj, loc, def)
}

function statesForAddress(address, getState) {
  const state = getState().userState
  const localState = getWithEmptyOK(state, address, null)
  if (localState === null)
    console.warn('Could not find local state at address ' + address)
  return [ localState, state ]
}

/**
 * Create middleware for this component. Like redux-thunk, action creators can
 * return a function. In this case, the function takes three arguments, the
 * actions object (API), the localState, and the appState.
 *
 * @param {Object} component - A tinier component.
 * @return {Function} Redux middleware.
 */
export function createMiddleware (component) {
  return ({ dispatch, getState }) => {
    const allActions = makeAllActionsForAddress(component, dispatch)
    const actionWithAddressRelative = makeActionWithAddressRelative(component.model, dispatch)
    return next => action => {
      return isTinierAction(action) ?
        action.exec(allActions(action.address),
                    actionWithAddressRelative(action.address),
                    ...statesForAddress(action.address, getState)) :
        (action ? next(action) : null)
    }
  }
}

/**
 * Run a tinier component.
 * @param {Object} component - A tinier component.
 * @param {*} appEl - An element to pass to the component's create, update, and
 * destroy methods.
 * @param {Function} createStore - A function to create a redux store. This can
 * be redux.createStore or a store with middleware generated by
 * redux.createStoreWithMiddleware.
 * @param {Object} state - The initial state. If null, then component.init()
 * will be called to initialize the state.
 * @return {Object} The API functions.
 */
export function run (component, appEl, createStore = null, state = null) {
  // appModel is the top-level component in the following functions
  const appModel = component

  // Generate a combined reducer for the application
  const combinedReducer = reducerForModel(appModel)

  // Modify the top-level reducer to calculate the state diff and update the
  // view views with details.
  const combinedReducerWithDiff = (state, action) => {
    // TODO better solution. Maybe with the @@init action?
    const oldUserState = get(state, 'userState', null)
    const userState = (action.type === UPDATE_STATE ?
                       action.state :
                       combinedReducer(oldUserState, action))
    const tinierState = diffWithModel(appModel, userState, oldUserState, [])
    return { tinierState, userState }
  }

  // Create the store.
  if (createStore === null) {
    createStore = applyMiddleware(createMiddleware(component))(reduxCreateStore)
  }
  const store = createStore(combinedReducerWithDiff)

  // Update function calls updateWithModel recursively to find nodes that need
  // updates and update them.
  const appUpdate = () => {
    const { tinierState, userState } = store.getState()
    // update the parent
    updateWithModel(appModel, userState, tinierState, userState, appEl,
                    store.dispatch)
  }

  // Subscribe to changes
  store.subscribe(appUpdate)

  // Apply the given state, or else call init.
  const initialState = state || component.init()
  const stateUpdateCreator = state => ({ type: UPDATE_STATE, state })
  store.dispatch(stateUpdateCreator(initialState))

  // return global actions as API
  const address = []
  const methods = withDispatchMany(store.dispatch,
                                   applyAddressMany(address, component.actionCreators))
  return methods
}
