import { format } from 'date-fns'
import $ from 'jquery'
import numeral from 'numeral'

import { Component } from '../component'
import { model } from '../model'
import { getStudyByDetailsUrl, Study, Outcome } from '../studies'
import './summary.css'

const getImprovement = (outcome?: Outcome) => {
  if (outcome?.improvementPercent == null) {
    return ''
  }

  const percent = outcome.improvementPercent / 100
  const percentString = numeral(percent).format('0.0%')
  if (percent > 0) {
    return `<span class="improvement better">↓${percentString}</span>`
  }

  if (percent < 0) {
    return `<span class="improvement worse">↑${percentString}</span>`
  }

  return `<span class="improvement equal">${percentString}</span>`
}

export class StudySummary extends Component {
  constructor(studies: Array<Study>) {
    super()

    this.$view = $(`<div id="study-summary" />`)
    this.studies = studies
    $('.toc').prepend(this.$view)

    $('a').each((i, el) => {
      const $a = $(el)
      let href = $a.attr('href')
      if (!href) {
        return
      }

      if (href.startsWith('#')) {
        const citedHref = $(href).find('a[target="_blank"]').attr('href')
        if (!citedHref) {
          return
        }

        href = citedHref
      }
      const study = getStudyByDetailsUrl(href)
      if (!study) {
        return
      }

      $a.on('mouseover', () => model.showStudy(study)).on('mouseout', () =>
        model.hideStudy(),
      )
    })
  }

  private $view: JQuery<HTMLElement>
  private studies: Array<Study>

  onStart = (): void => {
    // Empty
  }

  onDateChange = (
    newDate: Date,
    prevDate: Date,
    changed: Array<Study>,
  ): void => {
    const published = this.studies.filter(
      (study) => study.isInAnalysis && study.date <= newDate,
    )
    if (!published.length) {
      return
    }

    this.onShowStudy(published[published.length - 1])
  }

  onExclusion = (): void => {
    // Empty
  }

  onShowStudy = (study: Study) => {
    this.$view
      .html(
        `<a target="_blank" href="${
          study.detailsUrl
        }"><span class="date">${format(
          study.date,
          'M/d/yy',
        )}</span> <span class="author">${study.author}</span> ${getImprovement(
          study.primaryOutcome,
        )} ${study.title}</a>`,
      )
      .css('display', 'block')
  }

  onHideStudy = () => {
    this.$view.css('display', 'none')
  }
}
