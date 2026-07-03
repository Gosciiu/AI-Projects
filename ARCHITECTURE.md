# AI Workspace — ARCHITECTURE.md
*Source of truth dla implementacji. Wersja skrócona — pełna historia decyzji i uzasadnienia: `AI_Workspace_Architecture_FINAL.md`.*

> **ZASADA NADRZĘDNA:** Ten dokument jest wiążący. Nie wprowadzaj
> nowych encji, nie dodawaj indeksów, nie zmieniaj nazw DTO, nie
> zmieniaj kodów błędów, nie zmieniaj kolejności walidacji. Jeśli coś
> w trakcie implementacji wydaje się niespójne z tym dokumentem —
> zatrzymaj się i zapytaj, nie improwizuj.

---

## 1. Czym jest AI Workspace

Lokalny serwer MCP dający modelom AI trwałą pamięć projektu: pliki,
wersjonowanie treści, historię, wyszukiwanie. AI Workspace jest
agnostyczny wobec zawartości plików (nie interpretuje treści) i jest
Single Source of Truth dla stanu projektu.

---

## 2. Domain Model

### Project
```ts
{
  id: string;
  name: string;
  defaultFileId: string | null;
  versionId: string;   // ETag całego obiektu Project
}
```
Niezmiennik: `defaultFileId` może wskazywać wyłącznie plik `active`.

### ProjectFile
```ts
{
  id: string;
  projectId: string;
  path: string;
  versionId: string;   // ETag CAŁEGO obiektu ProjectFile (nie wskaźnik na FileVersion!)
  status: "active" | "archived";
}
```
`content` i `type` NIE są polami tej encji:
- `content` żyje wyłącznie w `FileVersion`.
- `type` jest obliczany z `path` (patrz sekcja 4).

### FileVersion
```ts
{
  id: string;
  fileId: string;
  versionNumber: number;   // sekwencyjny, od 1
  content: string;
  createdAt: string;       // ISO
}
```
Reprezentuje wyłącznie historię TREŚCI. Nie rejestruje zmian path/status.

### Relacje
```
Project 1 → N ProjectFile
ProjectFile 1 → N FileVersion
```

---

## 3. Kluczowa zasada: `ProjectFile.versionId` to ETag, nie wskaźnik

`ProjectFile.versionId` zmienia się przy KAŻDEJ zmianie obiektu:
content (`file.update`), path (`file.move`), status (`file.archive`/
`file.unarchive`). NIE wskazuje na `FileVersion.id`. Żeby dotrzeć do
aktualnej FileVersion, nawiguj przez `file.versions` (sortowane
`versionNumber DESC`, pierwszy element = aktualna wersja).

Ta sama zasada dotyczy `Project.versionId` (ETag całego Project,
zmienia się np. gdy `file.archive` czyści `defaultFileId`).

---

## 4. `type` — wartość obliczana, NIE pole encji

```
.md            → "markdown"
.json          → "json"
.yaml / .yml   → "yaml"
(brak rozszerzenia) → "text"
inne           → błąd UNSUPPORTED_FILE_TYPE
```
Nigdy nie przyjmować `type` jako parametru requestu. Zawsze przeliczać
z `path` w mapperach DTO.

---

## 5. Global Validation Order (obowiązuje wszystkie operacje modyfikujące stan)

1. **Request validation** (format, wymagane pola) → `VALIDATION_ERROR`
2. **Object existence** → `FILE_NOT_FOUND` / `PROJECT_NOT_FOUND` / `FILE_VERSION_NOT_FOUND`
3. **Object state** (niezależne od klienta) → `FILE_ARCHIVED` / `FILE_NOT_ARCHIVED`
4. **Version match** → **NIGDY błąd.** Zawsze osobna gałąź odpowiedzi: `OperationResponse<ConflictData>`, `status = "conflict"`.
5. **Business validation** → `PATH_CONFLICT` / `NO_CHANGES` / `VERSION_MISMATCH`

Implementuj walidatory w `validation/{request,state,version,business}/`
— każdy podfolder = jeden krok powyższej kolejności.

---

## 6. Kody błędów (kompletna lista, używaj dokładnie tych nazw)

| Kod | Krok | Gdzie |
|---|---|---|
| `VALIDATION_ERROR` | 1 | uniwersalny, wszystkie operacje |
| `PROJECT_NOT_FOUND` | 2 | operacje na projekcie |
| `FILE_NOT_FOUND` | 2 | operacje na pliku |
| `FILE_VERSION_NOT_FOUND` | 2 | operacje na wersji |
| `FILE_ARCHIVED` | 3 | update, move, archive(już archived), version.restore |
| `FILE_NOT_ARCHIVED` | 3 | unarchive(już active), delete(plik nie archived) |
| `UNSUPPORTED_FILE_TYPE` | request/business | create, move |
| `PATH_CONFLICT` | 5 | create, move, unarchive |
| `NO_CHANGES` | 5 | update, version.restore |
| `VERSION_MISMATCH` | 5 | version.diff (różne fileId) |

Konflikt wersji = `ConflictData`, NIGDY kod błędu.

`ErrorData` ma tylko: `code`, `message` (szczegóły w message).

---

## 7. DTO (13 sztuk)

> `ConflictData` — kształt zamrożony jeszcze w oryginalnej sesji
> projektowej (2026-06-25, sekcja "Odpowiedź konfliktowa"), nie jest
> nową decyzją podjętą przy pisaniu tego dokumentu.
> `ProjectMetaDTO` — dodany przy specyfikacji `project.create`/
> `project.list` (2026-06-30), stąd liczba DTO wzrosła z 12 do 13
> względem oryginalnego MCP Contract.

```ts
OperationResponse<T> = { status: "success" | "error" | "conflict", data: T | ErrorData | ConflictData }

FileDTO = { id, projectId, path, type, versionId, status, content }
FileMetaDTO = { id, projectId, path, type, versionId, status }   // bez content
ProjectOpenDTO = { defaultFile: FileDTO | null, files: PageDTO<FileMetaDTO> | null }  // dokładnie jedno non-null
ProjectMetaDTO = { id, name, versionId }
ConflictData = { fileId, versionId, content }   // bez pola "conflict" — status niesie OperationResponse
ErrorData = { code, message }
FileVersionDTO = { id, fileId, versionNumber, content, createdAt }
FileVersionMetaDTO = { id, fileId, versionNumber, createdAt }   // bez content
DiffDTO = { fileId, fromVersionId, fromVersionNumber, toVersionId, toVersionNumber, diff }  // diff = unified diff text
HistoryEntryDTO = { fileId, filePath, versionId, versionNumber, createdAt }   // versionId = FileVersion.id !
SearchResultDTO = { fileId, filePath, versionId, excerpt }   // versionId = ProjectFile.versionId (ETag) !
PageDTO<T> = { items: T[], page, pageSize, total }
```

**Zapamiętaj różnicę:** `HistoryEntryDTO.versionId` = `FileVersion.id`
(bo history pokazuje wiele punktów w czasie). `SearchResultDTO.versionId`
= `ProjectFile.versionId`/ETag (bo search pokazuje aktualny stan). To
nie jest błąd — to świadomie różna semantyka tego samego nazwiska pola.

---

## 8. MCP Specification — 17 operacji

Domyślne sortowanie: `path ASC` wszędzie, **poza** `project.history`
i `file.versions`, które sortują `DESC` (chronologia).

### File Operations (7)

| Operacja | Request | Response | Errors |
|---|---|---|---|
| `file.read` | fileId | FileDTO | FILE_NOT_FOUND |
| `file.create` | projectId, path, content | FileDTO | VALIDATION_ERROR, UNSUPPORTED_FILE_TYPE, PROJECT_NOT_FOUND, PATH_CONFLICT |
| `file.update` | fileId, versionId, content | FileDTO / ConflictData | VALIDATION_ERROR, FILE_NOT_FOUND, FILE_ARCHIVED, NO_CHANGES |
| `file.move` | fileId, versionId, newPath | FileMetaDTO / ConflictData | VALIDATION_ERROR, UNSUPPORTED_FILE_TYPE, FILE_NOT_FOUND, FILE_ARCHIVED, PATH_CONFLICT |
| `file.archive` | fileId, versionId | FileMetaDTO / ConflictData | VALIDATION_ERROR, FILE_NOT_FOUND, FILE_ARCHIVED |
| `file.unarchive` | fileId, versionId | FileMetaDTO / ConflictData | VALIDATION_ERROR, FILE_NOT_FOUND, FILE_NOT_ARCHIVED, PATH_CONFLICT |
| `file.delete` | fileId, versionId | null / ConflictData | VALIDATION_ERROR, FILE_NOT_FOUND, FILE_NOT_ARCHIVED |

Szczegóły efektów:
- `file.create` → tworzy FileVersion #1. `Project.versionId` unchanged.
- `file.update` → nowa FileVersion + nowy ETag. `Project.versionId` unchanged.
- `file.move` → BRAK nowej FileVersion. `type` przeliczany z `newPath`. `Project.versionId` unchanged.
- `file.archive` → BRAK FileVersion. Jeśli plik = `defaultFileId` → `Project.defaultFileId = null` + nowy `Project.versionId`.
- `file.unarchive` → BRAK FileVersion. NIE przywraca automatycznie `defaultFileId`.
- `file.delete` → wymaga `status == archived` (dwuetapowy bezpiecznik). HARD DELETE: usuwa ProjectFile + WSZYSTKIE FileVersion fizycznie. Defensywnie czyści `defaultFileId` jeśli wskazuje usuwany plik. `project.history` traci wpisy tego pliku (celowe, nie błąd).

### Project Operations (6)

| Operacja | Request | Response | Errors |
|---|---|---|---|
| `project.create` | name | ProjectMetaDTO | VALIDATION_ERROR |
| `project.list` | page, pageSize | PageDTO\<ProjectMetaDTO\> | VALIDATION_ERROR |
| `project.open` | projectId | ProjectOpenDTO | VALIDATION_ERROR, PROJECT_NOT_FOUND |
| `project.files` | projectId, status?, page, pageSize | PageDTO\<FileMetaDTO\> | VALIDATION_ERROR, PROJECT_NOT_FOUND |
| `project.search.fulltext` | projectId, query, page, pageSize | PageDTO\<SearchResultDTO\> | VALIDATION_ERROR, PROJECT_NOT_FOUND |
| `project.history` | projectId, page, pageSize | PageDTO\<HistoryEntryDTO\> | VALIDATION_ERROR, PROJECT_NOT_FOUND |

Szczegóły:
- `project.open`: jeśli `defaultFileId != null` → zwraca `defaultFile`, `files = null`. Inaczej → `defaultFile = null`, `files` = tylko **active**, `path ASC`.
- `project.files`: brak `status` → **WSZYSTKIE** pliki (active+archived). Inaczej filtr po `status`.
- `project.search.fulltext`: tylko aktualna treść **active** plików. `query` musi być non-empty. Brak rankingu/scoringu — `path ASC`.
- `project.history`: agregacja FileVersion. Zawiera tylko `create`/`update`/`version.restore`. NIE zawiera `move`/`archive`/`unarchive`. `createdAt DESC`. Brak pola `operationType`.

**`project.delete` NIE ISTNIEJE w MCP** — patrz sekcja 9.

### File Version Operations (4)

| Operacja | Request | Response | Errors |
|---|---|---|---|
| `file.versions` | fileId, page, pageSize | PageDTO\<FileVersionMetaDTO\> | VALIDATION_ERROR, FILE_NOT_FOUND |
| `file.version.get` | versionId | FileVersionDTO | VALIDATION_ERROR, FILE_VERSION_NOT_FOUND |
| `file.version.diff` | fromVersionId, toVersionId | DiffDTO | VALIDATION_ERROR, FILE_VERSION_NOT_FOUND, VERSION_MISMATCH |
| `file.version.restore` | targetVersionId, currentVersionId | FileDTO / ConflictData | VALIDATION_ERROR, FILE_VERSION_NOT_FOUND, FILE_ARCHIVED, NO_CHANGES |

Szczegóły:
- `file.versions`: działa na active i archived. Sortowanie `versionNumber DESC`.
- `file.version.get`: identyfikacja samym `versionId` (globalnie unikalny, bez `fileId`).
- `file.version.diff`: obie wersje muszą mieć ten sam `fileId`, inaczej `VERSION_MISMATCH`. `diff` = czysty unified diff text, zero interpretacji.
- `file.version.restore`: wymaga `status == active` (inaczej `FILE_ARCHIVED` — najpierw unarchive). Tworzy NOWĄ FileVersion (nigdy nie cofa historii). Jeśli treść identyczna → `NO_CHANGES`.

---

## 9. `project.delete` — NIE jest toolem MCP

**To jest ograniczenie kontraktu MCP, NIE silnika.** AI nigdy nie
usuwa całego projektu samodzielnie — zbyt wysokie ryzyko (skala
szkody, nieodwracalność, błędna interpretacja intencji, pomylenie
projectId, prompt injection). Usunięcie projektu wykonuje wyłącznie
użytkownik, poza MCP (ręcznie / przyszłe CLI).

Warstwa `storage`/`operations` MOŻE mieć pełną funkcję
`deleteProject()` używaną przez przyszłe CLI/UI — po prostu
`server.ts` nigdy jej nie rejestruje jako MCP tool.

**AI Awareness:** mimo braku toola, opisy narzędzi MCP / kontekst
modelu AI powinny jawnie wspominać, że usuwanie projektów istnieje
jako funkcja dostępna tylko użytkownikowi — tak by model mógł
proaktywnie zasugerować użytkownikowi ręczne usunięcie, gdy to
zasadne (np. projekt porzucony/zduplikowany/testowy), zamiast
milcząco nie wiedzieć, że ta opcja w ogóle istnieje. AI tylko
informuje i przypomina — nigdy nie wykonuje.

`project.create` i `project.list` natomiast są pełnoprawnymi MCP
toolami — niskie ryzyko, AI używa swobodnie.

---

## 10. Filesystem Layout

```
data/
  projects/
    {projectId}/
      project.json
      files/
        {fileId}.json
      versions/
        {fileId}/
          {versionId}.json
```

- Wszystkie ID: UUID v4.
- Nazwa pliku ProjectFile na dysku = `{fileId}.json` (NIE `path` —
  niestabilny, może zawierać niedozwolone znaki).
- Nazwa pliku FileVersion na dysku = `{versionId}.json` (NIE
  `versionNumber` — `versionNumber` istnieje tylko wewnątrz JSON,
  bo prawdziwym identyfikatorem API jest zawsze `FileVersion.id`).
- Brak globalnych indeksów. Brak cache. `project.history` iteruje po
  plikach — akceptowalne dla MVP (YAGNI, nie optymalizuj przedwcześnie).

---

## 11. Stack i struktura repo

**TypeScript + Node.js**

```
src/
  domain/              # Project, ProjectFile, FileVersion — czyste typy
  dto/                 # 12 DTO z sekcji 7
  storage/             # I/O na plikach, 1:1 z sekcją 10
  validation/
    request/           # krok 1
    state/              # krok 3
    version/             # krok 4 (ConflictData)
    business/            # krok 5
  operations/
    file/               # 7 File Operations
    project/             # 6 Project Operations
    version/             # 4 File Version Operations
  mappers/              # Domain Model ↔ DTO
  server.ts              # rejestracja MCP tools
tests/
data/                    # runtime, gitignored
```

**Reguła warstw (obowiązkowa):**
```
MCP Handler → Operations/Service → Storage
```
NIGDY `MCP Handler → Storage` bezpośrednio. Dzięki temu przyszłe
CLI/GUI/REST mogą reużywać tej samej logiki.

### Kolejność implementacji
1. `domain/`
2. `dto/`
3. `storage/`
4. `validation/`
5. `operations/`
6. `tests/`
7. MCP adapter
8. `server.ts`

Review po każdym bloku przed przejściem dalej. Pełny zakres (wszystkie
17 operacji), nie minimalny szkielet.

---

## 12. Architecture Rules — szybkie podsumowanie (do skanowania)

> Każdy punkt poniżej jest szczegółowo wyjaśniony w sekcjach 1–11.
> Ta lista to skrót dla szybkiej weryfikacji, nie zastępuje treści
> powyżej.

- AI Workspace jest domain-agnostic (ADR-001) — nie interpretuje treści.
- AI Workspace jest Single Source of Truth.
- `Project.versionId` = ETag całego obiektu Project.
- `ProjectFile.versionId` = ETag całego obiektu ProjectFile (ADR-006).
- `FileVersion.id` ≠ `ProjectFile.versionId` — to dwa różne identyfikatory o różnym znaczeniu.
- `type` jest obliczane z `path`, nigdy nie jest polem encji ani parametrem requestu.
- Restore zawsze tworzy NOWĄ FileVersion — nigdy nie cofa historii (ADR-005).
- Conflict ≠ Error — zawsze `OperationResponse<ConflictData>`, status `"conflict"`, nigdy kod błędu.
- Brak auto-merge konfliktów — odrzucenie i ponowna próba klienta.
- Global Validation Order (sekcja 5) jest obowiązkowy, bez wyjątków.
- Nie wprowadzaj nowych encji domenowych.
- Nie zmieniaj nazw ani pól DTO (sekcja 7).
- Nie zmieniaj kodów błędów (sekcja 6).
- Warstwy zawsze: `MCP Handler → Operations/Service → Storage`.
- Brak indeksów (np. dla versionId → fileId).
- Brak cache.
- Brak bazy danych — wyłącznie pliki JSON wg Filesystem Layout (sekcja 10).
- `project.delete` NIE jest toolem MCP — wyłącznie funkcja Application Layer dla użytkownika (sekcja 9).
- AI musi wiedzieć o istnieniu `project.delete` (Application Layer) i może je proaktywnie sugerować użytkownikowi — ale nigdy go nie wykonuje.
- `project.create` i `project.list` SĄ pełnoprawnymi MCP toolami.

---

*Wersja: 2026-06-30 (v2 — uzgodniona z ChatGPT, połączenie pełnej
specyfikacji implementacyjnej z listą Architecture Rules). Pełna
historia decyzji i uzasadnienia: `AI_Workspace_Architecture_FINAL.md`.*
