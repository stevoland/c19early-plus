import $ from 'jQuery'
import { flatten } from 'lodash'
import { createGetStudiesIncludedInAnalysis, init } from '../init'
import { BarChart } from '../bar-chart'
import { BoxPlot } from '../box-plot'
import { ForestPlot } from '../forest-plot'
import { Study } from '../studies'

export const studiesUrl = 'https://c19ivermectin.com'

const notLate = (study: Study) => study.stage !== 'late'

export const initialise = async (): Promise<void> => {
  const getStudiesIncludedInAnalysis = createGetStudiesIncludedInAnalysis(
    '#fig_fpall .infolayer .annotation a tspan',
  )

  const model = await init(getStudiesIncludedInAnalysis)

  new ForestPlot($('#fig_fpep'))
  new ForestPlot($('#fig_fpd'), {
    title: 'All %s ivermectin COVID-19 mortality results',
  })
  new ForestPlot($('#fig_fpm'), {
    title: 'All %s ivermectin COVID-19 mechanical ventilation results',
  })
  new ForestPlot($('#fig_fpi'), {
    title: 'All %s ivermectin COVID-19 ICU results',
  })
  new ForestPlot($('#fig_fph'), {
    title: 'All %s ivermectin COVID-19 hospitalization results',
  })
  new ForestPlot($('#fig_fpc'), {
    title: 'All %s ivermectin COVID-19 case results',
  })
  new ForestPlot($('#fig_fpv'), {
    title: 'All % ivermectin COVID-19 viral clearance results',
  })
  new ForestPlot($('#fig_fpp'), {
    title: 'All %s ivermectin COVID-19 peer reviewed trials',
  })
  new ForestPlot($('#fig_fpr'), {
    title: 'All %s ivermectin COVID-19 Randomized Controlled Trials',
  })
  new ForestPlot($('#fig_fprd'), {
    title: 'All %s ivermectin COVID-19 RCT mortality results',
  })
  new ForestPlot($('#fig_fpe'), {
    title: 'All %s ivermectin COVID-19 studies with exclusions',
  })

  const earlyChart = new BarChart($('#fig_plotearly'))
  const earlyStudies = earlyChart.getStudies()

  const allChart = new BarChart($('#fig_plotall'))
  const allStudies = allChart.getStudies()

  new BoxPlot($('#fig_plotsp'), [earlyStudies, allStudies])

  new BarChart($('#fig_stageearly'))

  new BarChart($('#fig_stagelate'))

  new BarChart($('#fig_stagepep'))

  const rctChart = new BarChart($('#fig_rct'))
  const rcts = rctChart.getStudies()
  const nonRcts = allStudies.filter((study) => !rcts.includes(study))

  new BoxPlot($('#fig_plotsprct'), [rcts, nonRcts])

  const rctsNotLate = rcts.filter(notLate)
  const nonRctsNotLate = nonRcts.filter(notLate)
  new BoxPlot($('#fig_plotsprcte'), [rctsNotLate, nonRctsNotLate])

  new BarChart($('#fig_rcte'))

  const allForest = new ForestPlot($('#fig_fpall'), {
    title: 'All %s ivermectin COVID-19 studies',
  })
  const groupedStudies = allForest.groupedStudies
  const allTreatmentStudies = allForest.allStudies

  if (groupedStudies.length === 3 && allTreatmentStudies.length) {
    new BoxPlot($('.nobreak #fig_plotsp'), [
      groupedStudies[2],
      groupedStudies[0],
      groupedStudies[1],
      allTreatmentStudies,
    ])
  }

  // // 1 study mis-aligned
  // const prospective = allStudies.filter(
  //   (study) =>
  //     study.features.has(StudyFeature.Prospective) ||
  //     study.features.has(StudyFeature.RCT),
  // )
  // const retrospective = allStudies.filter(
  //   (study) => !prospective.includes(study),
  // )
  // console.log(prospective)
  // console.log(retrospective)
  // new BoxPlot($('#fig_proretro'), [prospective, retrospective])

  model.start()
}
