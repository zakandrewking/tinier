/** tinier */

'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createClass = createClass;
exports.createReducer = createReducer;
exports.objectOf = objectOf;
exports.arrayOf = arrayOf;

var _lodash = require('lodash.mapvalues');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.isplainobject');

var _lodash4 = _interopRequireDefault(_lodash3);

var _lodash5 = require('lodash.flowright');

var _lodash6 = _interopRequireDefault(_lodash5);

var _lodash7 = require('lodash.zip');

var _lodash8 = _interopRequireDefault(_lodash7);

var _lodash9 = require('lodash.get');

var _lodash10 = _interopRequireDefault(_lodash9);

var _redux = require('redux');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var UPDATE_STATE = 'updateState';

var ARRAY_OF = 'ARRAY_OF';
var OBJECT_OF = 'OBJECT_OF';

var isObjectOf = function isObjectOf(content) {
  return Array.isArray(content) && content[0] === OBJECT_OF;
};
var isArrayOf = function isArrayOf(content) {
  return Array.isArray(content) && content[0] === ARRAY_OF;
};
var isView = function isView(content) {
  return content !== undefined && content !== null && content.hasOwnProperty('isView') && content.isView === true;
};

// 1. Reduce state by mapping over state tree

function mapState(state, content, fn) {
  /** Return the state after calling fn for each view in content. This is
     usually a mutually recursive function with fn.
      state: The current state.
      content: The content corresponding to this state.
      fn: The callback with arguments: (view, localState, key)
    */

  if (Array.isArray(state)) {
    // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
    // state [ ... ]       content Task
    if (isObjectOf(content)) {
      // mismatch
      throw Error('Content shape does not match state shape: ' + content + ' <-> Array ' + state);
    } else if (isView(content)) {
      return fn(content, state, null);
    } else if (isArrayOf(content)) {
      // Array with view.
      return state.map(function (s, i) {
        return fn(content[1], s, i);
      });
    } else {
      // Ordinary array.
      return (0, _utils.zipFillNull)(state, content).map(function (s, c) {
        return mapState(s, c, fn);
      });
    }
  } else if ((0, _lodash4.default)(state)) {
    // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
    // state { ... }                    content Task
    if (isArrayOf(content)) {
      // mismatch
      throw Error('Content shape does not match state shape: ' + content + ' <-> Object ' + state);
    } else if (isView(content)) {
      return fn(content, state, null);
    } else if (isObjectOf(content)) {
      // Object with view.
      return (0, _lodash2.default)(state, function (s, k) {
        return fn(content[1], s, k);
      });
    } else {
      var _ret = function () {
        // Ordinary object
        var out = {};
        Object.keys(state).map(function (k) {
          var contentValue = typeof content[k] === 'undefined' ? null : content[k];
          out[k] = mapState(state[k], contentValue, fn);
        });
        return {
          v: out
        };
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }
  } else {
    return state;
  }
}

function combineReducers(reducer, content) {
  /** combineReducers
    reducer: The current reducer.
    content: The view content.
    */

  return function (state, action) {
    var newState = reducer(state, action);
    var oldState = newState === state ? null : state;
    return mapState(newState, content, function (view, localState, key) {
      // Mutually recursive: view.combinedReducer will call mapState again.
      if ('key' in action && action.key !== key) return localState;else return view.combinedReducer(localState, action, key);
    });
  };
}

// 2. Collect actionCreators by walking content

function reduceContent(content, fn, value) {
  /** Recursive function that reduces the value with fn by walking through
     content.
    */
  if (content[0] === OBJECT_OF || content[0] === ARRAY_OF || content.isView) {
    // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
    // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
    var view = content.isView ? content : content[1];
    return reduceContent(view.content, fn, fn(value, view));
  } else if (Array.isArray(content)) {
    // state [ 'a', { ... } ]  content [ null, { ... } ]
    return content.reduce(function (v, c) {
      return reduceContent(c, fn, v);
    }, value);
  } else if ((0, _lodash4.default)(content)) {
    // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
    return Object.keys(content).reduce(function (v, k) {
      return reduceContent(content[k], fn, v);
    }, value);
  } else {
    // state { other: 'stuff' }  content null
    return value;
  }
}

function collectActionCreators(initialActionCreators, content) {
  /** collectActionCreators
    initialActionCreators: An object with the action creators for the view.
    content: The view content to walk through and collect action creators.
    */
  return reduceContent(content, function (actionCreators, view) {
    return Object.assign({}, actionCreators, view.actionCreators);
  }, initialActionCreators);
}

// 3. Diff state by walking content

function walkContentAndDiff(content, newState, oldState) {
  if (content[0] === OBJECT_OF) {
    (function () {
      var view = content[1];
      var isValid = function isValid(obj, k) {
        return (0, _lodash4.default)(obj) && k in obj && obj[k] !== null;
      };
      var l = Object.assign({}, newState || {}, oldState || {});
      view.needsCreate = (0, _lodash2.default)(l, function (_, k) {
        return isValid(newState, k) && !isValid(oldState, k);
      });
      view.needsUpdate = (0, _lodash2.default)(l, function (_, k) {
        return isValid(newState, k) && (!isValid(oldState, k) || newState[k] !== oldState[k]);
      });
      view.needsDestroy = (0, _lodash2.default)(l, function (_, k) {
        return !isValid(newState, k) && isValid(oldState, k);
      });
      (0, _lodash2.default)(l, function (_, k) {
        return walkContentAndDiff(view.content, (0, _lodash10.default)(newState, k, null), (0, _lodash10.default)(oldState, k, null));
      });
    })();
  } else if (content[0] === ARRAY_OF) {
    (function () {
      var view = content[1];
      var isValid = function isValid(obj, i) {
        return Array.isArray(obj) && i < obj.length && obj[i] !== null;
      };
      var longest = Math.max(Array.isArray(newState) ? newState.length : 0, Array.isArray(oldState) ? oldState.length : 0);
      var l = Array.apply(null, { length: longest });
      view.needsCreate = l.map(function (_, i) {
        return isValid(newState, i) && !isValid(oldState, i);
      });
      view.needsUpdate = l.map(function (_, i) {
        return isValid(newState, i) && (!isValid(oldState, i) || newState[i] !== oldState[i]);
      });
      view.needsDestroy = l.map(function (_, i) {
        return !isValid(newState, i) && isValid(oldState, i);
      });
      l.map(function (_, i) {
        return walkContentAndDiff(view.content, (0, _lodash10.default)(newState, i, null), (0, _lodash10.default)(oldState, i, null));
      });
    })();
  } else if (content.isView) {
    var view = content;
    var isValid = function isValid(obj) {
      return obj !== null;
    };
    view.needsCreate = isValid(newState) && !isValid(oldState);
    view.needsUpdate = isValid(newState) && (!isValid(oldState) || newState !== oldState);
    view.needsDestroy = !isValid(newState) && isValid(oldState);
    walkContentAndDiff(view.content, newState || null, oldState || null);
  } else if (Array.isArray(content)) {
    content.map(function (v, i) {
      return walkContentAndDiff(v, (0, _lodash10.default)(newState, i, null), (0, _lodash10.default)(oldState, i, null));
    });
  } else if ((0, _lodash4.default)(content)) {
    (0, _lodash2.default)(content, function (v, k) {
      return walkContentAndDiff(v, (0, _lodash10.default)(newState, k, null), (0, _lodash10.default)(oldState, k, null));
    });
  }
}

function applyDiffToContent(content, newState, oldState) {
  /** Walk content and diff newState and oldState. Where differences exist,
   update the needsCreate, needsUpdate, and needsDestroy labels in the view in
   the content. */
  // TODO rewrite this to return the needs* functions and keep the whole concept
  // functionally pure. This will probably require making run() a top-level
  // function (and will also let us this hack).
  // TODO
  walkContentAndDiff(content, newState, oldState);
}

// 4. Update views by walking content

function updateEl(view, binding, state, data, key, needsCreate, needsUpdate, needsDestroy) {
  /** Mutually recursive with walkContentAndUpdate */
  var appState = data.appState;
  var parentBindings = data.parentBindings;
  var actions = data.actions;

  if (needsCreate) view.create(state, appState, binding, actions, key);
  if (needsUpdate) {
    var newBindings = view.update(state, appState, binding, actions, key);
    walkContentAndUpdate(view.content, state, Object.assign({}, data, { parentBindings: newBindings }));
  }
  if (needsDestroy) view.destroy(state, appState, binding, actions, key);
}

function walkContentAndUpdate(content, state, data) {
  /** Mutually recursive with updateEl */
  if (content[0] === OBJECT_OF) {
    (function () {
      var view = content[1];
      var bindings = checkBindings(data.parentBindings, view.bindKey, state);
      // needs* might have more keys than bindings and state
      (0, _lodash2.default)(view.needsUpdate, function (_, k) {
        return updateEl(view, (0, _lodash10.default)(bindings, k, null), (0, _lodash10.default)(state, k, null), data, k, view.needsCreate[k], view.needsUpdate[k], view.needsDestroy[k]);
      });
    })();
  } else if (content[0] === ARRAY_OF) {
    (function () {
      var view = content[1];
      var bindings = checkBindings(data.parentBindings, view.bindKey, state);
      // needs* might be longer than bindings and state
      view.needsUpdate.map(function (_, i) {
        return updateEl(view, (0, _lodash10.default)(bindings, i, null), (0, _lodash10.default)(state, i, null), data, i, view.needsCreate[i], view.needsUpdate[i], view.needsDestroy[i]);
      });
    })();
  } else if (content.isView) {
    var view = content;
    var binding = checkBindings(data.parentBindings, view.bindKey, state);
    updateEl(view, binding, state, data, null, view.needsCreate, view.needsUpdate, view.needsDestroy);
  } else if (Array.isArray(content)) {
    content.map(function (v, i) {
      return walkContentAndUpdate(v, (0, _lodash10.default)(state, i, null), data);
    });
  } else if ((0, _lodash4.default)(content)) {
    (0, _lodash2.default)(content, function (v, k) {
      return walkContentAndUpdate(v, (0, _lodash10.default)(state, k, null), data);
    });
  }
}

function updateContent(content, state, data) {
  /** updateContent -  */
  walkContentAndUpdate(content, state, data);
}

function checkBindings(parentBindings, bindKey, state) {
  var bindings = parentBindings[bindKey];
  if (typeof bindings === 'undefined') {
    throw Error('No bindings for key ' + bindKey);
  } else if (Array.isArray(state)) {
    if (!Array.isArray(bindings)) throw Error('Bindings for key ' + bindKey + ' are not an array: ' + bindings);
    if (bindings.length !== state.length) throw Error('Bindings for key ' + bindKey + ' have length ' + bindings.length + ' but state array has length ' + state.length);
  } else if ((0, _lodash4.default)(state) && (0, _lodash4.default)(bindings)) {
    var missingKeys = Object.keys(state).filter(function (k) {
      return !(k in bindings);
    });
    if (missingKeys.length > 0) throw Error('Bindings for key ' + bindKey + ' are missing keys ' + missingKeys);
  }
  return bindings;
}

function withDispatchAndKeyCheck(actionCreators, dispatch) {
  /** Apply the dispatch function through function composition with the action
   creators.
    actionCreators: An object where values are action creators.
    dispatch: A dispatch function.
    */
  // TODO how can these return vaules as API functions
  return (0, _lodash2.default)(actionCreators, function (actionCreator) {
    return (0, _lodash6.default)(dispatch, actionCreator);
  });
}

var defaultReducer = function defaultReducer(state) {
  return state;
};
var emptyFunction = function emptyFunction() {
  return undefined;
};

function createClass(_ref) {
  var _ref$reducer = _ref.reducer;
  var reducer = _ref$reducer === undefined ? defaultReducer : _ref$reducer;
  var _ref$actionCreators = _ref.actionCreators;
  var actionCreators = _ref$actionCreators === undefined ? {} : _ref$actionCreators;
  var _ref$create = _ref.create;
  var create = _ref$create === undefined ? emptyFunction : _ref$create;
  var _ref$update = _ref.update;
  var update = _ref$update === undefined ? emptyFunction : _ref$update;
  var _ref$destroy = _ref.destroy;
  var destroy = _ref$destroy === undefined ? emptyFunction : _ref$destroy;

  return function (bindKey) {
    var content = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    // TODO move this call into run() at ** so combineReducers only needs to be
    // called once and mapState can be an ordinary recursive function (not
    // mutually recursive). This might help simplify the walk/map/reduce tree
    // functions.
    var combinedReducer = combineReducers(reducer, content);
    return {
      run: function run(appEl) {
        var hot_state = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
        var createStore = arguments.length <= 2 || arguments[2] === undefined ? createStore : arguments[2];

        // Use new variables for app state
        var appNeedsUpdate = true;
        // Modify the top-level reducer to calculate the state diff and update
        // the view views with details.
        var combinedReducerWithDiff = function combinedReducerWithDiff(state, action) {
          // **
          // TODO better solution
          var newState = action.type === UPDATE_STATE ? action.data : combinedReducer(state, action);
          applyDiffToContent(content, newState, state);
          return newState;
        };
        // Create the store
        var store = createStore(combinedReducerWithDiff);
        // add an action for state update (TODO better solution)
        var stateUpdateCreator = function stateUpdateCreator(state) {
          return { type: UPDATE_STATE, data: state };
        };
        // Collect the action creators and apply dispatch
        var actions = withDispatchAndKeyCheck(collectActionCreators(Object.assign({}, actionCreators, _defineProperty({}, UPDATE_STATE, stateUpdateCreator)), content), store.dispatch);
        // Subscribe to changes
        var appUpdate = function appUpdate() {
          /** Update function calls walkContent and walkFn recursively to find
             nodes that need updates and update them. */
          var appState = store.getState();
          if (appNeedsUpdate) {
            var parentBindings = update(appState, appState, appEl, actions, null);
            updateContent(content, appState, { appState: appState, parentBindings: parentBindings, actions: actions });
          }
        };
        store.subscribe(appUpdate);

        // first update
        var state = store.getState();
        create(state, state, appEl, actions, null);
        appUpdate();

        // apply a state
        if (hot_state) actions[UPDATE_STATE](hot_state);

        // return actions as API
        return actions;
      },
      combinedReducer: combinedReducer,
      actionCreators: actionCreators,
      content: content,
      create: create,
      update: update,
      destroy: destroy,
      // TODO make bindKey optional if the shape of the bindings object is the
      // same as the shape of the parent content object.
      // TODO allow a function for bindKey.
      bindKey: bindKey,
      isView: true,
      needsCreate: true,
      needsUpdate: true,
      needsDestroy: false
    };
  };
}

function createReducer(initialState, handlers) {
  return function reducer() {
    var state = arguments.length <= 0 || arguments[0] === undefined ? initialState : arguments[0];
    var action = arguments[1];
    var key = arguments[2];

    if (handlers.hasOwnProperty(action.type)) {
      return handlers[action.type](state, action, key);
    } else {
      return state;
    }
  };
}

function objectOf(cls) {
  return [OBJECT_OF, cls];
}

function arrayOf(cls) {
  return [ARRAY_OF, cls];
}

// Actions form the API for the top-level object. TODO this about managing
// hidden methods ('_getState') and namespaced methods ('todos.addTodo')