import './todoItem.css'
import { Element } from '../package/index'
import { Todo, OnTodoChange } from './app'

const TodoItem: MR.FunctionComponent<{
  todo: Todo;
  onTodoChange: OnTodoChange;
  onShowInput: (index: number | string) => void;
}> = (props) => {
  let {
    todo,
    onTodoChange,
    onShowInput: inShowInput,
  } = props

  const onCompleteToggle = () => {
    onTodoChange(todo, { completed: !todo.completed })
  }

  const onDelete = () => {
    onTodoChange(todo, null)
  }

  const onShowInput = () => {
    inShowInput(todo.id)
  }

  return Element(
    'li',
    { className: `todo-item ${todo.completed ? 'completed' : ''}` },
    Element(
      'span',
      {
        dangerouslySetInnerHTML: { __html: todo.completed ? '&#xe605;' : '' },
        className: 'rsfont',
        onClick: onCompleteToggle,
      },
    ),
    // todo.content,
    Element(
      'span',
      { onClick: onShowInput, className: 'content' },
      todo.content,
    ),
    Element(
      'label',
      { className: 'destroy', onClick: onDelete },
      '×',
    ),
  )
}

export default TodoItem
