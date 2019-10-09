import { Component, Element } from '../package/index'
import './todoEditInput.css'

export default class TodoEditInput extends Component<{
  value: string;
  onInput: (content: string) => void;
}> {

  onKeyDown = (event: any) => {
    if (event.keyCode === 13) {
      let value = event.currentTarget.value.trim()
      this.props.onInput(value)
    }
  }

  render() {
    return Element(
      'div',
      { className: 'todo-edit-input' },
      Element(
        'input',
        {
          value: this.props.value,
          onKeyDown: this.onKeyDown,
          autoFocus: true,
        },
      ),
    )
  }
}
