import './app.css'
import { useState, Element } from '../package/index'
import TodoList from './todoList'

export interface Todo {
  id: number;
  content: string;
  completed: boolean;
}


export type OnTodoChange = (id: number, payload: Partial<Todo> | null) => void;

const createTodo = (content: string, completed: boolean = false): Todo => {
  return {
    content,
    id: Date.now() + Math.random(),
    completed,
  }
}

const todoArray = [
  createTodo('ClassComponent lifeStyles', true),
  createTodo('ClassComponent setState', true),
  createTodo('FunctionComponent'),
  createTodo('Hooks'),
]

const App: MR.FunctionComponent = () => {
  const [todoItems, setTodoItems] = useState(() => todoArray.reduce((prev, cur) => {
    prev[cur.id] = cur
    return prev
  }, {} as { [key: number]: Todo }))

  const onTodoAdd = (content: string) => {
    let newTodo = createTodo(content)
    setTodoItems({
      ...todoItems,
      [newTodo.id]: newTodo,
    })
  }

  const onTodoChange: OnTodoChange = (id, payload) => {
    if (!(id in todoItems)) {
      return
    }

    let items = { ...todoItems }
    if (payload === null) {
      delete items[id]
    } else {
      items[id] = {
        ...items[id],
        ...payload,
      }
    }

    setTodoItems(items)
  }

  return Element(
    'div',
    { id: 'app' },
    Element('p', null, 'Todos'),
    Element(
      TodoList,
      {
        items: Object.values(todoItems),
        onTodoAdd,
        onTodoChange,
      },
    )
  )
}

export default App
