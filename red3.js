/** redux-my-d3 */

'use strict';

import zip from 'lodash.zip';
import mapValues from 'lodash.mapvalues';
import isPlainObject from 'lodash.isplainobject';

import { applyMiddleware, createStore } from 'redux';
import createLogger from 'redux-logger';
const logger = createLogger();
const createStoreWithMiddleware = applyMiddleware(logger)(createStore);


const ARRAY_OF = 'ARRAY_OF';
const OBJECT_OF = 'OBJECT_OF';

function walkContent(state, content, fn) {
    /** walkContent */
    if (content[0] === OBJECT_OF) {
        // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
        return mapValues(state, s => fn(content[1], s));
    }
    else if (content[0] === ARRAY_OF) {
        // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
        return state.map(s => fn(content[1], s));
    }
    else if (content.isView) {
        // state { ... }  content Tas
        return fn(content, state);
    }
    else if (Array.isArray(content)) {
        // state [ 'a', { ... } ]  content [ null, { ... } ]
        return zip(state, content).map((s, c) => walkContent(s, c, fn));
    }
    else if (isPlainObject(content)) {
        // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
        return mapValues(state, (s, key) => {
            if (key in content)
                return walkContent(s, content[key], fn);
            else
                return s;
        });
    }
    else {
        // state { other: 'stuff' }  content null
        return state;
    }
}

function reduceContent(content, fn, value) {
    if (content[0] === OBJECT_OF || content[0] === ARRAY_OF || content.isView) {
        // state { 'id1': {}, 'id2': 'x' }  content [OBJECT_OF, Todo]
        // state [ 'a', 'b' ]  content [ARRAY_OF, Subtask]
        const instance = content.isView ? content : content[1];
        return reduceContent(instance.content, fn, fn(value, instance));
    }
    else if (Array.isArray(content)) {
        // state [ 'a', { ... } ]  content [ null, { ... } ]
        return content.reduce((v, c) => reduceContent(c, fn, v), value);
    }
    else if (isPlainObject(content)) {
        // state { nested: { ... }, other: 'stuff' }  content { nested: { ... } }
        return Object.keys(content).reduce((v, k) => reduceContent(content[k], fn, v), value);
    }
    else {
        // state { other: 'stuff' }  content null
        return value;
    }
}

function combineReducers(reducer, content) {
    return (state, action) => {
        return walkContent(reducer(state, action), content, (instance, localState) => {
            return instance.combinedReducer(localState, action);
        });
    };
}

function collectActionCreators(initialActionCreators, content) {
    return reduceContent(content, (actionCreators, instance) => {
        return {...actionCreators, ...instance.actionCreators)};
    }, initialActionCreators);
}

function withDispatch(actionCreators, dispatch) {
    return mapValues(actionCreators, actionCreator => {
        return data => dispatch(actionCreator(data));
    });
}

export function createClass({ reducer, actionCreators, create, update }) {
    return (bindKey, content = {}) => {
        const combinedReducer = combineReducers(reducer, content);
        return {
            run: (el, hot_state = null) => {
                const store = createStoreWithMiddleware(combinedReducer, hot_state);
                const actions = withDispatch(collectActionCreators(actionCreators, content),
                                             store.dispatch);
                store.subscribe(() => {
                    const state = store.getState();
                    const containers = update(state, state, el, actions);
                    walkContent(state, content, (instance, localState, parent) => {
                        // TODO parent
                        instance.create(localState, state, parent.bindings[instance.bindKey], actions);
                    });
                    // TODO update
                });
                const state = store.getState();
                create(state, state, el, actions);
                update(state, state, el, actions);

                return actions;
            },
            combinedReducer,
            actionCreators,
            content,
            bindKey,
            isView: true
        };
    };
}

export function createReducer(initialState, handlers) {
    return function reducer(localState = initialState, action) {
        if (handlers.hasOwnProperty(action.type)) {
            return handlers[action.type](localState, action);
        } else {
            return localState;
        }
    };
}

export function objectOf(cls) {
    return [OBJECT_OF, cls];
}

export function arrayOf(cls) {
    return [ARRAY_OF, cls];
}
