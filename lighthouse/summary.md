# Auditoria Lighthouse

Gerado em 2026-10-07T12:23:01.393Z por `npm run lighthouse` (3 medições por página e perfil; valores = mediana).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | 75 | 100 | 100 | 100 | 4.24 s | 0.015 | 265 ms |
| inicio | desktop | 100 | 100 | 100 | 100 | 0.78 s | 0.002 | 27 ms |
| detalhe | mobile | 80 | 100 | 100 | 100 | 4.16 s | 0.000 | 180 ms |
| detalhe | desktop | 99 | 100 | 100 | 100 | 0.93 s | 0.000 | 0 ms |

## Ambiente

- Lighthouse 13.5.0 (API Node), Chromium do Playwright em modo headless
- Node v24.16.0, Windows_NT 10.0.26200 (x64), CPU: 12th Gen Intel(R) Core(TM) i5-12500H × 16, 17 GB RAM
- Build de produção (`vite build`) servido por `vite preview` em http://localhost:4173
- Cenário padrão dos mocks (MSW ativo, como na demonstração publicada)
- Perfil mobile: padrão do Lighthouse (Moto G Power emulado, 4G lento, CPU 4×). Perfil desktop: `desktop-config` oficial.

## Medições individuais

| Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio-mobile-1 | 79 | 100 | 100 | 100 | 4.24 s | 0.015 | 181 ms |
| inicio-mobile-2 | 75 | 100 | 100 | 100 | 4.15 s | 0.000 | 265 ms |
| inicio-mobile-3 | 72 | 100 | 100 | 100 | 4.24 s | 0.126 | 324 ms |
| inicio-desktop-1 | 99 | 100 | 100 | 100 | 0.84 s | 0.002 | 27 ms |
| inicio-desktop-2 | 100 | 100 | 100 | 100 | 0.78 s | 0.002 | 30 ms |
| inicio-desktop-3 | 100 | 100 | 100 | 100 | 0.77 s | 0.002 | 17 ms |
| detalhe-mobile-1 | 80 | 100 | 100 | 100 | 4.16 s | 0.000 | 183 ms |
| detalhe-mobile-2 | 80 | 100 | 100 | 100 | 4.23 s | 0.000 | 180 ms |
| detalhe-mobile-3 | 81 | 100 | 100 | 100 | 4.15 s | 0.000 | 177 ms |
| detalhe-desktop-1 | 99 | 100 | 100 | 100 | 0.93 s | 0.000 | 0 ms |
| detalhe-desktop-2 | 99 | 100 | 100 | 100 | 0.93 s | 0.000 | 0 ms |
| detalhe-desktop-3 | 99 | 100 | 100 | 100 | 0.88 s | 0.000 | 0 ms |
