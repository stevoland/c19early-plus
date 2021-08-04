import { startOfDay } from 'date-fns'
import EventEmitter from 'eventemitter3'

import { Study } from './studies'

class Model extends EventEmitter {
  private date = startOfDay(new Date())
  private studies: Array<Study> = []

  setStudies(studies: Array<Study>) {
    this.studies = studies
  }

  start(): void {
    this.emit('start')
  }

  changeDate(newDate: Date): void {
    if (newDate === this.date) {
      return
    }
    const prevDate = this.date
    this.date = newDate

    const changed = this.studies.filter((study) => {
      if (newDate < prevDate) {
        if (study.isPublished && study.date > newDate) {
          study.isPublished = false
          return true
        }
      } else if (!study.isPublished && study.date <= newDate) {
        study.isPublished = true
        return true
      }

      return false
    })

    this.emit('dateChange', newDate, prevDate, changed)
  }

  toggleExclusion(study: Study): void {
    study.isExcluded = !study.isExcluded
    this.emit('onExclusion', study)
  }

  showStudy(study: Study): void {
    this.emit('onShowStudy', study)
  }

  hideStudy(): void {
    this.emit('onHideStudy')
  }
}

export const model = new Model()
