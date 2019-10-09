import './todoItem.css'
import { Component, Element } from '../package/index'
import { Todo, OnTodoChange } from './app'

export default class TodoItem extends Component<{
  todo: Todo;
  index: number;
  onTodoChange: OnTodoChange;
  onShowInput: (index: number) => void;
}> {

  onCompleteToggle = () => {
    let { todo, onTodoChange } = this.props
    onTodoChange(todo, { completed: !todo.completed })
  }

  onDelete = () => {
    let { todo, onTodoChange } = this.props
    onTodoChange(todo, null)
  }

  onShowInput = () => {
    this.props.onShowInput(this.props.index)
  }

  render() {
    let { todo } = this.props

    return Element(
      'li',
      { className: `todo-item ${todo.completed ? 'completed' : ''}` },
      Element(
        'span',
        {
          dangerouslySetInnerHTML: { __html: todo.completed ? '&#xe605;' : '' },
          className: 'rsfont',
          onClick: this.onCompleteToggle,
        },
      ),
      // todo.content,
      Element(
        'span',
        { onClick: this.onShowInput, className: 'content' },
        todo.content,
      ),
      Element(
        'label',
        { className: 'destroy', onClick: this.onDelete },
        '×',
      ),
    )
  }
}
