import './index.css'
import { render, Element } from '../package/index'
import App from './app'

render(
  Element(App, {}),
  document.getElementById('root') as HTMLElement,
)
