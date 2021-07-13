import { model } from './model'

export abstract class Component {
  constructor() {
    model.on('dateChange', (newDate: Date, prevDate: Date) =>
      this.onDateChange(newDate, prevDate),
    )
    model.on('start', () => this.onStart())
  }

  abstract onDateChange = (date: Date, prevDate: Date): void => {
    //
  }

  abstract onStart = (): void => {
    //
  }
}
