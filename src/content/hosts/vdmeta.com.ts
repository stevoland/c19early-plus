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

  new ForestPlot($('#fig_plotdfp'), {
    title: 'All %s vitamin D COVID-19 treatment studies',
  })
  new ForestPlot($('#fig_fps'), {
    title: 'All %s vitamin D COVID-19 sufficiency studies',
  })

  const treatmentBarChart = new BarChart($('#fig_plotnlevels'))
  const treatmentStudies = treatmentBarChart.getStudies()

  const sufficiencyBarChart = new BarChart($('#fig_plotlevels'))
  const sufficiencyStudies = sufficiencyBarChart.getStudies()

  new BoxPlot($('#fig_plotsp'), [treatmentStudies, sufficiencyStudies])

  new BarChart($('#fig_stageelp'))

  const treatmentForest = new ForestPlot($('#fig_fp'), {
    title: 'All %s vitamin D COVID-19 treatment studies',
  })
  const groupedStudies = treatmentForest.groupedStudies

  if (groupedStudies.length === 3) {
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

  new ForestPlot($('#fig_fpp'), {
    title: 'All %s vitamin D COVID-19 peer reviewed trials',
  })
  new ForestPlot($('#fig_fpr'), {
    title: 'All %s vitamin D COVID-19 Randomized Controlled Trials',
  })
  new ForestPlot($('#fig_fpcd'), {
    title: 'All %s calcifediol/calcitriol COVID-19 studies',
  })
  new ForestPlot($('#fig_fpcc'), {
    title: 'All %s calcifediol COVID-19 studies',
  })
  new ForestPlot($('#fig_fpd'), {
    title: 'All %s vitamin D COVID-19 treatment mortality results',
  })
  new ForestPlot($('#fig_fpc'), {
    title: 'All %s vitamin D COVID-19 treatment case results',
  })
  new ForestPlot($('#fig_fpv'), {
    title: 'All %s vitamin D COVID-19 treatment viral clearance result',
  })
  new ForestPlot($('#fig_fpe'), {
    title: 'All %s vitamin D COVID-19 treatment studies with exclusions',
  })

  model.start()
}
