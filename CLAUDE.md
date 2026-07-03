# CLAUDE.md — instrukcje dla Claude Code

## Najważniejsze

**`ARCHITECTURE.md` w tym repo jest wiążącym source of truth.**
Przeczytaj go w całości przed jakąkolwiek zmianą kodu. Pełna historia
decyzji i uzasadnienia: `docs/Architecture_FINAL.md` (czytaj tylko
gdy potrzebujesz zrozumieć "dlaczego", nie "co").

## Twarde reguły (z ARCHITECTURE.md sekcja 12)

- NIE wprowadzaj nowych encji domenowych.
- NIE zmieniaj nazw ani pól DTO (13 DTO, sekcja 7).
- NIE zmieniaj kodów błędów (10 kodów, sekcja 6).
- NIE zmieniaj Global Validation Order (5 kroków, sekcja 5).
- NIE dodawaj indeksów, cache ani baz danych — tylko pliki JSON wg
  Filesystem Layout (sekcja 10).
- Konflikt wersji NIGDY nie jest kodem błędu — zawsze
  `OperationResponse<ConflictData>` ze `status: "conflict"`.
- Warstwy zawsze: `MCP Handler → Operations → Storage`. Nigdy handler
  bezpośrednio do storage.
- `project.delete` NIE jest toolem MCP i nie wolno go rejestrować w
  `server.ts` (sekcja 9). Funkcja `deleteProject()` w warstwie
  storage/operations MOŻE istnieć (dla przyszłego CLI) — ale nie jako
  MCP tool.
- Jeśli cokolwiek w implementacji wydaje się konfliktować z
  ARCHITECTURE.md — ZATRZYMAJ SIĘ i zapytaj użytkownika. Nie
  improwizuj, nie "naprawiaj" architektury samodzielnie.

## Stan implementacji

- [x] Scaffold repo (struktura, package.json, tsconfig)
- [x] `src/domain/` — Project, ProjectFile, FileVersion (czyste typy)
- [x] `src/dto/` — 13 DTO wg sekcji 7
- [x] `src/storage/` — I/O JSON wg sekcji 10
- [x] `src/validation/` — request/state/version/business wg sekcji 5
- [ ] `src/operations/` — 17 operacji wg sekcji 8
- [ ] `tests/`
- [ ] MCP adapter + `src/server.ts`

Kolejność implementacji jest wiążąca (sekcja 11). Po każdym bloku
zatrzymaj się do review z użytkownikiem przed przejściem dalej.

## Komendy

```bash
npm install        # instalacja zależności
npm run dev        # uruchomienie serwera (tsx, bez budowania)
npm run build      # kompilacja TS -> dist/
npm test           # testy (vitest)
```
