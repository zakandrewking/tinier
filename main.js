/** redux-my-d3 test */

import { createClass, createReducer, objectOf, arrayOf } from './red3';
import { TodoList } from './TodoList';
import { Todo } from './Todo';
import { Subtask } from './Subtask';
import { AddButton } from './AddButton';

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
});

actions.ADD_TODO({ text: 'new' });
