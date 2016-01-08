/** redux-my-d3 test */

import { createClass, createReducer, objectOf, arrayOf } from './tinier';
import { TodoList } from './TodoList';
import { Todo } from './Todo';
import { Subtask } from './Subtask';
import { AddButton } from './AddButton';

import { applyMiddleware, createStore } from 'redux';
import createLogger from 'redux-logger';
const logger = createLogger();
const createStoreWithMiddleware = applyMiddleware(logger)(createStore);


const app = TodoList('main', {
    todos: objectOf(Todo('todos', {
        subtasks: arrayOf(Subtask('subtasks'))
    })),
    add: AddButton('addButton')
});

const actions = app.run(document.body, {
    todos: {
        123: {
            text: 'foobar',
            completed: false,
            subtasks: ['a', 'b']
        }
    }
}, createStoreWithMiddleware);

actions.ADD_TODO({ text: 'new' });
