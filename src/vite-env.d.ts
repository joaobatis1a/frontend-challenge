/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cenário inicial da API simulada (veja src/mocks/scenarios.ts). */
  readonly VITE_MOCK_SCENARIO?: string
  /** "false" desliga o MSW (não há backend real nesta entrega). */
  readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
