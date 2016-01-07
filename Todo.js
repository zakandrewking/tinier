import * as d3 from 'd3';
import { createClass, createReducer } from './red3';
import { CHANGE_TEXT, MARK_COMPLETED, ADD_SUBTASK } from './actionTypes';

const empty_todo = {
    text: '',
    completed: false,
    subtasks: []
};

export const Todo = createClass({
    reducer: (state=empty_todo, action) => {
        switch (action.type) {
        case CHANGE_TEXT:
            return Object.assign({}, state, {
                text: action.text
            });
        case MARK_COMPLETED:
            return Object.assign({}, state, {
                completed: action.completed
            });
        case ADD_SUBTASK:
            return Object.assign({}, state, {
                subtasks: [...state.subtasks, action.text]
            });
        default:
            return state;
        }
    },
    actionCreators: {
        [MARK_COMPLETED]: data => {
            return { type: MARK_COMPLETED, completed: data.completed };
        }
    },
    create: (state, el, actions) => {
        const sel = d3.select(el);
        sel.on('click', function() {
            actions[MARK_COMPLETED]({ completed: !state.completed });
        });
        sel.append('span').attr('class', 'check')
            .text(state.completed ? '✓' : '✗');
        sel.append('span').attr('class', 'text')
            .text(state.text);
    },
    update: (state, el) => {

    }
});
