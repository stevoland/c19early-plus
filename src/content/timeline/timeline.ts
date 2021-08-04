import {
  addDays,
  addHours,
  addMonths,
  differenceInDays,
  differenceInMonths,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { debounce, fill } from 'lodash'
import $ from 'jQuery'

import { model } from '../model'
import { Study } from '../studies'
import './timeline.css'

interface SVGAnimateTransformElement extends SVGAnimationElement {
  beginElement(): SVGAnimateTransformElement
}

const pause = 'M11,10 L18,13.74 18,22.28 11,26 M18,13.74 L26,18 26,18 18,22.28'
const play = 'M11,10 L17,10 17,26 11,26 M20,10 L26,10 26,26 20,26'

export class Timeline {
  constructor(studies: Array<Study>) {
    const startDate = startOfMonth(studies[0].date)
    this.startDate = startDate
    const endDate = endOfMonth(studies[studies.length - 1].date)
    const days = differenceInDays(endDate, startDate)
    this.totalDays = days
    this.totalHours = days * 24
    const $view = $('<div id="timeline" />')
    $('#toc').prepend($view)
    const $markers = $('<div class="markers" />')
    $view.append($markers)

    studies.forEach((study) => {
      const day = differenceInDays(study.date, startDate)
      const pc = (day / days) * 100
      const studyEl = $('<div class="study" />')
      if (study.primaryOutcome) {
        if (study.primaryOutcome.improvementPercent > 0) {
          studyEl.addClass('lower')
        } else if (study.primaryOutcome.improvementPercent < 0) {
          studyEl.addClass('higher')
        }
      }
      studyEl.css('left', `${pc}%`)
      $markers.append(studyEl)
    })

    const months = differenceInMonths(endDate, startDate) + 1
    const arr = fill(new Array(months), 0)
    arr.forEach((_: unknown, i: number) => {
      const pc = (i / months) * 100
      const label = format(addMonths(startDate, i), 'MMM')
      const monthEl = $(`<span class="month">${label}</span>`)
      monthEl.css('left', `${pc}%`)

      $markers.append(monthEl)
    })

    const minDate = studies[0].date
    const minDays = differenceInDays(minDate, startDate)
    this.minHours = minDays * 24
    const maxDate = startOfDay(new Date())

    const maxDays = differenceInDays(maxDate, startDate)
    this.maxHours = maxDays * 24
    const pc = (maxDays / days) * 100
    this.curPercent = pc
    this.curHour = (this.totalHours / 100) * pc
    console.log('curHour', this.curHour, this.totalHours)

    const $marker = $('<div class="marker" />')
    $marker.css('left', `${pc}%`)
    $markers.append($marker)
    this.$marker = $marker

    const changeDate = (offsetX: number) => {
      const fraction = offsetX / ($markers.width() as number)
      let newDays = Math.round(days * fraction)
      newDays = Math.max(minDays, newDays)
      newDays = Math.min(newDays, maxDays)
      const newDate = addDays(startDate, newDays)
      this.debouncedChangeDate(newDate)

      const pc = (newDays / days) * 100
      this.curHour = (this.totalHours / 100) * pc

      $marker.css('left', `${pc}%`)
    }

    $markers.on('mousedown', (e) => {
      this.isDragging = true
      changeDate(e.pageX - 50)
      $('body').on('mousemove', (e) => {
        changeDate(e.pageX - 50)
      })

      $('body').on('mouseup', () => {
        this.isDragging = false
        this.prevTick = +new Date()
        $('body').off('mousemove')
      })
    })

    const $button =
      $(`<button class="ytp-play-button ytp-button" aria-live="assertive" aria-label="Play">
    <svg width="100%" height="100%" viewBox="0 0 36 36" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
       <defs>
          <path id="ytp-12" d="${pause}">
             <animate id="animation" begin="indefinite" attributeType="XML" attributeName="d" fill="freeze" from="${pause}" to="${play}" dur="0.1s" keySplines=".4 0 1 1"
             repeatCount="1"></animate>
          </path>
       </defs>
       <use xlink:href="#ytp-12" class="ytp-svg-shadow"></use>
       <use xlink:href="#ytp-12" class="ytp-svg-fill"></use>
    </svg>
 </button>`)

    $view.append($button)
    this.$buttonAnimation = $view.find(
      '#animation',
    ) as unknown as JQuery<SVGAnimateTransformElement>

    $button.on('click', this.onPlayPause)
  }

  startDate: Date
  totalDays: number
  totalHours: number
  minHours: number
  maxHours: number
  curHour: number
  curPercent: number
  prevTick = 0
  isPlaying = false
  isDragging = false
  $buttonAnimation: JQuery<SVGAnimateTransformElement>
  $marker: JQuery<HTMLElement>
  timeout?: NodeJS.Timeout

  private debouncedChangeDate = debounce((date: Date) => {
    model.changeDate(date)
  })

  private onPlayPause = () => {
    if (!this.isPlaying) {
      this.play()
    } else {
      this.pause()
    }
  }

  private updateButton = () => {
    this.$buttonAnimation
      .attr({
        from: !this.isPlaying ? pause : play,
        to: !this.isPlaying ? play : pause,
      })
      .get(0)
      .beginElement()
  }

  private play = () => {
    this.updateButton()
    this.isPlaying = true

    if (this.curHour >= this.maxHours) {
      this.curHour = this.minHours
      this.updateMarker()
      const date = startOfDay(addHours(this.startDate, this.curHour))
      model.changeDate(date)
    }

    this.prevTick = +new Date()
    this.timeout = setTimeout(this.tick, 100)
  }

  private pause = () => {
    this.updateButton()
    this.isPlaying = false

    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  private tick = () => {
    if (!this.isDragging) {
      const now = +new Date()
      const delta = now - this.prevTick
      this.prevTick = now
      const deltaHours = delta
      this.curHour = Math.min(this.maxHours, this.curHour + deltaHours)
      this.updateMarker()
      const date = startOfDay(addHours(this.startDate, this.curHour))
      model.changeDate(date)
      if (this.curHour >= this.maxHours) {
        this.pause()
        return
      }
    }

    this.timeout = setTimeout(this.tick, 10)
  }

  private updateMarker = () => {
    const pc = (this.curHour / this.totalHours) * 100
    this.$marker.css('left', `${pc}%`)
  }
}
