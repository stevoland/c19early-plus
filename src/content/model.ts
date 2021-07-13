import { startOfDay } from 'date-fns'
import EventEmitter from 'eventemitter3'

class Model extends EventEmitter {
  private date = startOfDay(new Date())

  start() {
    this.emit('start')
  }

  changeDate(newDate: Date) {
    if (newDate !== this.date) {
      const prevDate = this.date
      this.date = newDate
      this.emit('dateChange', newDate, prevDate)
    }
  }
}

export const model = new Model()
