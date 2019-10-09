import { Element } from '../package/index'
import './todoEditInput.css'

const TodoEditInput: MR.FunctionComponent<{
  value: string;
  onInput: (content: string) => void;
}> = (props) => {

  const onKeyDown = (event: any) => {
    if (event.keyCode === 13) {
      let value = event.currentTarget.value.trim()
      props.onInput(value)
    }
  }

  return Element(
    'div',
    { className: 'todo-edit-input' },
    Element(
      'input',
      {
        value: props.value,
        onKeyDown,
        autoFocus: true,
      },
    ),
  )
}

export default TodoEditInput
