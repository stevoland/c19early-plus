import $ from 'jQuery'
import { quantile } from 'd3-array'
import rebound from 'rebound'

import { Component } from '../component'
import { DatedChart } from '../dated-chart'
import { Study } from '../studies'
import './box-plot.css'

type StudyDate = {
  study: Study
  date: Date
  isPublished: boolean
  $el: JQuery<HTMLElement>
}

type GroupedStudies = Array<Array<Study>>

export class BoxPlot extends Component {
  constructor($el: JQuery<HTMLElement>, groupedStudies: GroupedStudies) {
    super()

    const $svg = $el.find('svg')
    const svgNs = 'http://www.w3.org/2000/svg'
    const viewBoxParts = $svg.attr('viewBox')?.split(' ')
    const svgWidth =
      viewBoxParts && viewBoxParts.length === 4
        ? parseFloat(viewBoxParts[2]) - parseFloat(viewBoxParts[0])
        : 1000

    const $layerSubplot = $el.find('.layer-subplot') // .after(elGroup)

    const springSystem = new rebound.SpringSystem()

    const studies: Array<StudyDate> = []
    this.grouped = []
    this.groupUi = []
    let error = false
    groupedStudies.reverse().forEach((studyGroup, i) => {
      if (error) {
        return
      }

      const groupIndex = groupedStudies.length - i - 1

      const scatter = $el.find('.trace.scatter').get(i)
      const $points = $(scatter).find('.point')
      if ($points.length !== studyGroup.length) {
        console.log(
          `BoxPlot points count ${$points.length} !== study length ${studyGroup.length} for group index: ${groupIndex}`,
          $points,
          studyGroup,
        )
        error = true
        return
      }

      this.grouped[i] = []
      const $marker = $($el.find('.layer-above .shapelayer path').get(i))
      const d = $marker.attr('d')
      const match = d?.match(/M([\d.]+),([\d.]+)H([\d.]+)V([\d.]+)H([\d.]+)Z/)
      if (!match) {
        console.log(
          `BoxPlot can't find median marker for group index ${groupIndex}`,
        )
        return
      }
      const width = parseFloat(match[3]) - parseFloat(match[1])
      const x = parseFloat(match[1])
      const y1 = parseFloat(match[2])
      const y2 = parseFloat(match[4])
      const barY = y2 + (y1 - y2) / 2
      $marker
        .attr('d', `M${-width},${match[2]}H${width}V${match[4]}H${-width}Z`)
        .attr('transform', `translate(${x - width / 2},0)`)

      const medianSpring = springSystem.createSpring(150, 10)
      medianSpring.setCurrentValue(x)
      medianSpring.addListener({
        onSpringUpdate: function (_spring) {
          const x = _spring.getCurrentValue()
          $marker.attr('transform', `translate(${x - width / 2},0)`)
        },
      })
      const lowerBar = document.createElementNS(svgNs, 'path')
      lowerBar.classList.add('lower-bar')
      const higherBar = document.createElementNS(svgNs, 'path')
      higherBar.classList.add('higher-bar')

      const iqrLower = document.createElementNS(svgNs, 'path')
      iqrLower.classList.add('iqr-lower')
      const iqrHigher = document.createElementNS(svgNs, 'path')
      iqrHigher.classList.add('iqr-higher')

      this.groupUi.push({
        $marker,
        medianSpring,
        lowerBar,
        higherBar,
        barY,
        y1,
        y2,
        iqrLower,
        iqrHigher,
        zeroX: svgWidth / 2,
      })
      studyGroup.forEach((study, j) => {
        const $point = $($points.get(j))
        const transform = $point.attr('transform')
        const match = transform?.match(/translate\(([\d.]+),/)
        if (!match) {
          console.log('Bad transform value', transform)
          return
        }

        const studyDate = {
          study,
          date: study.date,
          $el: $point,
          isPublished: true,
        }

        studies.push(studyDate)

        this.grouped[i].push({
          studyDate,
          date: study.date,
          x: parseFloat(match[1]),
        })
      })
    })

    if (error) {
      return
    }

    this.groupUi.forEach((ui) => {
      $layerSubplot
        .append(ui.iqrLower)
        .append(ui.iqrHigher)
        .append(ui.lowerBar)
        .append(ui.higherBar)
    })
    this.updateUi()
    $layerSubplot.find('.shapelayer').css('display', 'none')

    this.studies = studies

    new DatedChart($el)
    this.initialised = true
  }

  protected initialised = false
  private grouped: Array<
    Array<{
      studyDate: StudyDate
      date: Date
      x: number
    }>
  >
  private groupUi: Array<{
    $marker: JQuery<HTMLElement>
    medianSpring: rebound.Spring
    lowerBar: SVGPathElement
    higherBar: SVGPathElement
    barY: number
    y1: number
    y2: number
    iqrLower: SVGPathElement
    iqrHigher: SVGPathElement
    zeroX: number
  }>
  private studies: Array<StudyDate> = []

  onStart = (): void => {
    // Empty
  }

  onDateChange = (newDate: Date, prevDate: Date): void => {
    if (!this.initialised) {
      return
    }

    this.studies.forEach((studyDate) => {
      if (newDate < prevDate) {
        if (studyDate.isPublished && studyDate.date > newDate) {
          studyDate.$el.css('opacity', 0)
          studyDate.isPublished = false
        }
      } else if (!studyDate.isPublished && studyDate.date <= newDate) {
        studyDate.$el.css('opacity', 1)
        studyDate.isPublished = true
      }
    })

    this.updateUi()
  }

  private updateUi() {
    this.grouped.forEach((group, i) => {
      const groupUi = this.groupUi[i]
      const studies = group
        .filter((item) => item.studyDate.isPublished)
        .map((item) => item.x)
      if (studies.length < 2) {
        groupUi.$marker.css('opacity', 0)
        groupUi.lowerBar.classList.add('hidden')
        groupUi.higherBar.classList.add('hidden')
        groupUi.iqrLower.classList.add('hidden')
        groupUi.iqrHigher.classList.add('hidden')
      } else {
        const min = studies.reduce((acc, x) => Math.min(acc, x), Infinity)
        const max = studies.reduce((acc, x) => Math.max(acc, x), -Infinity)
        if (min < groupUi.zeroX) {
          const lowerMax = Math.min(max, groupUi.zeroX)
          groupUi.lowerBar.setAttribute(
            'd',
            `M${min},${groupUi.barY}L${lowerMax},${groupUi.barY}`,
          )
          groupUi.lowerBar.classList.remove('hidden')
        } else {
          groupUi.lowerBar.classList.add('hidden')
        }
        if (max > groupUi.zeroX) {
          const higherMin = Math.max(min, groupUi.zeroX)
          groupUi.higherBar.setAttribute(
            'd',
            `M${higherMin},${groupUi.barY}L${max},${groupUi.barY}`,
          )
          groupUi.higherBar.classList.remove('hidden')
        } else {
          groupUi.higherBar.classList.add('hidden')
        }
        const median = quantile(studies, 0.5)
        const q1 = quantile(studies, 0.25)
        const q3 = quantile(studies, 0.75)

        if (median == null || q1 == null || q3 == null) {
          return
        }
        groupUi.medianSpring.setEndValue(median)

        groupUi.$marker.css('opacity', 1)

        if (q1 < groupUi.zeroX) {
          const lowerX2 = Math.min(q3, groupUi.zeroX)
          groupUi.iqrLower.setAttribute(
            'd',
            `M${q1},${groupUi.y1}H${lowerX2}V${groupUi.y2}H${q1}`,
          )
          groupUi.iqrLower.classList.remove('hidden')
        } else {
          groupUi.iqrLower.classList.add('hidden')
        }

        if (q3 > groupUi.zeroX) {
          const higherX1 = Math.max(q1, groupUi.zeroX)
          groupUi.iqrHigher.setAttribute(
            'd',
            `M${higherX1},${groupUi.y1}H${q3}V${groupUi.y2}H${higherX1}`,
          )
          groupUi.iqrHigher.classList.remove('hidden')
        } else {
          groupUi.iqrHigher.classList.add('hidden')
        }
      }
    })
  }
}
