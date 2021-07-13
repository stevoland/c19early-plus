import $ from 'jQuery'
import { flatten } from 'lodash'
import { createGetStudiesIncludedInAnalysis, init } from '../init'
import { BarChart } from '../bar-chart'
import { BoxPlot } from '../box-plot'
import { Study } from '../studies'
import { ForestPlot } from '../forest-plot'

export const studiesUrl = 'https://c19vitamind.com'

export const initialise = async (): Promise<void> => {
  const getStudiesIncludedInAnalysis = createGetStudiesIncludedInAnalysis(
    '#fig_plotdfp .infolayer .annotation a tspan, #fig_fps .infolayer .annotation a tspan',
  )

  const model = await init(getStudiesIncludedInAnalysis)

  new ForestPlot($('#fig_plotdfp'))
  new ForestPlot($('#fig_fps'))

  const treatmentBarChart = new BarChart($('#fig_plotnlevels'))
  const treatmentStudies = treatmentBarChart.getStudies()

  const sufficiencyBarChart = new BarChart($('#fig_plotlevels'))
  const sufficiencyStudies = sufficiencyBarChart.getStudies()

  new BoxPlot($('#fig_plotsp'), [treatmentStudies, sufficiencyStudies])

  new BarChart($('#fig_stageelp'))

  const treatmentForest = new ForestPlot($('#fig_fp'))
  const groupedStudies = treatmentForest.groupedStudies

  if (groupedStudies.length === 4) {
    const allTreatmentStudies = flatten(groupedStudies).sort(
      (a: Study, b: Study) => (a.date < b.date ? -1 : 1),
    )

    new BoxPlot($('.section #fig_plotsp'), [
      groupedStudies[0],
      groupedStudies[1],
      groupedStudies[2],
      allTreatmentStudies,
    ])
  }

  model.start()
}
