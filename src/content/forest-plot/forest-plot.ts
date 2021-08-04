import { startOfDay } from 'date-fns'
import $ from 'jQuery'
import { last } from 'lodash'
import numeral from 'numeral'

import { Component } from '../component'
import { DatedChart } from '../dated-chart'
import { model } from '../model'
import { getStudyByDetailsUrl, Study } from '../studies'

type GroupedStudies = Array<Array<Study>>

type EffectSize = [rr: number, ciLower: number, ciUpper: number]

type RowData = {
  percent: number
  effectSize: EffectSize
  treatmentEvents?: number
  treatmentNumber?: number
  controlEvents?: number
  controlNumber?: number
  $percentEl: JQuery<HTMLElement>
  $effectSizeEl: JQuery<HTMLElement>
  $treatmentEl: JQuery<HTMLElement>
  $controlEl: JQuery<HTMLElement>
}

type Row = {
  study: Study
  date: Date
  $els: JQuery<HTMLElement>
  $author: JQuery<HTMLElement>
  $text: JQuery<HTMLElement>
  $point: JQuery<HTMLElement>
  $path: JQuery<HTMLElement>
  $hitSlop: JQuery<SVGPathElement>
  effectSize: EffectSize
  treatmentEvents?: number
  treatmentNumber?: number
  controlEvents?: number
  controlNumber?: number
}

type GroupedRows = Array<Array<Row>>

type Summary = {
  finalPercent: string
  finalEffectSize: string
  finalTreatment: string
  finalControl: string
  finalImprovement: string
  finalHeterogenicity: string
  $effectSizeEl: JQuery<HTMLElement>
  $treatmentEl: JQuery<HTMLElement>
  $controlEl: JQuery<HTMLElement>
  $improvementEl: JQuery<HTMLElement>
  $heterogenicity: JQuery<HTMLElement>
  $percentEl: JQuery<HTMLElement>
  $diamondEl: JQuery<HTMLElement>
  diamondY1: string
  diamondY2: string
  diamondY3: string
}

type SummaryCache = {
  percentText: string
  effectText: string
  treatmentText: string
  controlText: string
  improvementText: string
  effectSize?: EffectSize
  diamondPath?: string
}

type Opts = {
  title?: string
}

const svgNs = 'http://www.w3.org/2000/svg'

const sprintf = (format: string, ...args: Array<string | number>) => {
  let i = 0
  return format.replace(/%s/g, () => `${args[i++]}`)
}

const getPositionFromTransformValue = (transform?: string) => {
  const match = transform?.match(/translate\(([\d.]+),([\d.]+)/)
  if (!match) {
    return undefined
  }

  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
  }
}

const getRowData = ($els: JQuery<HTMLElement>): RowData => {
  const rowData: Partial<RowData> = {}

  $els.each((i, el) => {
    const $el = $(el)
    if (!rowData.effectSize) {
      const match = /([.\d]+) \[([.\d]+)-([.\d]+)\]/.exec($el.text())
      if (match) {
        rowData.effectSize = [
          parseFloat(match[1]),
          parseFloat(match[2]),
          parseFloat(match[3]),
        ]
        rowData.$effectSizeEl = $el
        return
      }
    }

    if (!rowData.treatmentNumber || !rowData.controlNumber) {
      let match = /([,\d]+)\/([,\d]+)/.exec($el.text())
      if (match) {
        const events = parseFloat(match[1])
        const number = parseFloat(match[2])
        if (!rowData.treatmentNumber) {
          rowData.treatmentEvents = events
          rowData.treatmentNumber = number
          rowData.$treatmentEl = $el
        } else {
          rowData.controlEvents = events
          rowData.controlNumber = number
          rowData.$controlEl = $el
        }
        return
      }
      match = /([,\d]+)$/.exec($el.text())
      if (match) {
        const number = parseFloat(match[1])
        if (!rowData.treatmentNumber) {
          rowData.treatmentNumber = number
          rowData.$treatmentEl = $el
        } else {
          rowData.controlNumber = number
          rowData.$controlEl = $el
        }
        return
      }
    }

    if (!rowData.percent) {
      const match = /(-?[\d]+)%$/.exec($el.text())
      if (match) {
        rowData.percent = parseInt(match[1])
        rowData.$percentEl = $el
        return
      }
    }
  })

  return rowData as RowData
}

const getXFromPath = ($el: JQuery<HTMLElement>) => {
  const d = $el.attr('d')
  if (d == null) {
    return undefined
  }

  const match = /M([\d.]+)/.exec(d)
  if (!match) {
    return undefined
  }

  return parseFloat(match[1])
}

const updateHeterogenicity = (
  $el: JQuery<HTMLElement>,
  opts: { Tau2: number; I2: number; Z?: number },
) => {
  const Tau2 = numeral(opts.Tau2).format('0.00')
  const I2 = numeral(opts.I2 / 100).format('0.0%')
  let html = `Tau&ZeroWidthSpace;<tspan style="font-size:70%" dy="-0.6em">2</tspan><tspan dy="0.42em">&ZeroWidthSpace;</tspan> = ${Tau2}; I&ZeroWidthSpace;<tspan style="font-size:70%" dy="-0.6em">2</tspan><tspan dy="0.42em">&ZeroWidthSpace;</tspan> = ${I2}`
  if (opts.Z) {
    const Z = numeral(opts.Z).format('0.00')
    html += `; Z = ${Z}`
  }
  $el.html(html)
}

export class ForestPlot extends Component {
  constructor($el: JQuery<HTMLElement>, opts: Opts = {}) {
    super()

    const currentDate = startOfDay(new Date())
    this.currentDate = currentDate
    this.finalDate = currentDate
    this.latestStudyDate = currentDate

    if (opts.title) {
      this.titlePattern = opts.title
      const reString = opts.title.replace('%s', '([\\d,]+)')
      const re = new RegExp(reString)
      const $title = $el
        .find('tspan[style="font-weight:bold"]')
        .filter(function () {
          const $tspan = $(this)
          const text = $tspan.text()
          return !!re.exec(text)
        })
      if ($title.length) {
        this.$title = $title
      }
    }

    const $svg = $el.find('svg')
    const viewBoxParts = $svg.attr('viewBox')?.split(' ')
    const svgWidth =
      viewBoxParts && viewBoxParts.length === 4
        ? parseFloat(viewBoxParts[2]) - parseFloat(viewBoxParts[0])
        : 700

    let error = false
    const summaryYpos: Array<number> = []

    const $fills = $el.find('.js-fill').remove()
    const $diamonds = $el.find('.js-line').each((i, el) => {
      const $el = $(el)
      const fill = $fills.length ? $el.css('stroke') : 'none'
      $el.css('fill', fill)
    })
    $fills.remove()

    $el.find('tspan[style="font-weight:bold"]').each((i, el) => {
      const $tspan = $(el)
      if (!$tspan.text().endsWith('improvement')) {
        return
      }

      const $g = $tspan.closest('.cursor-pointer')
      const position = getPositionFromTransformValue($g.attr('transform'))
      if (!position) {
        console.log('Cannot get position from', $g)
        error = true
        return
      }
      const height = parseFloat($g.find('rect').attr('height') || '0')

      let $summaryEls = $()

      const $heterogenicityList = $el
        .find('.annotation-text, tspan.line')
        .filter(function () {
          const $text = $(this)
          return $text.text().startsWith('Tau')
        })

      $g.closest('.annotation')
        .siblings('.annotation')
        .find('.cursor-pointer')
        .each((i, el) => {
          const $el = $(el)
          const pos = getPositionFromTransformValue($el.attr('transform'))
          if (pos && pos.y >= position.y && pos.y < position.y + height) {
            const $text = $el.find('.annotation-text')
            if ($text.length) {
              $summaryEls = $summaryEls.add($text)
            }
          }
        })

      const rowData = getRowData($summaryEls)
      const $diamondEl = $($diamonds.get(this.summaries.length))
      const diamondMatch = ($diamondEl.attr('d') as string).match(/([\d.]+)L/g)
      if (!diamondMatch) {
        console.log('Cannot get diamondY')
        error = true
        return
      }

      const $heterogenicity = $($heterogenicityList.get(this.summaries.length))
      this.summaries.push({
        ...rowData,
        $improvementEl: $tspan,
        $heterogenicity,
        $diamondEl,
        diamondY1: diamondMatch[0].slice(0, -1),
        diamondY2: diamondMatch[1].slice(0, -1),
        diamondY3: diamondMatch[3].slice(0, -1),
        finalPercent: rowData.$percentEl.text(),
        finalEffectSize: rowData.$effectSizeEl.text(),
        finalTreatment: rowData.$treatmentEl.text(),
        finalControl: rowData.$controlEl.text(),
        finalImprovement: $tspan.text(),
        finalHeterogenicity: $heterogenicity.html(),
      })

      summaryYpos.push(position.y)
    })

    this.groupedStudies = summaryYpos.map((): Array<Study> => [])
    this.groupedRows = summaryYpos.map((): Array<Row> => [])

    const $plot = $el.find('.plot')
    const plotPos = getPositionFromTransformValue($plot.attr('transform'))
    if (!plotPos) {
      console.log('Cannot get position from .plot', $plot)
      error = true
      return
    }

    const $points = $plot.find('.points .point')
    const pointYs: Array<number> = []
    $points.each((i, el) => {
      const $el = $(el)
      const pointPos = getPositionFromTransformValue($el.attr('transform'))
      if (!pointPos) {
        return
      }
      pointYs.push(pointPos.y + plotPos.y)
    })
    const $paths = $el.find('.layer-subplot .shapelayer path')
    const pathYs: Array<number> = []
    $paths.each((i, el) => {
      const $el = $(el)
      const d = $el.attr('d') || ''
      const dParts = d.split(',')
      const y = parseFloat(dParts[dParts.length - 1])
      pathYs.push(y)
    })
    const $pathZero = $paths.last()
    const pathZeroX = getXFromPath($pathZero)

    const $pathUnity = $pathZero.prev()
    const pathUnityX = getXFromPath($pathUnity)
    if (pathZeroX == null || pathUnityX == null) {
      console.log(
        'Cannot get position from path 0 or unity',
        $pathZero,
        $pathUnity,
      )
      error = true
      return
    }
    this.unityX = pathUnityX - pathZeroX
    this.diamondOffset = plotPos.x - pathZeroX

    $el.find('.annotation a rect').each((i, el) => {
      const $rect = $(el)
      const $a = $rect.closest('a')
      const href = $a.attr('xlink:href')
      if (!href) {
        error = true
        console.log('Cannot get href for anchor', $a)
        return
      }
      const study = getStudyByDetailsUrl(href)
      if (!study) {
        error = true
        console.log('Cannot get study for href', href)
        return
      }

      const $g = $a.closest('.cursor-pointer')
      const position = getPositionFromTransformValue($g.attr('transform'))
      if (!position) {
        console.log('Cannot get position from', $g)
        error = true
        return
      }

      const height = parseFloat($rect.attr('height') as string)

      $g.on('mouseover', () => model.showStudy(study)).on('mouseout', () =>
        model.hideStudy(),
      )

      const hitSlop = document.createElementNS(svgNs, 'path')
      hitSlop.setAttribute(
        'd',
        `M0,${position.y}H${svgWidth}V${position.y + height}H0`,
      )
      hitSlop.setAttribute('style', `opacity: 0; cursor: not-allowed;`)
      $svg.find('.layer-above').append(hitSlop)
      const $hitSlop = $(hitSlop)
      $hitSlop
        .on('click', () => model.toggleExclusion(study))
        .on('mouseover', () => model.showStudy(study))
        .on('mouseout', () => model.hideStudy())

      const summaryIndex = summaryYpos.findIndex((y, i) => {
        return y > position.y
      })
      this.groupedStudies[summaryIndex].push(study)

      const $annotation = $g.closest('.annotation')
      let $els = $($annotation.get())
      const $author = $($annotation.get())
      let $text = $()
      let $point = $()
      let $path = $()
      $annotation.siblings('.annotation').each((i, el) => {
        const $el = $(el)
        const $pointer = $el.find('.cursor-pointer')
        const pos = getPositionFromTransformValue($pointer.attr('transform'))
        if (!pos || pos.y < position.y - 1 || pos.y > position.y + height / 2) {
          return
        }

        $els = $els.add(el)
        $text = $text.add(el).css('pointer-events', 'none')
      })

      const rowData = getRowData($els)

      pointYs.some((y, i) => {
        if (isNaN(y) || y < position.y + 2 || y > position.y + height - 1) {
          return false
        }
        $els = $els.add($points.get(i))
        $point = $point.add($points.get(i))
        return true
      })
      pathYs.forEach((y, i) => {
        if (isNaN(y) || y < position.y + 2 || y > position.y + height - 1) {
          return
        }
        $els = $els.add($paths.get(i))
        $path = $path.add($paths.get(i))
      })

      const row = {
        study,
        date: study.date,
        isPublished: true,
        $els,
        $author,
        $text,
        $point,
        $path,
        $hitSlop,
        ...rowData,
      }
      this.rows.push(row)
      this.groupedRows[summaryIndex].push(row)
    })

    this.rows.sort((a: Row, b: Row) => (a.date < b.date ? -1 : 1))

    const finalRow = last(this.rows)
    if (finalRow) {
      this.finalStudyDate = finalRow.date
    }

    if (this.groupedRows[this.groupedRows.length - 1].length === 0) {
      this.groupedRows.splice(-1, 1)
      this.groupedStudies.splice(-1, 1)
    }

    if (error) {
      return
    }

    new DatedChart($el)
    this.initialised = true
  }

  initialised = false
  groupedStudies: GroupedStudies = []
  groupedRows: GroupedRows = []
  rows: Array<Row> = []
  summaries: Array<Summary> = []
  currentDate: Date
  finalDate: Date
  latestStudyDate: Date
  finalStudyDate?: Date
  cache = new Set()

  unityX = 0
  diamondOffset = 150

  $title?: JQuery<HTMLElement>
  titlePattern?: string

  get allStudies(): Array<Study> {
    return this.rows.map((row) => row.study)
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
    this.currentDate = newDate

    const changedRows = this.changedRows(changed)

    if (changedRows.length) {
      this.latestStudyDate = newDate
      this.updateUi(changedRows)
    }
  }

  onExclusion = (changed: Study): void => {
    const changedRows = this.changedRows([changed])

    if (changedRows.length) {
      changedRows.forEach((row) => {
        row.$hitSlop.css(
          'cursor',
          row.study.isExcluded ? 'crosshair' : 'not-allowed',
        )
      })
      this.updateUi(changedRows)
    }
  }

  changedRows = (changed: Array<Study>): Array<Row> => {
    return changed.reduce((acc: Array<Row>, study: Study): Array<Row> => {
      const rows = this.rows.filter((row) => row.study === study)

      return [...acc, ...rows]
    }, [])
  }

  updateUi = (changedRows: Array<Row>): void => {
    changedRows.forEach((row) => {
      if (row.study.isPublished) {
        row.$els.each((i, el) => {
          el.classList.remove('hidden')
        })
        row.$hitSlop.removeClass('hidden')
      } else {
        row.$els.each((i, el) => {
          el.classList.add('hidden')
        })
        row.$hitSlop.addClass('hidden')
      }

      row.$author
        .css('text-decoration', row.study.isExcluded ? 'line-through' : 'none')
        .css('opacity', row.study.isExcluded ? 0.7 : 1)
      row.$text.css('opacity', row.study.isExcluded ? 0.3 : 1)
      row.$point.css('opacity', row.study.isExcluded ? 0.2 : 0.7)
      row.$path.css('opacity', row.study.isExcluded ? 0.1 : 0.5)
    })

    if (this.$title && this.titlePattern) {
      const totalCount = this.rows.filter(
        (row) => row.study.isPublished && !row.study.isExcluded,
      ).length
      this.$title.text(sprintf(this.titlePattern, totalCount || ''))
    }

    const counts = this.groupedRows.reduce(
      (acc, rows, i) => {
        const counts = rows.reduce(
          (acc, row) => {
            if (!row.study.isPublished || row.study.isExcluded) {
              return acc
            }

            return {
              treatmentEvents: acc.treatmentEvents + (row.treatmentEvents || 0),
              treatmentNumber: acc.treatmentNumber + (row.treatmentNumber || 0),
              controlEvents: acc.controlEvents + (row.controlEvents || 0),
              controlNumber: acc.controlNumber + (row.controlNumber || 0),
            }
          },
          {
            treatmentEvents: 0,
            treatmentNumber: 0,
            controlEvents: 0,
            controlNumber: 0,
          },
        )

        let treatment = ''
        let control = ''
        if (counts.treatmentNumber && counts.controlNumber) {
          treatment = `${numeral(counts.treatmentEvents || 0).format(
            '0,0',
          )}/${numeral(counts.treatmentNumber).format('0,0')}`
          control = `${numeral(counts.controlEvents || 0).format(
            '0,0',
          )}/${numeral(counts.controlNumber).format('0,0')}`
        }
        this.summaries[i].$treatmentEl.text(treatment)
        this.summaries[i].$controlEl.text(control)

        return {
          treatmentEvents: acc.treatmentEvents + (counts.treatmentEvents || 0),
          treatmentNumber: acc.treatmentNumber + (counts.treatmentNumber || 0),
          controlEvents: acc.controlEvents + (counts.controlEvents || 0),
          controlNumber: acc.controlNumber + (counts.controlNumber || 0),
        }
      },
      {
        treatmentEvents: 0,
        treatmentNumber: 0,
        controlEvents: 0,
        controlNumber: 0,
      },
    )

    const effectSizes = this.groupedRows.map((rows) =>
      rows
        .filter((row) => row.study.isPublished && !row.study.isExcluded)
        .map((row) => row.effectSize),
    )
    if (effectSizes.length < this.summaries.length) {
      const allEffectSizes = effectSizes.reduce(
        (acc: Array<EffectSize>, row: Array<EffectSize>) => [...acc, ...row],
        [],
      )
      effectSizes.push(allEffectSizes)

      let treatment = ''
      let control = ''
      if (counts.treatmentNumber && counts.controlNumber) {
        treatment = `${numeral(counts.treatmentEvents || 0).format(
          '0,0',
        )}/${numeral(counts.treatmentNumber).format('0,0')}`
        control = `${numeral(counts.controlEvents || 0).format(
          '0,0',
        )}/${numeral(counts.controlNumber).format('0,0')}`
      }
      this.summaries[this.summaries.length - 1].$treatmentEl.text(treatment)
      this.summaries[this.summaries.length - 1].$controlEl.text(control)
    }

    chrome.runtime.sendMessage(
      {
        contentScriptQuery: 'getSummaries',
        date: this.latestStudyDate.toString(),
        effects: effectSizes,
      },
      ({ date, summaries }) => {
        // if (date === this.latestStudyDate.toString()) {
        this.updateSummaries(summaries)
        // }
      },
    )
  }

  updateSummaries = (groupedResults) => {
    const hasExclusions = this.rows.some((row) => row.study.isExcluded)

    groupedResults.forEach((results, i) => {
      if (!results.length) {
        this.summaries[i].$percentEl.text('')
        this.summaries[i].$effectSizeEl.text('')
        this.summaries[i].$improvementEl.text('')
        this.summaries[i].$diamondEl.addClass('hidden')
        this.summaries[i].$heterogenicity.text('')
        return
      }

      if (
        !hasExclusions &&
        this.finalStudyDate &&
        this.latestStudyDate >= this.finalStudyDate
      ) {
        this.summaries[i].$heterogenicity.html(
          this.summaries[i].finalHeterogenicity,
        )
      } else {
        updateHeterogenicity(this.summaries[i].$heterogenicity, {
          Tau2: results[0][12],
          I2: results[0][9],
          Z: !this.groupedRows[i] ? results[0][10] : undefined,
        })
      }

      const totals = results[0]
      const es = numeral(totals[1]).format('0.00')
      const ciLower = numeral(totals[3]).format('0.00')
      const ciUpper = numeral(totals[4]).format('0.00')
      const percent = numeral(1 - totals[1]).format('0%')
      const effectSize = `${es} [${ciLower}-${ciUpper}]`
      const improvement = `${percent} improvement`

      const color = totals[1] <= 1 ? 'rgb(0, 117, 76)' : 'rgb(158, 11, 0)'
      this.summaries[i].$percentEl.text(percent)
      this.summaries[i].$effectSizeEl.text(effectSize)
      this.summaries[i].$improvementEl.text(improvement).css('fill', color)
      const x1 = totals[3] * this.unityX - this.diamondOffset
      const x2 = totals[1] * this.unityX - this.diamondOffset
      const x3 = totals[4] * this.unityX - this.diamondOffset
      const { diamondY1, diamondY2, diamondY3 } = this.summaries[i]
      const d = `M${x1},${diamondY1}L${x2},${diamondY2}L${x3},${diamondY1}L${x2},${diamondY3}L${x1},${diamondY1}`

      const fill =
        (totals[1] <= 1 && totals[4] <= 1) || (totals[1] > 1 && totals[3] > 1)
          ? color
          : 'none'
      this.summaries[i].$diamondEl
        .css('stroke', color)
        .css('fill', fill)
        .attr('d', d)
        .removeClass('hidden')
    })
  }
}
