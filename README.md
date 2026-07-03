# AI Workspace

Lokalny serwer MCP dający modelom AI trwałą pamięć projektu: pliki,
wersjonowanie treści, historię zmian i wyszukiwanie. AI Workspace
jest agnostyczny wobec zawartości plików i stanowi Single Source of
Truth dla stanu projektu.

## Dokumentacja

| Plik | Rola |
|---|---|
| `ARCHITECTURE.md` | **Wiążący source of truth** — pełna specyfikacja implementacyjna (17 operacji MCP, 13 DTO, walidacje, Filesystem Layout) |
| `docs/Architecture_FINAL.md` | Pełna historia decyzji projektowych z uzasadnieniami (ADR-001–006 i dalsze) |
| `CLAUDE.md` | Reguły pracy dla Claude Code |

## Quick start

```bash
npm install
npm run dev
```

## Stan projektu

Faza projektowa: **zakończona i zamrożona** (2026-06-30).
Implementacja: **w toku** — patrz checklist w `CLAUDE.md`.

## Stack

TypeScript + Node.js + [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
