import $ from 'jQuery'

import {
  initialise as initialiseStudies,
  getStudyByDetailsUrl,
  Study,
} from './studies'
import { model } from './model'
import { Spinner } from './spinner'
import { Timeline } from './timeline'

export const createGetStudiesIncludedInAnalysis =
  (selector: string) => (): Array<Study> => {
    const studies: Array<Study> = []

    $(selector).each((_, el) => {
      const $el = $(el)
      const $a = $el.is('a') ? $el : $el.parent()
      const href = $a.attr('xlink:href')
      if (!href) {
        console.log("Can't find study href", el)
        return
      }
      const study = getStudyByDetailsUrl(href)
      if (!study) {
        return
      }
      studies.push(study)
    })

    return studies
  }

export const init = async (
  getStudiesIncludedInAnalysis: () => Array<Study>,
): Promise<typeof model> => {
  new Spinner()

  const studies = await initialiseStudies(getStudiesIncludedInAnalysis)

  model.setStudies(studies)

  new Timeline(studies)

  return model
}
