import { format } from 'date-fns'
import $ from 'jQuery'

import { Component } from '../component'

const { hostname } = window.location

export class DatedChart extends Component {
  constructor($el: JQuery<HTMLElement>) {
    super()
    this.$el = $el
    $el.find('.annotation-text').each((_, el) => {
      const $el = $(el)
      if ($el.text().startsWith(hostname)) {
        this.$label = $el
      }
    })
  }

  private $el: JQuery<HTMLElement>
  private $label?: JQuery<HTMLElement>

  onStart = (): void => {
    this.$el
      .find('svg rect')
      .first()
      .css('fill', '#f7eaf7')
      .css('fill-opacity', 0.3)
  }

  onDateChange = (newDate: Date): void => {
    this.$label?.text(`${hostname} ${format(newDate, 'M/d/yy')}`)
  }
}
