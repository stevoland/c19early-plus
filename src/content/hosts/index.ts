import * as ivmmeta from './ivmmeta.com'
import * as hcqmeta from './hcqmeta.com'
import * as vdmeta from './vdmeta.com'

type Host = {
  studiesUrl: string
  initialise: () => unknown
}

const map: Record<string, Host> = {
  'ivmmeta.com': ivmmeta,
  'vdmeta.com': vdmeta,
  'hcqmeta.com': hcqmeta,
}

export default map
