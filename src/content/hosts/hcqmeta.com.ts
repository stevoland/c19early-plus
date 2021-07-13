import $ from 'jQuery'
import { createGetStudiesIncludedInAnalysis, init } from '../init'
import { BarChart } from '../bar-chart'
import { BoxPlot } from '../box-plot'
import { ForestPlot } from '../forest-plot'
import { StudyFeature } from '../studies'

export const studiesUrl = 'https://c19hcq.com'

export const initialise = async (): Promise<void> => {
  const getStudiesIncludedInAnalysis = createGetStudiesIncludedInAnalysis(
    '#fig_plotall .infolayer .annotation-text a',
  )

  const model = await init(getStudiesIncludedInAnalysis)

  new ForestPlot($('#fig_fpearly'), {
    title: 'All %s hydroxychloroquine COVID-19 early treatment studies',
  })
  new ForestPlot($('#fig_fp'))

  new ForestPlot($('#fig_fpd'), {
    title: 'All %s hydroxychloroquine COVID-19 mortality results',
  })
  new ForestPlot($('#fig_fph'), {
    title: 'All %s hydroxychloroquine COVID-19 hospitalization results',
  })

  // const rctForest = new ForestPlot($('#fig_fpr'), {
  //   title: 'All %s hydroxychloroquine COVID-19 RCTs',
  // })

  new ForestPlot($('#fig_fpre'))

  new BarChart($('#fig_plotearly'))

  const allChart = new BarChart($('#fig_plotall'))
  const allStudies = allChart.getStudies()
  const earlyStudies = allStudies.filter((study) =>
    study.stage?.includes('early'),
  )

  // const rcts = rctForest.allStudies
  // const notRcts = allStudies.filter((study) => !rcts.includes(study))
  // new BoxPlot($('#fig_plotsprct'), [rcts, notRcts])

  new BoxPlot($('#fig_plotsp'), [earlyStudies, allStudies])

  new BarChart($('#fig_stageearly'))

  const lateChart = new BarChart($('#fig_stagelate'))
  const lateStudies = lateChart.getStudies()

  const prepChart = new BarChart($('#fig_stageprep'))
  const prepStudies = prepChart.getStudies()

  const pepChart = new BarChart($('#fig_stagepep'))
  const pepStudies = pepChart.getStudies()

  new BarChart($('#fig_rct'))

  new BarChart($('#fig_rcte'))

  new BoxPlot($('.nobreak #fig_plotsp'), [
    earlyStudies,
    lateStudies,
    prepStudies,
    pepStudies,
    allStudies,
  ])

  new ForestPlot($('#fig_fpe'))

  // const prospective = allStudies.filter(
  //   (study) =>
  //     study.features.has(StudyFeature.Prospective) ||
  //     study.features.has(StudyFeature.RCT),
  // )
  // const retrospective = allStudies.filter(
  //   (study) => !prospective.includes(study),
  // )
  // new BoxPlot($('#fig_plotpro'), [prospective, retrospective])

  model.start()
}
