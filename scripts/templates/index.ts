import { apexTemplate } from './apex'
import { northwindTemplate } from './northwind'
import { eurotechTemplate } from './eurotech'
import { crestlineTemplate } from './crestline'
import { genericTemplate } from './generic'
import type { InvoiceRenderData, TemplateKey } from './types'

export { type InvoiceRenderData, type TemplateKey }

export function renderTemplate(key: TemplateKey, data: InvoiceRenderData): string {
  switch (key) {
    case 'apex':      return apexTemplate(data)
    case 'northwind': return northwindTemplate(data)
    case 'eurotech':  return eurotechTemplate(data)
    case 'crestline': return crestlineTemplate(data)
    case 'generic':   return genericTemplate(data)
  }
}
