import { useState } from 'react'
import { SCENARIOS, getScenario, setScenario } from './scenarios'

/**
 * Painel de demonstração: escolhe o cenário da API simulada e restaura os dados.
 * Faz parte da camada de mocks (montado à parte, fora do app) e só aciona o
 * "servidor" simulado. Não aparece em testes automatizados (navigator.webdriver).
 */
export function MockPanel() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(getScenario().id)
  const current = getScenario().id

  const apply = () => {
    setScenario(selected)
    window.location.reload()
  }

  const reset = async () => {
    await (window as unknown as { __mock: { reset: () => Promise<void> } }).__mock.reset()
    localStorage.clear()
    sessionStorage.clear()
    setScenario(selected)
    window.location.reload()
  }

  return (
    <div className="fixed bottom-24 left-3 z-50 font-sans text-sm md:bottom-4">
      {open && (
        <div
          role="dialog"
          aria-label="Cenários da API simulada"
          className="mb-2 w-[300px] rounded border border-border bg-card p-4 text-foreground shadow-2xl"
        >
          <p className="font-bold">Cenários da API simulada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ativo: <strong className="text-brand">{current}</strong>. Também via <code>?scenario=</code>.
          </p>
          <fieldset className="mt-3 max-h-[45vh] overflow-y-auto pr-1">
            <legend className="sr-only">Escolha um cenário</legend>
            {Object.values(SCENARIOS).map((s) => (
              <label key={s.id} className="flex cursor-pointer gap-2 rounded px-1 py-1.5 hover:bg-secondary">
                <input
                  type="radio"
                  name="mock-scenario"
                  value={s.id}
                  checked={selected === s.id}
                  onChange={() => setSelected(s.id)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <span>
                  <span className="block font-semibold">{s.id}</span>
                  <span className="block text-xs text-muted-foreground">{s.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={apply} className="flex-1 rounded bg-primary px-3 py-2 font-bold text-primary-foreground">
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => void reset()}
              className="flex-1 rounded border border-border px-3 py-2 hover:border-primary"
              title="Restaura banco simulado, sessão e carrinho"
            >
              Restaurar dados
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-full border border-primary bg-card px-3 py-1.5 text-xs text-brand shadow-lg hover:bg-secondary"
      >
        Cenários: {current}
      </button>
    </div>
  )
}
