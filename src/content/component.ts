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
}
