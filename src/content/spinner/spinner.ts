import $ from 'jquery'

import { Component } from '../component'
import svg from './virus.svg'
import './spinner.css'

export class Spinner extends Component {
  constructor() {
    super()

    this.$view = $(`<div id="spinner">${svg}</div>`)
    $('.toc2').append(this.$view)
  }

  private $view: JQuery<HTMLElement>

  onStart = (): void => {
    this.$view.addClass('loaded')
  }

  onDateChange = (): void => {
    // Emprt
  }
}
