/** redux-my-d3 */

'use strict';

import * as d3 from 'd3';
import * as redux from 'redux';

const ARRAY_OF = 'ARRAY_OF';
const OBJECT_OF = 'OBJECT_OF';

function combine_reducers(reducer, content) {
    // TODO
    return (state, action) => {
        return reducer(state, action);
    };
}

function with_dispatch(actionCreators, dispatch) {
    const actions = {};
    for (let id in actionCreators)
        actions[id] = data => dispatch(actionCreators[id](data));
    return actions;
};

export function createClass({ reducer, actionCreators, create, update }) {
    return (content = {}) => {
        const combined_reducer = combine_reducers(reducer, content);
        return {
            run: (el, hot_state=null) => {
                const store = redux.createStore(combined_reducer, hot_state);
                const actions = with_dispatch(actionCreators, store.dispatch);
                store.subscribe(() => {
                    const containers = update(store.getState(), el, actions);
                    // TODO
                });
                create(store.getState(), el, actions);
                update(store.getState(), el, actions);
            }
        };
    };
}

export function createReducer(initialState, handlers) {
    return function reducer(state = initialState, action) {
        if (handlers.hasOwnProperty(action.type)) {
            return handlers[action.type](state, action);
        } else {
            return state;
        }
    };
}

export function objectOf(cls) {
    return [OBJECT_OF, cls];
}

export function arrayOf(cls) {
    return [ARRAY_OF, cls];
}
