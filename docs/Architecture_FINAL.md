# AI Workspace – Dokumentacja Architektoniczna FINALNA
*Stan: koniec fazy projektowej – 100% zamknięte (2026-06-30)*

> Ten dokument zastępuje wszystkie wcześniejsze wersje (Architektura
> z 2026-06-25, Session Summary 2026-06-28, Baseline Frozen v1.1).
> Zawiera pełny, finalny stan architektury wraz z uzasadnieniami
> kluczowych decyzji, aby uniknąć nieporozumień podczas implementacji.

---

## 0. Status procesu projektowego

| Etap | Status |
|---|---|
| 1. Vision | ✅ CLOSED |
| 2. ADR (001–006) | ✅ CLOSED |
| 3. Scenarios | ✅ CLOSED |
| 4. MCP Contract | ✅ CLOSED |
| 5. Domain Model | ✅ CLOSED |
| 6. DTO / API Model | ✅ CLOSED |
| 7. MCP Specification (17 operacji: 15 oryginalnych + project.create/list dodane 2026-06-30) | ✅ CLOSED (ETAP 1) |
| 8. Filesystem Layout | ✅ CLOSED |
| 9. Architecture Review | ✅ CLOSED |
| 10. Implementacja | 🔄 W TOKU |

**Brak jakichkolwiek otwartych pytań architektonicznych.** Wszystko
poniżej jest zamrożone i nie powinno się zmieniać bez świadomej
decyzji i nowego ADR.

---

## 1. Wizja projektu

AI Workspace to lokalny program rozszerzający możliwości modeli AI
poprzez zapewnienie im trwałej pamięci projektu oraz możliwości
automatycznego utrzymywania dokumentacji.

**Główny problem:** Modele AI nie posiadają trwałej pamięci projektu,
nie mogą wiarygodnie utrzymywać dokumentacji, wymagają ręcznego
przekazywania kontekstu i tracą szczegóły wraz z rozwojem projektu.

**Rozwiązanie:** AI Workspace przejmuje odpowiedzialność za
przechowywanie i aktualizowanie wiedzy o projekcie. Modele AI
komunikują się z AI Workspace wyłącznie przez MCP (Model Context
Protocol).

**Filozofia:** AI Workspace nie jest aplikacją do konkretnego
zastosowania. Jest prostym, uniwersalnym systemem trwałej pamięci
oraz zarządzania dokumentacją i stanem projektu dla modeli AI. Każdy
projekt korzysta z tego samego silnika. Różnią się wyłącznie dane.

### Podstawowe założenia

- AI Workspace jest jedynym źródłem prawdy (Single Source of Truth)
  dotyczącej stanu projektu.
- Modele AI komunikują się z AI Workspace wyłącznie przez MCP.
- Dane przechowywane są lokalnie, w plikach JSON.
- Architektura umożliwia późniejsze dodanie synchronizacji lub innych
  sposobów przechowywania danych bez przebudowy systemu.
- W przypadku rozbieżności między pamięcią modelu a stanem w AI
  Workspace – zawsze pierwszeństwo ma AI Workspace.
- Każda nowa sesja pracy powinna rozpoczynać się od pobrania
  aktualnego stanu projektu z AI Workspace (`project.open`).

### Podział odpowiedzialności

**Modele AI odpowiadają za:** analizę problemów, projektowanie
rozwiązań, proponowanie zmian, konsultacje z użytkownikiem,
podejmowanie decyzji wspólnie z użytkownikiem.

**AI Workspace odpowiada za:** trwałe przechowywanie wiedzy,
aktualizację dokumentacji, utrzymanie trwałego stanu projektu,
wersjonowanie zmian, walidację operacji, utrzymanie spójności danych,
udostępnianie aktualnego kontekstu wszystkim modelom AI.

AI Workspace **nie podejmuje decyzji projektowych** i **nie
interpretuje treści** (zob. ADR-001).

### Standardowy cykl pracy

1. Model AI pobiera aktualny stan projektu z AI Workspace
   (`project.open`).
2. Model analizuje problem przedstawiony przez użytkownika.
3. Model proponuje rozwiązanie.
4. Użytkownik akceptuje lub odrzuca proponowane zmiany.
5. Po akceptacji model zleca AI Workspace aktualizację dokumentacji.
6. AI Workspace zapisuje zmiany oraz aktualizuje projekt.
7. Kolejne sesje rozpoczynają pracę od zaktualizowanego stanu projektu.

---

## 2. Decyzje Architektoniczne (ADR)

### ADR-001: AI Workspace jest agnostyczny wobec zawartości projektów

**Decyzja:** AI Workspace zarządza projektami, plikami, wersjami i
historią zmian. Nie interpretuje zawartości plików. Interpretacja
należy do modeli AI i konkretnego projektu.

**Wyjątek:** AI Workspace zna techniczny `type` pliku wyłącznie jako
wartość *obliczaną* z rozszerzenia ścieżki (zob. sekcja 3, `type`),
używaną do walidacji technicznej. To nie jest wiedza domenowa.

**Konsekwencje:** Brak wbudowanego wyszukiwania semantycznego. Brak
walidacji domenowej. Pełna uniwersalność silnika. Ta zasada
bezpośrednio wpłynęła na decyzję, by `file.version.diff` zwracał
czysty tekstowy unified diff bez żadnej interpretacji semantycznej
zmian (sekcja 6).

---

### ADR-002: Walidacja wersji jako operacja atomowa

**Decyzja:** Każda operacja zapisu zawiera Version ID. Weryfikacja
wersji i zapis są jedną atomową operacją. Konflikty są odrzucane. AI
Workspace nie scala konfliktów automatycznie.

**Mechanizm konfliktu:** Jeżeli obiekt został zmodyfikowany przez
innego klienta, operacja zostaje odrzucona i zwracana jest
`OperationResponse<ConflictData>` (zob. sekcja 5). Model AI powinien
ponownie pobrać aktualny stan i przygotować nową propozycję.

**Powiązane ADR:** ADR-004, ADR-006

---

### ADR-003: Podstawową jednostką AI Workspace jest Project File

**Decyzja:** Podstawową jednostką systemu jest plik projektu
(Project File). AI Workspace zarządza plikami zarejestrowanymi w
projekcie niezależnie od ich formatu i przeznaczenia.

**AI Workspace o pliku wie:** id, path, versionId, status. `type` jest
wartością obliczaną, nie polem encji (zob. decyzja w sekcji 3).
**AI Workspace nie wie:** co plik znaczy, jaka jest jego struktura
domenowa, do czego służy.

---

### ADR-004: Podział operacji i zasada walidacji

**Decyzja:** Operacje MCP dzielą się na trzy grupy według zakresu
odpowiedzialności: **File Operations**, **Project Operations**,
**File Version Operations** (rozszerzone względem pierwotnego
podziału na dwie grupy po wydzieleniu operacji wersjonowania jako
osobnej kategorii).

**Reguła walidacji (niezależna od podziału):**
> Każda operacja powodująca trwałą zmianę stanu projektu lub jego
> plików musi przejść walidację wersji jako integralny element
> swojego wykonania.

**Powiązane ADR:** ADR-002, ADR-003

---

### ADR-005: Obowiązkowa historia wersji (z korektą)

**Pierwotna decyzja:** Każda operacja powodująca trwałą zmianę stanu
projektu automatycznie tworzy nową wersję w historii.

**KOREKTA (po ADR-006):** Poprawna interpretacja to: *każda trwała
zmiana TREŚCI* tworzy FileVersion. Zmiany metadanych (path, status)
nie tworzą FileVersion.

**Tworzy FileVersion:**
- `file.create`
- `file.update`
- `file.version.restore`

**NIE tworzy FileVersion:**
- `file.move` (zmiana path)
- `file.archive` / `file.unarchive` (zmiana status)

**Konsekwencja:** Tworzenie historii jest integralnym elementem
wykonania operacji zmieniającej treść i nie może zostać wyłączone
przez model AI. Restore **nigdy nie cofa historii** – zawsze tworzy
nowy wpis (np. po `restore(v2)` na pliku z wersjami v1–v4 powstaje
v5, zawierające treść v2; historia v1–v4 pozostaje nienaruszona).

**Powiązane ADR:** ADR-002, ADR-004, ADR-006

---

### ADR-006: ProjectFile Version Semantics (kluczowe odkrycie)

**Status:** Przyjęta – odkryta podczas projektowania `file.move`.

**Problem:** Jeśli `ProjectFile.versionId` wskazywałby bezpośrednio na
`FileVersion.id`, to operacja `file.move` (zmieniająca tylko `path`)
nie zmieniałaby tego ID, a inny klient mógłby wciąż używać "ważnego"
`versionId`, mimo że metadane pliku (ścieżka) są już nieaktualne. To
łamałoby ADR-002 dla zmian niedotyczących treści.

**Decyzja:** `ProjectFile.versionId` jest **ETagiem całego obiektu
ProjectFile** (nie wskaźnikiem na `FileVersion.id`). Zmienia się przy
KAŻDEJ modyfikacji ProjectFile: `file.update` (treść), `file.move`
(path), `file.archive` / `file.unarchive` (status).

**Konsekwencja:** Aby dotrzeć do aktualnej FileVersion, trzeba
nawigować przez `file.versions` (sortowane malejąco) – to szczegół
implementacyjny, nie część modelu domenowego.

**To rozróżnienie ma daleko idące konsekwencje dla DTO** – zob.
sekcja 5, różnica między `SearchResultDTO.versionId` (= ETag
ProjectFile) a `HistoryEntryDTO.versionId` (= `FileVersion.id`).

**Powiązane ADR:** ADR-002, ADR-005

---

## 3. Model danych – Domain Model (FINAL)

### Zasada organizacyjna

Świadomie rozdzielamy:
- **Domain Model** – trwałe encje domenowe.
- **DTO / API Model** – obiekty kontraktu MCP.

Nie mieszamy ich w dokumentacji ani w kodzie (odzwierciedlone też w
strukturze repo – zob. sekcja implementacyjną).

### Project

| Pole | Typ | Opis |
|---|---|---|
| `id` | string | Identyfikator projektu |
| `name` | string | Nazwa projektu |
| `defaultFileId` | string? | Wskazanie default file (opcjonalne) |
| `versionId` | string | ETag projektu |

`createdAt` świadomie odrzucone – nie jest wymagane przez żadną
operację MCP (YAGNI).

**Niezmiennik architektoniczny:** `Project.defaultFileId` może
wskazywać wyłącznie na plik aktywny (`status: active`). Gwarantowane
strukturalnie przez `file.archive`, które czyści `defaultFileId`, gdy
archiwizowany plik jest aktualnym default file. `project.open` ufa
temu niezmiennikowi i nie implementuje żadnego defensywnego fallbacku.

### ProjectFile

| Pole | Typ | Opis |
|---|---|---|
| `id` | string | Identyfikator pliku |
| `projectId` | string | Przynależność do projektu |
| `path` | string | Ścieżka / nazwa pliku |
| `versionId` | string | ETag całego obiektu ProjectFile (ADR-006) |
| `status` | "active" \| "archived" | Stan pliku |

**Usunięte z ProjectFile:**
- `content` – należy wyłącznie do FileVersion (Single Source of
  Truth; uniknięcie duplikacji danych).
- `type` – nie jest niezależną encją domenową. Patrz niżej.

#### Decyzja: `type` jest wartością obliczaną

`type` nie ma własnego cyklu życia (nie istnieje "zmień typ",
"przywróć typ"). Jest deterministyczną funkcją `path`:

| Rozszerzenie | type |
|---|---|
| `.md` | `markdown` |
| `.json` | `json` |
| `.yaml` / `.yml` | `yaml` |
| brak rozszerzenia | `text` |
| inne | błąd `UNSUPPORTED_FILE_TYPE` |

- `type` pozostaje w `FileDTO` i `FileMetaDTO` jako pole obliczane.
- `type` nigdy nie jest akceptowany jako parametr requestu.
- Przeliczany automatycznie przy `file.move` (zmiana rozszerzenia
  dozwolona, jeśli nowy typ jest wspierany — np. `spec.md` →
  `spec.json` jest poprawne).

### FileVersion

| Pole | Typ | Opis |
|---|---|---|
| `id` | string | Identyfikator wersji (versionId w kontekście historii) |
| `fileId` | string | Plik, do którego należy |
| `versionNumber` | integer | Sekwencyjny: 1, 2, 3… |
| `content` | string | Pełna treść |
| `createdAt` | string (ISO) | Znacznik czasu |

FileVersion reprezentuje **wyłącznie historię treści**. Nie
rejestruje zmian `path` ani `status`.

### Relacje

```
Project   1 → N   ProjectFile
ProjectFile 1 → N   FileVersion
```

---

## 4. Globalne reguły walidacji

### Kolejność walidacji (obowiązuje wszystkie operacje modyfikujące stan)

1. **Request validation** – format, wymagane pola, dozwolone wartości
   – niezależna od stanu systemu. Błąd: `VALIDATION_ERROR`.
2. **Object existence** – `FILE_NOT_FOUND`, `PROJECT_NOT_FOUND`,
   `FILE_VERSION_NOT_FOUND`.
3. **Object state** – niezależna od klienta. `FILE_ARCHIVED`,
   `FILE_NOT_ARCHIVED`.
4. **Version match** – optymistyczne blokowanie (ADR-002 + ADR-006).
   **Nigdy nie zwraca błędu (`ErrorData.code`)** – zawsze osobna
   gałąź odpowiedzi `OperationResponse<ConflictData>` ze
   `status = conflict`.
5. **Business validation** – reguły specyficzne dla operacji:
   `PATH_CONFLICT`, `NO_CHANGES`, `VERSION_MISMATCH`.

### Globalne kody błędów (uniwersalne, używane identycznie wszędzie)

| Kod | Krok walidacji | Znaczenie |
|---|---|---|
| `VALIDATION_ERROR` | 1 | Błąd formatu/wymaganych pól requestu. Szczegóły w `ErrorData.message` (np. "query cannot be empty"). Zastępuje wszelkie warianty typu `INVALID_QUERY`, `INVALID_PATH` itd. – jeden kod, jedna semantyka. |
| `PROJECT_NOT_FOUND` | 2 | Projekt nie istnieje. |
| `FILE_NOT_FOUND` | 2 | Plik nie istnieje. |
| `FILE_VERSION_NOT_FOUND` | 2 | Wersja pliku nie istnieje. |
| `FILE_ARCHIVED` | 3 | Obiekt jest w stanie `archived`, a operacja wymaga `active`. Używane identycznie w `file.update`, `file.move`, `file.archive`, `file.version.restore`. |
| `FILE_NOT_ARCHIVED` | 3 | Obiekt jest `active`, a operacja wymaga `archived`. Symetryczne do `FILE_ARCHIVED`. Używane w `file.unarchive`, `file.delete`. |
| `UNSUPPORTED_FILE_TYPE` | 5 (lub request validation przy create) | Rozszerzenie pliku nie mapuje się na żaden wspierany `type`. |
| `PATH_CONFLICT` | 5 | Ścieżka zajęta przez inny **aktywny** plik. Archiwizowane pliki nie blokują ścieżki. |
| `NO_CHANGES` | 5 | Treść identyczna z aktualną – operacja nie tworzy nowej wersji. |
| `VERSION_MISMATCH` | 5 | (`file.version.diff`) Porównywane wersje należą do różnych plików. |

**Konflikt wersji NIE jest błędem.** Zawsze realizowany jako osobny
typ odpowiedzi `OperationResponse<ConflictData>`, rozróżniany przez
`OperationResponse.status = conflict` (vs `error` dla powyższych
kodów, vs `success`). To było źródłem jedynej korekty w trakcie
projektowania `file.version.restore` – pierwotnie błędnie
zaproponowano `VERSION_CONFLICT` jako `ErrorData.code`, co zostało
poprawione dla zachowania spójności z resztą kontraktu.

---

## 5. DTO / API Model (FINAL – 12 DTO)

| DTO | Używane przez |
|---|---|
| `OperationResponse<T>` | wszystkie operacje (wrapper; `status` + `data`, bez `requestId`/`timestamp`) |
| `FileDTO` | file.read, file.create, file.update, file.version.restore, project.open (defaultFile) |
| `FileMetaDTO` | project.files, project.open (fallback), file.move, file.archive, file.unarchive |
| `ProjectOpenDTO` | project.open |
| `ConflictData` | file.update, file.move, file.archive, file.unarchive, file.delete, file.version.restore |
| `ErrorData` | wszystkie operacje (`code` + `message` only, MVP) |
| `FileVersionDTO` | file.version.get (z `content`) |
| `FileVersionMetaDTO` | file.versions (bez `content`) |
| `DiffDTO` | file.version.diff |
| `HistoryEntryDTO` | project.history |
| `SearchResultDTO` | project.search.fulltext |
| `PageDTO<T>` | file.versions, project.history, project.search.fulltext, project.files, project.open (fallback) |

### Kluczowe, nieoczywiste decyzje DTO

- **`FileDTO` NIE zawiera `currentFileVersionId` / `currentVersionNumber`** –
  żadna operacja MCP nie wymaga tego jako inputu; nawigacja po
  wersjach odbywa się przez `file.versions` (YAGNI).
- **`ConflictData` nie ma redundantnego pola `conflict`** – status
  niesie `OperationResponse.status`.
- **`SearchResultDTO.versionId` = `ProjectFile.versionId` (ETag)** –
  search operuje na aktualnym stanie (jeden punkt w czasie).
- **`HistoryEntryDTO.versionId` = `FileVersion.id`** – history
  operuje na wielu punktach w czasie; gdyby był ETagiem, każdy wpis
  historii niósłby ten sam (aktualny) identyfikator, co byłoby
  bezużyteczne do nawigacji (`file.version.get`, `file.version.diff`,
  `file.version.restore` przyjmują właśnie `FileVersion.id`).
  **To jest świadoma, udokumentowana różnica semantyczna między
  dwoma polami o tej samej nazwie w różnych DTO – kluczowe miejsce do
  zapamiętania przy implementacji.**
- **`project.open`** zwraca `ProjectOpenDTO` z `defaultFile: FileDTO | null`
  oraz `files: PageDTO<FileMetaDTO> | null` – dokładnie jedno pole
  jest non-null; logika wykonywana przez AI Workspace, nie klienta.
- **`file.version.restore`** request używa `targetVersionId` +
  `currentVersionId` (nie jednego niejednoznacznego `versionId`).
- **`HistoryEntryDTO`** finalne pola: `fileId`, `filePath`,
  `versionId` (= FileVersion.id), `versionNumber`, `createdAt`.
- **`DiffDTO`** finalne pola: `fileId`, `fromVersionId`,
  `fromVersionNumber`, `toVersionId`, `toVersionNumber`, `diff`
  (string, format unified diff – czysto tekstowy, bez interpretacji,
  zgodnie z ADR-001).

---

## 6. MCP Specification (FINAL – wszystkie 15 operacji)

### Konwencje globalne

- Domyślne sortowanie: **`path ASC`** wszędzie, **z wyjątkiem**
  `project.history` i `file.versions`, które używają **DESC**
  (chronologia / "najnowsze pierwsze" — analogia do `git log`).
- Identyfikacja FileVersion w API zawsze przez `FileVersion.id`
  (globalnie unikalny), nigdy przez kombinację `fileId` +
  `versionNumber`.

---

### FILE OPERATIONS (7)

#### `file.read` — read-only
- Request: `fileId`
- Response: `OperationResponse<FileDTO>`
- Brak walidacji wersji. Archived pliki czytelne.
- Errors: `FILE_NOT_FOUND`

#### `file.create`
- Request: `projectId`, `path`, `content` (bez `type`, bez `versionId`)
- Response: `OperationResponse<FileDTO>`
- Tworzy FileVersion #1. `Project.versionId` unchanged.
- Errors: `VALIDATION_ERROR`, `UNSUPPORTED_FILE_TYPE`,
  `PROJECT_NOT_FOUND`, `PATH_CONFLICT`

#### `file.update`
- Request: `fileId`, `versionId`, `content`
- Response: `OperationResponse<FileDTO>` lub `OperationResponse<ConflictData>`
- Tworzy nową FileVersion; `ProjectFile.versionId` = nowy ETag.
  `Project.versionId` unchanged.
- Errors: `VALIDATION_ERROR`, `FILE_NOT_FOUND`, `FILE_ARCHIVED`,
  `NO_CHANGES`

#### `file.move`
- Request: `fileId`, `versionId`, `newPath`
- Response: `OperationResponse<FileMetaDTO>` lub `OperationResponse<ConflictData>`
- NIE tworzy FileVersion. Aktualizuje `path` + `versionId`. `type`
  przeliczany automatycznie. `Project.versionId` unchanged.
- Errors: `VALIDATION_ERROR`, `UNSUPPORTED_FILE_TYPE`,
  `FILE_NOT_FOUND`, `FILE_ARCHIVED`, `PATH_CONFLICT`

#### `file.archive`
- Request: `fileId`, `versionId`
- Response: `OperationResponse<FileMetaDTO>` lub `OperationResponse<ConflictData>`
- Efekt: `status → archived`, nowy `versionId`. Jeśli plik był
  `defaultFileId` → `Project.defaultFileId = null` +
  nowy `Project.versionId`. W innym wypadku `Project.versionId`
  unchanged. Brak FileVersion.
- Errors: `VALIDATION_ERROR`, `FILE_NOT_FOUND`, `FILE_ARCHIVED`
  (jeśli już archived — ten sam kod co object-state w innych
  operacjach, nie osobny `FILE_ALREADY_ARCHIVED`)

#### `file.unarchive` *(operacja dodana w sesji 2026-06-30 – domyka lukę odkrytą podczas review: dokumentacja zawsze zakładała odwracalność archiwizacji, ale operacja nigdy nie była formalnie w kontrakcie)*
- Request: `fileId`, `versionId`
- Response: `OperationResponse<FileMetaDTO>` lub `OperationResponse<ConflictData>`
- Efekt: `status → active`, nowy `versionId`. **Nie przywraca
  automatycznie `defaultFileId`** (świadoma decyzja — bycie default
  file to osąd modelu AI/usera, nie coś co system powinien zgadywać).
  Brak FileVersion.
- Errors: `VALIDATION_ERROR`, `FILE_NOT_FOUND`, `FILE_NOT_ARCHIVED`,
  `PATH_CONFLICT` (jeśli `path` zajęty przez inny aktywny plik —
  business validation krok 5, analogicznie do `file.create`/`file.move`)

#### `file.delete`
- Wymaga uprzedniej archiwizacji (dwuetapowy proces jako bezpiecznik
  — archive jest odwracalnym "koszem", delete jest nieodwracalny).
- Request: `fileId`, `versionId`
- Response: `OperationResponse<null>` lub `OperationResponse<ConflictData>`
- Efekt: **Hard delete** — fizyczne usunięcie `ProjectFile` ORAZ
  wszystkich powiązanych `FileVersion`. Po usunięciu `fileId`
  przestaje istnieć (wszystkie dalsze operacje zwracają
  `FILE_NOT_FOUND`). Defensywne czyszczenie `defaultFileId`, jeśli
  wskazuje usuwany plik (teoretycznie nieosiągalne, bo `archive` już
  to czyści — ale defensywna spójność > założenia).
- Errors: `VALIDATION_ERROR`, `FILE_NOT_FOUND`, `FILE_NOT_ARCHIVED`

  > **Uwaga dokumentacyjna (ważna, nieoczywista za kilka miesięcy):**
  > `file.delete` trwale usuwa historię FileVersion danego pliku.
  > `project.history` przestanie zawierać wpisy pochodzące z tego
  > pliku. To zachowanie jest celowe i wynika wyłącznie z jawnej
  > operacji `file.delete` — **nie jest to utrata danych w sensie
  > błędu**, lecz świadomy, nieodwracalny trade-off odróżniający
  > `delete` od odwracalnego `archive`.

---

### PROJECT OPERATIONS (6)

> **Decyzja graniczna (sesja 2026-06-30, po dodatkowej dyskusji
> Claude + ChatGPT + użytkownik):** Project Lifecycle (tworzenie,
> listowanie, usuwanie) jest podzielony między dwie warstwy:
>
> **Application Layer** (poza MCP, dostępne tylko bezpośrednio
> użytkownikowi, np. przez przyszłe CLI):
> - tworzenie projektu *(uwaga: ostatecznie `project.create` trafiło
>   do MCP — zob. niżej; ta warstwa pozostaje konceptualnie ważna dla
>   `project.delete`)*
> - usuwanie projektu — **NIE istnieje w MCP**
>
> **MCP Layer** (dostępne modelom AI):
> - `project.create`
> - `project.list`
> - `project.open`, `project.files`, `project.search.fulltext`, `project.history`
> - wszystkie File Operations i File Version Operations
>
> **Uzasadnienie braku `project.delete` w MCP:**
> Rozważono cztery opcje: (1) całkowity brak w MCP, (2) pełny
> dwuetapowy lifecycle analogiczny do plików (`Project.status` +
> `project.archive` + `project.delete`), (3) miękkie poleganie na
> tym, że model/klient MCP sam pyta użytkownika o potwierdzenie,
> (4) wymóg "świadomej akceptacji użytkownika" jako zasada produktowa
> bez przesądzonego mechanizmu.
>
> Odrzucono opcję 3 jako niewystarczającą — to nie jest zabezpieczenie
> systemowe, tylko konwencja zależna od konkretnego klienta MCP, którą
> łatwo pominąć.
>
> Odrzucono (na razie) opcję 2 — techniczne ryzyko usunięcia całego
> projektu jest realne i wyższe niż przy pojedynczym pliku (większa
> skala szkody, nieodwracalność, możliwe źródła błędu: błędna
> interpretacja intencji użytkownika, pomylenie `projectId` przy
> wielu projektach, prompt injection z treści plików, nadgorliwość
> AI) — ale zbudowanie pełnego mechanizmu ochronnego wymagałoby
> rozszerzenia Domain Model o `Project.status`, nowych operacji
> (`project.archive`, `project.unarchive`), nowych zachowań
> `project.open`/`project.list` i nowego ADR. To jest nieproporcjonalny
> koszt względem braku jakiegokolwiek dzisiejszego use-case'u, w
> którym AI musiałoby samodzielnie usuwać projekty (YAGNI).
>
> **Wybrano opcję 1, jako najprostszą realizację wymogu z opcji 4**
> ("człowiek musi być w pętli przed usunięciem projektu"). Najprostszy
> sposób spełnienia tego wymogu w MVP to: `project.delete` po prostu
> nie istnieje jako tool MCP. Model AI może co najwyżej zaproponować
> użytkownikowi usunięcie projektu, ale fizycznie wykonuje to wyłącznie
> sam użytkownik, poza zasięgiem AI (np. ręcznie lub przez przyszłe
> proste CLI/UI aplikacji).
>
> **Wymóg "AI Awareness" (dodane na życzenie użytkownika, 2026-06-30):**
> Mimo że `project.delete` nie jest toolem MCP, model AI powinien
> **wiedzieć, że taka operacja koncepcyjnie istnieje** w systemie
> (jako funkcja Application Layer dostępna tylko użytkownikowi) i
> umieć **proaktywnie zasugerować użytkownikowi ręczne usunięcie
> projektu**, gdy kontekst rozmowy na to wskazuje (np. projekt
> wygląda na porzucony, zduplikowany, testowy, albo użytkownik
> wprost o to pyta: "czy mogę gdzieś usunąć ten projekt?"). AI nigdy
> nie wykonuje usunięcia samodzielnie — wyłącznie informuje
> użytkownika o istnieniu i przypomina o ręcznym sposobie wykonania.
> To wymaga, by wiedza o istnieniu `project.delete` na poziomie
> Application Layer była dostępna modelowi AI przez kontekst/
> dokumentację (np. ten dokument, lub treść opisu narzędzi MCP),
> a nie tylko milczącym brakiem toola — inaczej AI nie miałoby jak
> wiedzieć, że taka możliwość w ogóle istnieje.
>
> **To NIE jest ograniczenie silnika AI Workspace, tylko kontraktu
> MCP.** Warstwa `storage`/`domain` może (i prawdopodobnie będzie)
> mieć pełną funkcję `deleteProject()` używaną przez przyszłe
> CLI/UI — po prostu `server.ts` nigdy nie wystawia jej jako MCP tool.
>
> **Status: ETAP 1 (obecne MVP).** Jeśli w przyszłości pojawi się
> realny przypadek użycia wymagający, by AI mogło samodzielnie
> (zarchiwizowywać i) usuwać projekty, **ETAP 2** zaprojektuje pełny
> lifecycle Project analogiczny do File (z `Project.status`,
> `project.archive`, `project.unarchive`) — jako osobna, świadoma
> runda projektowa z nowym ADR, nie retrospektywna łatka.

#### `project.create`
- Request: `name`
- Response: `OperationResponse<ProjectMetaDTO>` *(nowy, minimalny DTO
  do zaprojektowania przy implementacji — analogiczny do `FileMetaDTO`,
  zawiera co najmniej `id`, `name`, `versionId`)*
- Tworzy nowy katalog projektu na dysku (`project.json` + puste
  `files/` i `versions/`). `defaultFileId = null` przy tworzeniu.
- Walidacje: 1. Request validation, 2. (brak — tworzenie nie wymaga
  sprawdzania istnienia)
- Errors: `VALIDATION_ERROR`
- *(Pytanie otwarte do doprecyzowania przy implementacji: czy `name`
  musi być unikalne wśród projektów? Nie ustalono explicite — domyślna
  rekomendacja: NIE wymagamy unikalności nazwy, identyfikacja zawsze
  przez `id`, zgodnie z tym jak `path` nie musi być unikalny między
  różnymi projektami.)*

#### `project.list` — read-only
- Request: `page`, `pageSize` (bez filtrów w MVP)
- Response: `OperationResponse<PageDTO<ProjectMetaDTO>>`
- Zwraca wszystkie istniejące projekty.
- Sortowanie: do ustalenia przy implementacji — rekomendacja: `name ASC`
  (analogicznie do `path ASC` dla plików, deterministyczne i proste).
- Errors: `VALIDATION_ERROR`

#### `project.open` — read-only
- Request: `projectId`
- Response: `OperationResponse<ProjectOpenDTO>`
- Logika: jeśli `Project.defaultFileId != null` → zwraca
  `defaultFile` (FileDTO), `files = null`. W przeciwnym razie →
  `defaultFile = null`, `files` = `PageDTO<FileMetaDTO>`
  (**tylko active**, sortowane `path ASC`).
- Errors: `VALIDATION_ERROR`, `PROJECT_NOT_FOUND`

#### `project.files` — read-only
- Request: `projectId`, `status?` ("active" | "archived"), `page`, `pageSize`
- Response: `OperationResponse<PageDTO<FileMetaDTO>>`
- Filtrowanie: **brak `status` → zwraca WSZYSTKIE pliki** (active +
  archived). To celowo różni się od `project.open`, który domyślnie
  pokazuje tylko active — `project.open` to "punkt startowy pracy",
  `project.files` to "pełny inwentarz projektu".
- Sortowanie: `path ASC`. Jedyny filtr MVP to `status` (brak
  pathPrefix, type itd. — YAGNI; do tego służy `project.search.fulltext`).
- Errors: `VALIDATION_ERROR`, `PROJECT_NOT_FOUND`

#### `project.search.fulltext` — read-only
- Request: `projectId`, `query` (non-empty, inaczej `VALIDATION_ERROR`), `page`, `pageSize`
- Response: `OperationResponse<PageDTO<SearchResultDTO>>`
- Zakres: **tylko aktualna treść aktywnych plików.** NIE przeszukuje:
  historii FileVersion, plików archived, ścieżek/nazw/metadanych
  (do tego `project.files`).
- Sortowanie: `path ASC`. **Brak rankingu/relevance/scoringu** — to
  świadoma decyzja zgodna z ADR-001 (AI Workspace nie interpretuje
  treści; ocenę trafności robi model AI na podstawie zwróconego
  excerptu).
- Errors: `VALIDATION_ERROR`, `PROJECT_NOT_FOUND`

#### `project.history` — read-only
- Request: `projectId`, `page`, `pageSize`
- Response: `OperationResponse<PageDTO<HistoryEntryDTO>>`
- Budowane dynamicznie przez agregację FileVersion wszystkich plików
  projektu. Zawiera wyłącznie zdarzenia treściowe: `file.create`,
  `file.update`, `file.version.restore`. NIE zawiera `file.move`,
  `file.archive`, `file.unarchive` (zmiany metadanych, nie treści —
  ADR-005 po korekcie). Po `file.delete` wpisy danego pliku znikają
  z agregacji (zob. uwaga w sekcji `file.delete`).
- Sortowanie: `createdAt DESC` (najnowsze pierwsze — analogia do git log).
- **Brak `operationType`** w `HistoryEntryDTO` (świadomie odrzucone —
  YAGNI, nie ma case'u MCP wymagającego wiedzy "czy ta wersja powstała
  przez update czy restore"; po restore powstaje zwykła FileVersion
  bez śladu pochodzenia).
- Errors: `VALIDATION_ERROR`, `PROJECT_NOT_FOUND`

---

### FILE VERSION OPERATIONS (4)

#### `file.versions` — read-only
- Request: `fileId`, `page`, `pageSize`
- Response: `OperationResponse<PageDTO<FileVersionMetaDTO>>` (bez `content`)
- Działa zarówno dla active, jak i archived plików (read-only,
  spójne z `file.read`).
- Sortowanie: `versionNumber DESC`.
- Errors: `VALIDATION_ERROR`, `FILE_NOT_FOUND`

#### `file.version.get` — read-only
- Request: `versionId` (samo `FileVersion.id`, bez `fileId` — id jest
  globalnie unikalne, `fileId` byłby redundantny)
- Response: `OperationResponse<FileVersionDTO>` (z `content`)
- Działa niezależnie od statusu ProjectFile.
- Errors: `VALIDATION_ERROR`, `FILE_VERSION_NOT_FOUND`

#### `file.version.diff` — read-only
- Request: `fromVersionId`, `toVersionId`
- Response: `OperationResponse<DiffDTO>`
- Walidacja biznesowa: obie wersje muszą należeć do tego samego pliku
  (`fromVersion.fileId == toVersion.fileId`), inaczej
  `VERSION_MISMATCH`. Diff jest czystym tekstem w formacie unified
  diff — AI Workspace nie interpretuje znaczenia zmian (ADR-001).
- Errors: `VALIDATION_ERROR`, `FILE_VERSION_NOT_FOUND`, `VERSION_MISMATCH`

#### `file.version.restore`
- Request: `targetVersionId`, `currentVersionId`
- Response: `OperationResponse<FileDTO>` lub `OperationResponse<ConflictData>`
- Wymaga, by plik był `active` (inaczej `FILE_ARCHIVED` — najpierw
  `file.unarchive`, potem restore).
- Walidacja wersji: `currentVersionId` vs aktualny `ProjectFile.versionId`
  → przy niezgodności **`OperationResponse<ConflictData>`**, NIE kod błędu.
- Business validation: jeśli treść `targetVersion` == aktualna treść
  → `NO_CHANGES` (uniknięcie zaśmiecania historii identyczną wersją).
- Efekt: tworzy NOWĄ FileVersion z treścią `targetVersion` (nigdy nie
  cofa historii — ADR-005). `versionNumber` = poprzedni + 1.
  Aktualizuje `ProjectFile.versionId`.
- Errors: `VALIDATION_ERROR`, `FILE_VERSION_NOT_FOUND`, `FILE_ARCHIVED`, `NO_CHANGES`

---

## 7. Filesystem Layout (FINAL)

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

### Format plików

**`project.json`** (obiekt Project):
```json
{
  "id": "...",
  "name": "...",
  "defaultFileId": "...",
  "versionId": "..."
}
```

**`files/{fileId}.json`** (obiekt ProjectFile):
```json
{
  "id": "...",
  "projectId": "...",
  "path": "...",
  "versionId": "...",
  "status": "active"
}
```

**`versions/{fileId}/{versionId}.json`** (obiekt FileVersion):
```json
{
  "id": "...",
  "fileId": "...",
  "versionNumber": 1,
  "content": "...",
  "createdAt": "..."
}
```

### Naming conventions

- Identyfikatory (`id`, `projectId`, `fileId`, `versionId`): UUID v4,
  generowane przez AI Workspace przy tworzeniu.
- Nazwa pliku ProjectFile na dysku = `{fileId}.json` — **NIE** `path`
  z domeny (path bywa niestabilny przez `file.move` i może zawierać
  znaki niedozwolone w systemie plików).
- Nazwa pliku FileVersion na dysku = `{versionId}.json` — **NIE**
  `{versionNumber}.json` ani kombinacja numeru z id.

### Dlaczego `{versionId}.json`, a nie `{versionNumber}.json`

Rozważone i odrzucone alternatywy:
- **Indeks globalny** (`index/versions.json` mapujący versionId →
  fileId+versionNumber) — odrzucony: wprowadza czwartą trwałą encję
  systemową nieobecną w modelu domenowym oraz problem spójności
  między dwoma zapisami (co jeśli zapis FileVersion się powiedzie, a
  indeksu nie).
- **`{versionNumber}__{versionId}.json`** — rozważany, ale odrzucony
  na rzecz prostszej opcji poniżej.
- **`{versionId}.json`** (wybrana) — `versionNumber` to atrybut
  biznesowy, nie identyfikator; prawdziwym identyfikatorem jest
  zawsze `FileVersion.id`, po którym odwołuje się cały kontrakt API
  (`get`, `diff`, `restore`, `history`). `file.versions` i tak musi
  otworzyć każdy plik, by zbudować `FileVersionMetaDTO`, więc nazwa
  pliku na dysku nie daje żadnego skrótu wydajnościowego — czysta
  zgodność API ↔ storage jest ważniejsza.

### Mapowanie operacji MCP → storage (sanity check)

| Operacja | Operacja na dysku |
|---|---|
| file.read | odczyt `files/{fileId}.json` |
| file.create | zapis `files/{fileId}.json` + `versions/{fileId}/{versionId}.json` (v1) |
| file.update | nadpisanie `files/{fileId}.json` + nowy plik w `versions/{fileId}/` |
| file.move | nadpisanie `files/{fileId}.json`; BRAK zmian w `versions/` |
| file.archive / unarchive | nadpisanie `files/{fileId}.json` (status + versionId) |
| file.delete | usunięcie `files/{fileId}.json` + całego katalogu `versions/{fileId}/` |
| file.versions | listing katalogu `versions/{fileId}/` |
| file.version.get | odczyt `versions/{fileId}/{versionId}.json` |
| file.version.diff | odczyt dwóch plików z `versions/`, diff w pamięci |
| file.version.restore | odczyt target + zapis nowej wersji + update ProjectFile |
| project.open / project.files | listing `files/*.json` |
| project.search.fulltext | iteracja po `files/*.json` (active) + odczyt aktualnej treści |
| project.history | iteracja po `versions/*/*.json` wszystkich plików projektu |

**Świadomie NIE projektujemy** żadnych dodatkowych indeksów na tym
etapie (np. dla przyspieszenia `project.history` przy dużej liczbie
wersji) — przedwczesna optymalizacja, YAGNI. Do rozważenia dopiero
przy realnym problemie wydajnościowym.

---

## 8. Wyszukiwanie — pełny model docelowy

| Poziom | Opis | Status |
|---|---|---|
| Metadata Search | po nazwie/ścieżce/metadanych | MVP — `project.files` z filtrem `status` |
| Full-text Search | po zawartości tekstowej | MVP — `project.search.fulltext` |
| Pattern Search | regex i wzorce | Odłożone na później |
| Semantic Search | rozumienie znaczenia treści | Poza zakresem AI Workspace — realizuje model AI |

Poziomy 1–3 są zgodne z ADR-001 — AI Workspace wykonuje operacje
techniczne na tekście, nie interpretuje znaczenia domenowego.

---

## 9. Zasady procesu projektowego (do wglądu, nie do stosowania w kodzie)

- Każda decyzja architektoniczna lub wpływająca na kierunek projektu
  wymagała jawnej akceptacji użytkownika przed zamknięciem.
- Claude i ChatGPT pełnili rolę równoległych co-architektów: Claude
  proponował, ChatGPT recenzował (lub odwrotnie), użytkownik
  rozstrzygał spory i zatwierdzał decyzje o wpływie architektonicznym.
- Uogólnialiśmy, gdy mieliśmy drugi konkretny przypadek, nie gdy go
  przewidywaliśmy (YAGNI) — zasada stosowana konsekwentnie od
  pierwszej sesji do ostatniej.
- Profil ryzyka decyzji determinował głębokość procesu: kontrakt
  API/model domenowy (wysoki koszt zmiany) dostały pełny proces z ADR;
  Filesystem Layout (niski koszt zmiany, czysto implementacyjny
  detal) dostał lekki szkic + krótki review — świadoma, zatwierdzona
  decyzja procesowa pod koniec fazy projektowej.

---

## 10. Implementation Plan (FINAL)

> Ta sekcja dokumentuje decyzje podjęte wspólnie przez Claude, ChatGPT
> i użytkownika po zamknięciu fazy projektowej. W odróżnieniu od
> sekcji 1–9 (architektura — wysoki koszt zmiany), poniższe są
> decyzjami implementacyjnymi (niski koszt zmiany) i mogą ewoluować
> podczas kodowania bez naruszania architektury.

### Stack technologiczny

**TypeScript + Node.js**

Powody:
- Oficjalny MCP SDK jest TypeScript-first, najlepiej udokumentowany.
- Silne typowanie 1:1 mapuje się na Domain Model i DTO bez
  dodatkowej warstwy.
- `fs/promises` w pełni wystarcza do operacji na plikach (cały
  storage to czytanie/pisanie JSON).
- Prosty start, mniejszy boilerplate niż alternatywy.

### Struktura repozytorium

```
src/
  domain/              # Project, ProjectFile, FileVersion
  dto/                 # 12 DTO z sekcji 5
  storage/             # warstwa I/O na plikach, 1:1 z sekcją 7
  validation/
    request/           # krok 1 — Request Validation
    state/              # krok 3 — Object State
    version/             # krok 4 — Version Validation (ConflictData)
    business/            # krok 5 — Business Validation
  operations/
    file/               # 7 File Operations
    project/             # 4 Project Operations
    version/             # 4 File Version Operations
  mappers/              # Domain Model ↔ DTO
  server.ts              # rejestracja MCP tools, entry point
tests/
data/                    # runtime storage (gitignored)
ARCHITECTURE.md           # skondensowany cheat sheet dla Claude Code
package.json
tsconfig.json
```

Uzasadnienie podziału `validation/` na podfoldery
`request/state/version/business`: bezpośrednio odzwierciedla 5-stopniową
Global Validation Order z sekcji 4 — kod ma być lustrem dokumentacji.
`mappers/` wydzielony osobno, by warstwa `domain/` i `dto/` pozostały
czystymi definicjami typów, bez logiki konwersji.

### Zasady pracy z Claude Code

`ARCHITECTURE.md` (skondensowany cheat sheet, nie pełna historia
dyskusji) jest źródłem prawdy dostępnym w repo. Reguły dla Claude Code:

- Nie wprowadzać nowych encji.
- Nie wprowadzać indeksów.
- Nie zmieniać nazw DTO.
- Nie zmieniać kodów błędów.
- Nie zmieniać kolejności walidacji.
- Implementować MCP Specification dokładnie wg sekcji 6.
- W razie konfliktu z architekturą — zatrzymać się i zapytać, nie
  improwizować.
- **Separacja warstw (ustalone 2026-06-30):** logika domenowa
  operacji nie może być zaszyta bezpośrednio w handlerach MCP. Zawsze:
  `MCP Handler → Operations/Service → Storage`, nigdy
  `MCP Handler → Storage` bezpośrednio. Dzięki temu przyszłe
  interfejsy (CLI, GUI, REST API) będą mogły korzystać z dokładnie
  tego samego silnika co MCP, bez duplikacji logiki. Dotyczy to w
  szczególności operacji na `Project` — warstwa `storage`/`operations`
  może mieć pełniejszą funkcjonalność (np. `deleteProject()`) niż to,
  co jest wystawione jako MCP tool w `server.ts` (zob. sekcja 6,
  uzasadnienie braku `project.delete` w MCP).
- **AI Awareness dla `project.delete` (ustalone 2026-06-30):** mimo
  że `project.delete` nie jest toolem MCP, `ARCHITECTURE.md` (cheat
  sheet dla Claude Code, ale też kontekst dostępny modelom AI
  korzystającym z AI Workspace) musi jawnie wspominać o istnieniu tej
  możliwości na poziomie Application Layer, tak by model AI mógł
  proaktywnie poinformować użytkownika o możliwości ręcznego
  usunięcia projektu, gdy to zasadne — bez wykonywania tej operacji
  samodzielnie. Praktycznie: opis narzędzi MCP (np. w `server.ts`
  przy rejestracji toolów, albo w samym `ARCHITECTURE.md`) powinien
  zawierać krótką notkę typu "usuwanie projektów jest dostępne
  wyłącznie dla użytkownika poza tym interfejsem".

### Kolejność implementacji

1. Domain
2. DTO
3. Storage
4. Validation
5. Operations
6. Tests
7. MCP adapter
8. Server

Po każdym bloku: review kodu pod kątem zgodności z architekturą,
zanim przejdziemy do kolejnego. Użytkownik dostaje do wglądu większe,
sensowne przyrosty (np. "File Operations gotowe"), nie pojedyncze pliki.

### Zakres

Pełna implementacja wszystkich 15 operacji — nie minimalny szkielet.
Architektura jest w 100% zamknięta, więc ryzyko pełnego podejścia
jest niskie.

---

*Dokument finalny fazy projektowej i planu implementacji. Stan na
2026-06-30, zatwierdzony przez Claude, ChatGPT i użytkownika.
Następny krok: napisanie `ARCHITECTURE.md` (cheat sheet) i
rozpoczęcie kodowania od warstwy `domain/`.*
