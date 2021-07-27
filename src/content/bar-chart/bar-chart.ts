import $ from 'jQuery'
import rebound from 'rebound'

import { Component } from '../component'
import { DatedChart } from '../dated-chart'
import { getStudyByDetailsUrl, Study } from '../studies'

type StudyData = {
  study: Study
  $el: JQuery<HTMLElement>
  midX: number
}

type Label = {
  $el: JQuery<HTMLElement>
  x: number
}

let count = 0

export class BarChart extends Component {
  constructor($el: JQuery<HTMLElement>) {
    super()
    count += 1
    this.$el = $el

    const studies: Array<Study> = []
    const bars: Array<HTMLElement> = []
    const labels: Array<HTMLElement> = []
    let error = false
    $el
      .find('.annotation a')
      .filter(function () {
        const $label = $(this).closest('.annotation')
        return $label.find('a').get(0) === this
      })
      .each((i, a) => {
        const $a = $(a)
        const href = $a.attr('xlink:href')
        if (!href) {
          console.log('Cannot find href', a)
          error = true
          return
        }
        const study = getStudyByDetailsUrl(href)
        if (!study) {
          console.log('Cannot find study for href', href)
          error = true
          return
        }

        const $label = $a.closest('.annotation')
        studies.push(study)
        bars.push(this.$el.find('.point')[i])
        labels.push($label.get(0))
      })

    this.studies = studies.map((study, i) => {
      const d = $(bars[i]).find('path').attr('d')
      let midX = 0
      if (d) {
        const matchX1 = d.match(/M([\d.]+)/)
        if (matchX1 && matchX1.length > 1) {
          const matchX2 = d.match(/H([\d.]+)/)
          if (matchX2 && matchX2.length > 1) {
            const x1 = parseFloat(matchX1[1])
            const x2 = parseFloat(matchX2[1])
            midX = x1 + (x2 - x1) / 2
          }
        }
      }
      return {
        study,
        $el: $([bars[i], labels[i]]),
        midX,
      }
    })

    if (error) {
      return
    }

    const $pCurvePath = $el.find('.scatterlayer .lines path')

    if ($pCurvePath.length) {
      const $svg = $el.find('svg')
      const elWidth = $el.width()
      const svgNs = 'http://www.w3.org/2000/svg'
      const viewBoxParts = $svg.attr('viewBox')?.split(' ')
      const viewBoxWidth =
        viewBoxParts && viewBoxParts.length === 4
          ? parseFloat(viewBoxParts[2]) - parseFloat(viewBoxParts[0])
          : 1500
      const viewBoxHeight =
        viewBoxParts && viewBoxParts.length === 4
          ? parseFloat(viewBoxParts[3]) - parseFloat(viewBoxParts[1])
          : 500

      const clipPathId = `clippcurve${count}`
      const rect = document.createElementNS(svgNs, 'rect')
      rect.setAttribute('width', `${viewBoxWidth}`)
      rect.setAttribute('height', `${viewBoxHeight}`)
      const clipPath = document.createElementNS(svgNs, 'clipPath')
      clipPath.setAttribute('id', clipPathId)
      clipPath.appendChild(rect)
      $svg.find('defs').first().append(clipPath)
      $pCurvePath.attr('clip-path', `url(#${clipPathId})`)

      const springSystem = new rebound.SpringSystem()
      const spring = springSystem.createSpring(150, 10)
      spring.setOvershootClampingEnabled(true)
      spring.addListener({
        onSpringUpdate: function () {
          const width = spring.getCurrentValue()
          rect.setAttribute('width', `${width}`)
        },
      })

      const labels: Array<Label> = []
      $el.find('tspan.line').each((i, el) => {
        const $tspan = $(el)
        const text = $tspan.text().trim()
        const match = text.match(/^[A-Z][a-z][a-z] \d\d?/)
        if (match) {
          const $label = $tspan.closest('.cursor-pointer')
          const transform = $label.attr('transform')
          const matchX = transform?.match(/translate\(([\d.]+),/)
          const width = $label.find('rect').attr('width')
          if (matchX && width) {
            const x1 = parseFloat(matchX[1])
            const w = (parseFloat(width) / viewBoxWidth) * (elWidth as number)
            labels.push({
              $el: $label,
              x: x1 + w,
            })
          }
        }
      })

      this.pCurve = {
        labels,
        spring,
      }
    }

    new DatedChart($el)
    this.initialised = true
  }

  protected initialised = false
  private $el: JQuery<HTMLElement>
  private studies: Array<StudyData>
  private pCurve?: {
    labels: Array<Label>
    spring: rebound.Spring
  }

  onStart = (): void => {
    // Empty
  }

  onDateChange = (
    newDate: Date,
    prevDate: Date,
    changed: Array<Study>,
  ): void => {
    if (!this.initialised) {
      return
    }

    const updateRequired = changed.reduce((acc, study: Study) => {
      const studyData = this.studies.find((data) => data.study === study)
      if (!studyData) {
        return acc
      }

      studyData.$el.css('opacity', study.isPublished ? 1 : 0)

      return true
    }, false)

    if (!updateRequired) {
      return
    }

    if (this.pCurve) {
      const pCurveWidth = this.studies.reduce((acc, studyData) => {
        return studyData.study.isPublished ? Math.max(acc, studyData.midX) : acc
      }, 0)
      this.pCurve.spring.setEndValue(pCurveWidth)
      this.pCurve.labels.forEach(({ $el, x }) => {
        if (x <= pCurveWidth + 10) {
          $el.removeClass('hidden')
        } else {
          $el.addClass('hidden')
        }
      })
    }
  }

  getStudies(): Array<Study> {
    return this.studies.map((studyData) => studyData.study)
  }
}
