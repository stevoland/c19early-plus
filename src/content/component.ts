import { model } from './model'
import { Study } from './studies'

export abstract class Component {
  constructor() {
    model.on(
      'dateChange',
      (newDate: Date, prevDate: Date, changed: Array<Study>) =>
        this.onDateChange(newDate, prevDate, changed),
    )
    model.on('onExclusion', (changed: Study) => {
      if (this.onExclusion) {
        this.onExclusion(changed)
      }
    })
    model.on('start', () => this.onStart())
    model.on('onShowStudy', (study: Study) => {
      if (this.onShowStudy) {
        this.onShowStudy(study)
      }
    })
    model.on('onHideStudy', () => {
      if (this.onHideStudy) {
        this.onHideStudy()
      }
    })
  }

  abstract onDateChange = (
    date: Date,
    prevDate: Date,
    changed: Array<Study>,
  ): void => {
    //
  }

  abstract onStart = (): void => {
    //
  }

  abstract onExclusion = (changed: Study): void => {
    //
  }

  abstract onShowStudy = (study: Study): void => {
    //
  }

  abstract onHideStudy = (): void => {
    //
  }
}
