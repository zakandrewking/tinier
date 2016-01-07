import * as d3 from 'd3';
import { createClass, createReducer } from './red3';
import { CHANGE_SUBTASK_TEXT } from './actionTypes';

export const Subtask = createClass({
    reducer: createReducer({ text: '' }, {
        CHANGE_SUBTASK_TEST: (state, action) => {
            return Object.assign({}, state, {
                text: action.text
            });
        }
    })
});
