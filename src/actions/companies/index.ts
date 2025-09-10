// ============================================================================
// TRINOA - COMPANIES MANAGEMENT ACTIONS
// ============================================================================

// Exportar todos los actions relacionados con gestión de empresas
export { createCompanyAction } from './createCompanyAction'
export { getCompaniesAction } from './getCompaniesAction'
export { validateCompanyAction } from './validateCompanyAction'

// Tipos relacionados con empresas
export type {
  CreateCompanyData,
  CreateCompanyResult,
} from './createCompanyAction'

export type {
  GetCompaniesResult,
} from './getCompaniesAction'

export type {
  ValidateCompanyData,
  ValidateCompanyResult,
} from './validateCompanyAction'
