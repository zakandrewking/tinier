import * as d3 from 'd3';
import { createClass, createReducer } from './red3';
import { CHANGE_SUBTASK_TEXT } from './actionTypes';

export const emptySubtask = { text: '' };

export const Subtask = createClass({
    reducer: createReducer(emptySubtask, {
        [CHANGE_SUBTASK_TEXT]: (state, action) => {
            return {...state, text: action.text};
        }
    }),
    update: (localState, appState, el) => {
        d3.select(el).text(localState);
    }
});
