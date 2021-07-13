import hosts from '../content/hosts'
import { Meta } from '../content/pythonmeta'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.contentScriptQuery == 'getStudies' && request.hostname) {
    const url = hosts[request.hostname].studiesUrl
    fetch(url)
      .then((response) => response.text())
      .then((html) => sendResponse({ url, html }))
      .catch((error) => {
        console.error(error)
      })
    return true // Will respond asynchronously.
  }

  return false
})

type EffectSize = [rr: number, ciLower: number, ciUpper: number]

const getSummaries = (groupedEffectSizes: Array<Array<EffectSize>>) => {
  const results = groupedEffectSizes.map((effectSizes) => {
    if (!effectSizes.length) {
      return []
    }
    const meta = new Meta()
    meta.datatype = 'CATE'
    meta.models = 'Random'
    meta.algorithm = 'IV'
    meta.effect = 'RR'

    return meta.meta(effectSizes.map((effectSize) => [...effectSize, 1, 'a']))
  })

  return results
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.contentScriptQuery == 'getSummaries') {
    setTimeout(() => {
      const summaries = getSummaries(request.effects)
      const date = request.date
      sendResponse({ date, summaries })
    }, 0)
    return true
  }

  return false
})
