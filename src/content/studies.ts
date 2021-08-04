import $ from 'jquery'
import { format, parse } from 'date-fns'
import { sortBy } from 'lodash'

export enum StudyFeature {
  PeerReviewed = 'PeerReviewed',
  PrePrint = 'PrePrint',
  Retrospective = 'Retrospective',
  Prospective = 'Prospective',
  RCT = 'RCT',
  DoubleBlind = 'DoubleBlind',
  SingleBlind = 'SingleBlind',
  QuasiRandomized = 'QuasiRandomized',
  ClusterRandomized = 'ClusterRandomized',
  PSM = 'PSM',
}

export type Outcome = {
  description: string
  improvementPercent: number
  rr?: number
  ciLower?: number
  ciUpper?: number
  pValue: number
  pValueString: string
  treatmentEvents?: number
  treatmentNumber?: number
  controlEvents?: number
  controlNumber?: number
}

export type Study = {
  title: string
  author: string
  detailsUrl: string
  date: Date
  numAuthors: number
  stage?: string
  shortOutcome?: string
  outcomes?: Array<Outcome>
  primaryOutcome?: Outcome
  features: Set<StudyFeature>
  isPublished: boolean
  isExcluded: boolean
  isInAnalysis: boolean
}

let studies: Array<Study> = []

const scrapeStudy = (trs: JQuery<HTMLElement>, url: string) => {
  const $author = trs.find('.author').first()

  const infoString = trs.find('.ainfo').text()
  const summaryString = infoString + ' ' + trs.find('.xsummary').text()

  const infoParts = infoString.split(',')
  if (infoParts.length <= 1) {
    return null
  }
  const dateString = infoParts[1].trim()

  let date = parse(dateString, 'M/d/y', new Date())

  const titleString = $author.parent().text()
  const preprintDateMatch = titleString.match(
    /preprint\s(\d\d?\/\d\d?(\/\d\d?)?)/,
  )
  if (preprintDateMatch) {
    let preprintDateString = preprintDateMatch[1]
    const dateParts = preprintDateMatch[1].split('/')
    if (dateParts.length === 2) {
      preprintDateString = `${preprintDateString}/${format(date, 'yy')}`
    }
    date = parse(preprintDateString, 'M/d/yy', new Date())
  }

  const study: Partial<Study> = {
    title: trs.find('.xtitle').text().trim(),
    author: $author.text().trim(),
    date,
    detailsUrl: `${url}/${trs.find('.xstage .ul a').first().attr('href')}`,
    features: new Set(),
    isPublished: true,
    isExcluded: false,
    isInAnalysis: false,
  }

  const authorMatch = infoString.match(/(\d+) author(s)\b/i)
  if (authorMatch) {
    study.numAuthors = parseInt(authorMatch[1], 10)
  }

  const $outcome = trs.find('.outcome')
  const outcomeString = $outcome.text()
  if (!outcomeString) {
    return study
  }

  const outcomeParts = outcomeString.split(',')
  if (outcomeParts.length < 3) {
    return study
  }

  const percentMatch = outcomeParts[1].match(/([\d]+\.[\d])%/)
  if (!percentMatch) {
    return study
  }

  const stage = trs.find('.stage').text().trim().toLowerCase()
  if (stage === 'n/a' || stage === 'meta') {
    return study
  }

  const xRef = trs.find('.xref').first().text()
  if (/\bmeta analysis\b/i.test(xRef)) {
    return study
  }

  const signMultiplier = $outcome.find('.worse').length ? -1 : 1
  const improvementPercent = parseFloat(percentMatch[1]) * signMultiplier
  const pValueString = outcomeParts[2].trim().substr(1)
  const pValue = parseFloat(pValueString.substr(1))
  study.primaryOutcome = {
    description: outcomeParts[0].trim(),
    improvementPercent,
    pValueString,
    pValue,
  }
  study.shortOutcome = outcomeParts[0].trim()

  study.stage = stage

  if (/\bnon-randomized\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.Prospective)
  } else if (/\bcluster randomized|cluster rct\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.ClusterRandomized)
    study.features?.add(StudyFeature.RCT)
  } else if (/\brandomized controlled trial|rct\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.RCT)
  } else if (/\bretrospective\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.Retrospective)
  } else if (/\prospective\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.Prospective)
  }

  if (/\bdouble blind\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.DoubleBlind)
    study.features?.add(StudyFeature.RCT)
  } else if (/\single blind\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.SingleBlind)
    study.features?.add(StudyFeature.RCT)
  }

  if (/\bpropensity score|psm\b/i.test(summaryString)) {
    study.features?.add(StudyFeature.PSM)
  }

  if (/\bpeer[\s-]?reviewed\b/i.test(xRef)) {
    study.features?.add(StudyFeature.PeerReviewed)
  } else if (/\bpre[-]?print\b/i.test(xRef)) {
    study.features?.add(StudyFeature.PrePrint)
  }

  return study
}

const scrapeStudies = (contents: JQuery<HTMLIFrameElement>, url: string) => {
  contents.find('.date').each((_, date) => {
    let tr = $(date).parent()
    const id = tr.attr('id')
    if (!id) {
      return
    }
    const idIndex = id?.substr(1)
    let trs = $(tr.get())
    while (tr.next().attr('id')?.substr(1).startsWith(idIndex)) {
      tr = tr.next()
      trs = trs.add(tr.get())
    }

    const study = scrapeStudy(trs, url)
    if (
      study &&
      !studies.find(({ detailsUrl }) => detailsUrl === study.detailsUrl)
    ) {
      studies.push(study as Study)
    }
  })

  return studies
}

type GetStudiesResponse = { url: string; html: string }

export const initialise = (
  getStudiesIncludedInAnalysis: (allStudies: Array<Study>) => Array<Study>,
): Promise<Array<Study>> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { contentScriptQuery: 'getStudies', hostname: window.location.hostname },
      ({ url, html }: GetStudiesResponse) => {
        const iframe = document.createElement('iframe')
        iframe.srcdoc = html
        iframe.style.display = 'none'
        iframe.onload = () => {
          const contents = $(iframe).contents() as JQuery<HTMLIFrameElement>
          studies = scrapeStudies(contents, url)
          studies = sortBy(studies, ['date'])

          const inAnalysis = sortBy(getStudiesIncludedInAnalysis(studies), [
            'date',
          ])
          inAnalysis.forEach((study) => (study.isInAnalysis = true))

          resolve(inAnalysis)
        }
        document.documentElement.append(iframe)
      },
    )
  })
}

export const getStudyByDetailsUrl = (url: string): Study | undefined => {
  return studies.find((study) => study.detailsUrl === url)
}

export const getAllStudies = () => {
  return studies
}
