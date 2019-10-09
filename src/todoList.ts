import './todoList.css'
import { Component, Element } from '../package/index'
import { Todo, OnTodoChange } from './app'
import TodoItem from './todoItem'
import TodoEditInput from './todoEditInput'

class TodoList extends Component<{
  items: Todo[];
  onTodoAdd: (content: string) => void;
  onTodoChange: OnTodoChange;
}, {
  editingTodoIndex?: number,
}> {

  onTodoContent = (value: string) => {
    if (value) {
      let todoIndex = this.state.editingTodoIndex!
      let { onTodoChange, items } = this.props
      let todo = items[todoIndex]
      onTodoChange(todo, { content: value })
    }
    this.setState({
      editingTodoIndex: -1,
    })
  }

  onTodoKeydown = (event: any) => {
    if (event.keyCode !== 13) {
      return
    }

    let input = event.currentTarget
    let value = input.value.trim()
    if (value) {
      this.props.onTodoAdd(value)
      input.value = ''
    }
  }

  onTodoChange: OnTodoChange = (todo, payload) => {
    this.props.onTodoChange(todo, payload)
  }

  onShowInput = (index: number) => {
    this.setState({
      editingTodoIndex: index,
    })
  }

  onGlobalClick = (event: MouseEvent) => {
    let target = event.target as HTMLElement
    let isTodoItem = target.classList.contains('content') &&
      target.parentElement &&
      target.parentElement.classList.contains('todo-item')
    let isTodoEditInput = target.parentElement && target.parentElement.classList.contains('todo-edit-input')
    let resetIndex = !isTodoItem && !isTodoEditInput
    if (resetIndex) {
      this.setState({
        editingTodoIndex: -1,
      })
    }
  }

  componentDidMount() {
    window.addEventListener('click', this.onGlobalClick)
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onGlobalClick)
  }

  render() {
    const { items } = this.props
    return Element(
      'section',
      { className: 'todo-list-container' },
      Element(
        'header',
        { className: 'todo-list-header' },
        Element(
          'input',
          {
            className: 'todo-input',
            onKeyDown: this.onTodoKeydown,
            placeholder: '点这里输入内容后按 Enter 创建',
          },
        ),
      ),
      Element(
        'ul',
        { className: 'todo-list' },
        ...items.map((item, index) =>
          this.state.editingTodoIndex === index
          ? Element(
            TodoEditInput,
            {
              value: item.content,
              onInput: this.onTodoContent,
            },
          )
          : Element(
            TodoItem,
            {
              index,
              key: item.id,
              todo: item,
              onTodoChange: this.onTodoChange,
              onShowInput: this.onShowInput,
            },
          )
        ),
      ),
      Element(
        'footer',
        { className: 'todo-list-footer' },
        Element(
          'span',
          { className: 'todo-count' },
          `${items.length || 'No'} items left.`
        ),
      ),
    )
  }
}

export default TodoList
