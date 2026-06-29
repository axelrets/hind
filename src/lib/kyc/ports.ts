// External integrations, all mocked in v1 behind interfaces so the real impls
// (BankID via reseller, encrypted storage, PEP/sanctions, Bolagsverket, Vitec
// AML Extension) swap in at Phase 7 with no caller changes.

export interface BankIDClient {
  startSign(p: { personnummer?: string }): Promise<{ signedAt: string }>
}
export interface UploadClient {
  upload(file: { name: string }): Promise<{ id: string; url: string }>
}
export interface ScreeningClient {
  screen(p: { name: string }): Promise<{ pepHit: boolean; sanctionsHit: boolean }>
}
export interface CompanyRegistryClient {
  lookup(orgnr: string): Promise<{ beneficialOwners: string[]; signatory: string | null }>
}
export interface VitecClient {
  writeDossier(p: { sessionId: string }): Promise<{ ok: boolean; ref: string }>
}

const rid = (p: string) => p + Math.random().toString(36).slice(2, 9)

export const mockBankID: BankIDClient = {
  async startSign() {
    return { signedAt: new Date().toISOString() }
  },
}
export const mockUpload: UploadClient = {
  async upload(file) {
    return { id: rid('doc_'), url: `mock://uploads/${file.name}` }
  },
}
export const mockScreening: ScreeningClient = {
  async screen() {
    return { pepHit: false, sanctionsHit: false }
  },
}
export const mockCompanyRegistry: CompanyRegistryClient = {
  async lookup() {
    return { beneficialOwners: [], signatory: null }
  },
}
export const mockVitec: VitecClient = {
  async writeDossier() {
    return { ok: true, ref: rid('vitec_') }
  },
}

export interface Ports {
  bankID: BankIDClient
  upload: UploadClient
  screening: ScreeningClient
  companyRegistry: CompanyRegistryClient
  vitec: VitecClient
}

export const mockPorts: Ports = {
  bankID: mockBankID,
  upload: mockUpload,
  screening: mockScreening,
  companyRegistry: mockCompanyRegistry,
  vitec: mockVitec,
}
