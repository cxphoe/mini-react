import './app.css'
import { Component, Element } from '../package/index'
import TodoList from './todoList'

export interface Todo {
  id: string;
  content: string;
  completed: boolean;
}

export type OnTodoChange = (todo: Todo, payload: Partial<Todo> | null) => void;

const createTodo = (content: string, completed: boolean = false): Todo => {
  return {
    content,
    id: content,
    completed,
  }
}

export default class App extends Component<{}, {
  todoItems: Todo[];
}> {
  state = {
    todoItems: [
      createTodo('ClassComponent lifeStyles', true),
      createTodo('ClassComponent setState', true),
      createTodo('FunctionComponent'),
      createTodo('Hooks'),
    ],
  };

  onTodoAdd = (content: string) => {
    this.setState({
      todoItems: [
        ...this.state.todoItems,
        createTodo(content),
      ],
    })
  }

  onTodoChange: OnTodoChange = (todo, payload) => {
    let items = [...this.state.todoItems]
    let index = items.indexOf(todo)
    console.log(todo, index, payload)
    if (payload === null) {
      // deletion
      items.splice(index, 1)
    } else {
      items[index] = {
        ...items[index],
        ...payload,
      }
    }
    this.setState({
      todoItems: items,
    })
  }

  render() {
    const { todoItems } = this.state
    return Element(
      'div',
      { id: 'app' },
      Element('p', null, 'Todos'),
      Element(
        TodoList,
        { items: todoItems, onTodoAdd: this.onTodoAdd, onTodoChange: this.onTodoChange },
      )
    )
  }
}

