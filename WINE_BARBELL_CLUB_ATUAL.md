# WINE BARBELL CLUB — DOCUMENTAÇÃO DO ESTADO ATUAL

> Fotografia técnica e visual do aplicativo **antes** de qualquer reformulação de layout ou identidade.
> Nenhuma alteração foi feita no código, banco, autenticação, rotas, estilos ou assets para produzir este documento.
> Data da análise: 18/08/2026.

---

## 1. RESUMO RÁPIDO DO PROJETO

| Item | Estado atual |
| --- | --- |
| Nome | Wine Barbell Club |
| Tipo | PWA de gestão de estúdio de treinamento (LPO, Híbrido e modalidades cadastráveis) |
| Framework | TanStack Start v1 (React 19 + Vite) |
| Estilo | Tailwind CSS v4 (config via `src/styles.css`) + shadcn/ui |
| Backend | Lovable Cloud (Postgres + Auth + Storage + RLS) |
| Papéis | `aluno` e `admin` (enum `app_role`) |
| Tema | Escuro por padrão, alternância para claro |
| Layout base | Mobile-first, container único `max-w-3xl`, navegação inferior fixa |

---

## 2. PALETA ATUAL

Todas as cores são **tokens semânticos** declarados em `src/styles.css` em formato **OKLCH** (não há HEX literal no CSS; os HEX abaixo são os valores-alvo declarados nos comentários do arquivo e/ou a conversão aproximada). Não existe `tailwind.config.js` — o tema é declarado em `@theme inline`.

### 2.1 Tema escuro (`:root`, padrão)

| Função | Variável CSS | OKLCH | HEX aprox. | Utilitário Tailwind | Onde é usada |
| --- | --- | --- | --- | --- | --- |
| Background principal | `--background` | `oklch(0.145 0 0)` | `#0A0A0A` | `bg-background` | `body`, header, bottom nav, shell |
| Texto principal | `--foreground` | `oklch(1 0 0)` | `#FFFFFF` | `text-foreground` | títulos, labels, corpo |
| Superfície 1 | `--surface` | `oklch(0.21 0 0)` | `#1B1B1B` | `bg-surface` | chips do WOD, blocos do login |
| Superfície 2 | `--surface-2` | `oklch(0.29 0 0)` | `#2D2D2D` | `bg-surface-2` | avatar placeholder, upload |
| Card | `--card` | `oklch(0.21 0 0)` | `#1B1B1B` | `bg-card` | componente `Card` shadcn |
| Card texto | `--card-foreground` | `oklch(1 0 0)` | `#FFFFFF` | `text-card-foreground` | conteúdo de cards |
| Popover | `--popover` | `oklch(0.21 0 0)` | `#1B1B1B` | — | dialogs, dropdowns, selects |
| Dourado / Primária | `--primary` / `--gold` | `oklch(0.694 0.062 85.5)` | `#B49B63` | `bg-primary`, `text-primary` | CTAs, ícones ativos, links, ring |
| Dourado suave | `--gold-soft` | `oklch(0.8 0.052 85.5)` | ~`#D2BC8C` | `text-gold-soft` | fim do gradiente dourado |
| Texto sobre dourado | `--primary-foreground` | `oklch(0.145 0 0)` | `#0A0A0A` | `text-primary-foreground` | rótulo de botão primário |
| Secundária | `--secondary` | `oklch(0.29 0 0)` | `#2D2D2D` | `bg-secondary` | botão secundário |
| Muted (fundo) | `--muted` | `oklch(0.29 0 0)` | `#2D2D2D` | `bg-muted` | superfícies neutras |
| Muted (texto) | `--muted-foreground` | `oklch(0.68 0 0)` | ~`#9A9A9A` | `text-muted-foreground` | textos secundários, tabs inativas |
| Accent (hover) | `--accent` | `oklch(0.29 0 0)` | `#2D2D2D` | `hover:bg-accent` | hover de botões ghost/outline e ícones do header |
| Accent texto | `--accent-foreground` | `oklch(0.694 0.062 85.5)` | `#B49B63` | `hover:text-accent-foreground` | hover dourado |
| Erro / Destrutivo | `--destructive` | `oklch(0.6 0.21 25)` | ~`#E04A3F` | `bg-destructive`, `text-destructive` | badge "Cancelada", lotação cheia, botão Sair (hover), excluir |
| Erro texto | `--destructive-foreground` | `oklch(1 0 0)` | `#FFFFFF` | `text-destructive-foreground` | texto em botão destrutivo |
| Sucesso | `--success` | `oklch(0.68 0.15 150)` | ~`#3FBF7F` | `bg-success` | **token declarado mas sem uso encontrado nas telas** |
| Sucesso texto | `--success-foreground` | `oklch(0.145 0 0)` | `#0A0A0A` | — | idem |
| Borda | `--border` | `oklch(0.29 0 0)` | `#2D2D2D` | `border-border` | todas as bordas (aplicada globalmente em `*`) |
| Input | `--input` | `oklch(0.29 0 0)` | `#2D2D2D` | `border-input` | inputs, selects, textareas |
| Focus ring | `--ring` | `oklch(0.694 0.062 85.5)` | `#B49B63` | `focus-visible:ring-ring` | foco de botões e inputs |
| Sidebar (7 tokens) | `--sidebar*` | ver `styles.css` | — | — | **declarados, mas o componente `sidebar.tsx` não é usado em nenhuma tela** |
| Chart 1–5 | `--chart-1..5` | dourado + escala de cinza | — | — | **declarados, sem uso (nenhum gráfico renderizado)** |

### 2.2 Tema claro (`.light`)

| Função | Variável | OKLCH | HEX aprox. |
| --- | --- | --- | --- |
| Background | `--background` | `oklch(0.985 0.002 90)` | ~`#FAF9F7` |
| Texto | `--foreground` | `oklch(0.16 0 0)` | ~`#1A1A1A` |
| Superfície/Card | `--surface` / `--card` | `oklch(1 0 0)` | `#FFFFFF` |
| Superfície 2 | `--surface-2` | `oklch(0.95 0.003 90)` | ~`#F1F0EE` |
| Dourado / Primária | `--primary` / `--gold` | `oklch(0.56 0.07 82)` | ~`#8F7642` |
| Texto sobre dourado | `--primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` |
| Muted texto | `--muted-foreground` | `oklch(0.48 0 0)` | ~`#6E6E6E` |
| Borda / Input | `--border` / `--input` | `oklch(0.9 0.003 90)` | ~`#E4E3E0` |
| Erro | `--destructive` | `oklch(0.55 0.21 25)` | ~`#CF3F35` |
| Sucesso | `--success` | `oklch(0.55 0.15 150)` | ~`#2F9A66` |

### 2.3 Gradientes, sombras e overlays

| Token | Valor | Uso |
| --- | --- | --- |
| `--gradient-gold` | `linear-gradient(120deg, oklch(0.62 0.055 78), oklch(0.85 0.06 92), oklch(0.66 0.06 80))` | utilitário `text-gold-gradient` (logo no header, números do painel, nomes de modalidade, títulos) |
| `--gradient-surface` | escuro: `linear-gradient(160deg, oklch(0.23 0 0), oklch(0.17 0 0))` / claro: `linear-gradient(160deg, #FFF, ~#F5F4F2)` | fundo do utilitário `surface-panel` (card padrão do app) |
| `--shadow-elevated` | escuro: `0 18px 40px -18px oklch(0 0 0 / .85)` / claro: `0 14px 34px -20px oklch(0 0 0 / .35)` | sombra do `surface-panel` |
| `--shadow-gold` | escuro: `0 10px 30px -12px oklch(0.694 0.062 85.5 / .55)` | **declarado, sem uso encontrado** |
| Overlay de modais | classe padrão do shadcn (`bg-black/80`) em `dialog.tsx` / `alert-dialog.tsx` | modais de confirmação e formulários |

### 2.4 Cores fora do sistema de tokens (hardcoded)

| Cor | Local | Observação |
| --- | --- | --- |
| `#000000` (inline style) | `src/routes/index.tsx`, `src/routes/auth.tsx` (`style={{ backgroundColor: "#000000" }}`) | preto puro, diferente do `--background` (`#0A0A0A`) |
| `#0A0A0A` | `public/manifest.webmanifest` (`theme_color`, `background_color`) e meta `theme-color` em `__root.tsx` | fundo do PWA |
| `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` | SVG do `GoogleIcon` em `auth.tsx` | cores oficiais da marca Google |
| Opacidades derivadas | `primary/40`, `primary/60`, `primary/90`, `destructive/15`, `secondary/80` | usadas para bordas, hover e badges |

---

## 3. TIPOGRAFIA ATUAL

### 3.1 Fontes carregadas

Carregadas via `<link>` do Google Fonts em `src/routes/__root.tsx`:

```
https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap
```

| Fonte | Origem | Pesos | Variável | Uso |
| --- | --- | --- | --- | --- |
| **Bebas Neue** | Google Fonts | 400 (peso único) | `--font-display` | utilitário `font-display`: logo, números do painel, títulos de páginas, nomes de modalidade e WOD, títulos de diálogos |
| **Oswald** | Google Fonts | 400, 500, 600, 700 | `--font-heading` | `h1, h2, h3` globais e utilitário `eyebrow` |
| **Inter** | Google Fonts | 400, 500, 600, 700 | `--font-sans` | `body`, corpo, botões, inputs, labels, navegação |

Fallbacks declarados: `system-ui, sans-serif`.

### 3.2 Utilitários tipográficos personalizados (`src/styles.css`)

| Utilitário | Regras |
| --- | --- |
| `font-display` | `font-family: Bebas Neue; letter-spacing: 0.06em` |
| `eyebrow` | `font-family: Oswald; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.7rem; color: var(--color-gold)` |
| `text-gold-gradient` | gradiente dourado aplicado ao texto via `background-clip: text` |

Base global (`@layer base`): `h1, h2, h3` → `font-family: Oswald; font-weight: 600; letter-spacing: 0.02em`.
`body` → `font-family: Inter; -webkit-font-smoothing: antialiased`.

### 3.3 Escala aplicada por elemento

| Elemento | Classe | font-size | Peso | Espaçamento | Onde |
| --- | --- | --- | --- | --- | --- |
| H1 do dashboard aluno | `font-display text-4xl leading-none` | 2.25rem | 400 (Bebas) | `0.06em` | `app.tsx` |
| H1 de páginas (`PageTitle`) | `font-display text-3xl leading-none` | 1.875rem | 400 | `0.06em` | `AppShell.tsx` |
| Título de admin/notificações | `font-display text-3xl text-gold-gradient` | 1.875rem | 400 | `0.06em` | `admin/notificacoes.tsx` |
| Título de modal | `font-display text-2xl` | 1.5rem | 400 | `0.06em` | `RecordDialog.tsx`, agenda |
| Nome da modalidade / WOD | `font-display text-2xl` | 1.5rem | 400 | `0.06em` | `modalidades/index.tsx`, `wod.tsx`, agenda |
| Número de métrica | `font-display text-3xl text-gold-gradient` | 1.875rem | 400 | `0.06em` | `admin/index.tsx` (`Stat`) |
| Logo do header | `font-display text-lg leading-none` | 1.125rem | 400 | `0.06em` | `AppShell.tsx` |
| Eyebrow | `eyebrow` | 0.7rem | Oswald 400 | `0.18em`, uppercase | várias telas |
| Título de card/aviso | `text-sm font-semibold` | 0.875rem | 600 | — | avisos, notificações |
| Corpo | herdado do `body` | 1rem (0.875rem nas seções) | 400 | — | geral |
| Texto secundário | `text-xs text-muted-foreground` | 0.75rem | 400 | — | metadados de aula |
| Micro-texto | `text-[10px]` / `text-[11px]` | 10–11px | 400/500/600 | `tracking-wide`, uppercase | rótulos de métrica, badges, datas |
| Label de navegação inferior | `text-[10px] font-medium tracking-wide uppercase` | 10px | 500 | `tracking-wide` | `AppShell.tsx` |
| Botão | `text-sm font-medium` (`sm` = `text-xs`) | 0.875 / 0.75rem | 500 | — | `ui/button.tsx` |
| Input | `text-base md:text-sm` | 1rem mobile / 0.875rem ≥768px | 400 | — | `ui/input.tsx` (**única diferença tipográfica declarada entre mobile e desktop**) |
| Subtítulo do login | `text-sm tracking-[0.2em] uppercase` | 0.875rem | 400 | `0.2em` | `auth.tsx` |
| Chips do WOD | `text-xs font-semibold tracking-wide uppercase` | 0.75rem | 600 | `tracking-wide` | `wod.tsx` |

Observação: **não há nenhum outro ajuste tipográfico responsivo** além do `md:text-sm` dos inputs — os tamanhos são idênticos em mobile, tablet e desktop.

---

## 4. SISTEMA DE CARDS ATUAL

O app **não usa o componente `ui/card.tsx` do shadcn em nenhuma tela**. Todos os cards são construídos com o utilitário CSS `surface-panel` mais classes utilitárias aplicadas caso a caso.

### 4.1 Card base — `surface-panel` (utilitário CSS)

| Propriedade | Valor |
| --- | --- |
| Arquivo | `src/styles.css` (`@utility surface-panel`) |
| Background | `var(--gradient-surface)` |
| Border | `1px solid var(--color-border)` (`#2D2D2D` no escuro) |
| Border radius | `var(--radius-lg)` = `0.75rem` |
| Shadow | `var(--shadow-elevated)` |
| Padding | **não definido pelo utilitário** — cada uso aplica o seu |
| Estados | nenhum estado embutido; `hover:border-primary/60` é adicionado manualmente onde há hover |

### 4.2 Inventário de cards

| # | Card | Arquivo | Onde aparece | Padding | Estrutura | Estados |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Card "Próxima aula"** | `src/routes/_authenticated/app.tsx` | Dashboard aluno | header `px-5 py-3`, corpo `px-5 py-4` (vazio: `px-5 py-6`) | eyebrow + divisor + nome em `text-gold-gradient` + linha de metadados com ícones `CalendarDays`/`Clock` | normal e **empty** (texto + link "Ver agenda"). Sem hover, sem loading, sem erro |
| 2 | **Atalho do aluno** | `app.tsx` | Dashboard aluno | `px-2 py-4` | ícone `size-5` dourado + label `text-[11px]`, centralizado, grid 3 colunas | hover: `hover:border-primary/60` (transição de cor) |
| 3 | **Card de aviso recente** | `app.tsx` | Dashboard aluno | `px-4 py-3` | `h2 text-sm font-semibold` + `p text-xs muted` | normal e empty (`EmptyState`) |
| 4 | **Card de aula (aluno)** | `src/routes/_authenticated/agenda.tsx` | Agenda aluno | `article` com padding próprio | hora + modalidade + instrutor (`User2`) + vagas restantes; à direita botão Reservar / Cancelar / badge "Cancelada" / ícone Google Agenda | normal, **lotada** (botão `disabled` = "Sem vagas"), **confirmada** (mostra Cancelar + `CalendarPlus`), **cancelada** (badge `bg-destructive/15`), **loading** (`EmptyState "Carregando…"`) |
| 5 | **Card de WOD** | `src/routes/_authenticated/wod.tsx` | WOD | header `px-5 py-3`, corpo `px-5 py-4` | eyebrow (modalidade) + `h2 font-display text-2xl` + data à direita; corpo com blocos `Field` e grid 3 colunas (séries/reps/tempo) + iframe YouTube `aspect-video` | normal, loading e empty |
| 6 | **Card de modalidade** | `src/routes/_authenticated/modalidades/index.tsx` | Modalidades | imagem `h-32 object-cover` + bloco `px-4 py-4` | imagem opcional + nome em gradiente dourado + descrição `line-clamp-2` + `ChevronRight` | hover `hover:border-primary/60`; loading e empty |
| 7 | **Card de notificação** | `src/routes/_authenticated/notificacoes.tsx` | Notificações | `px-4 py-3` | título + data uppercase `text-[10px]` + mensagem `whitespace-pre-line` | normal, loading, empty |
| 8 | **Card de métrica (`Stat`)** | `src/routes/_authenticated/admin/index.tsx` | Painel admin | `px-3 py-4`, centralizado | número `font-display text-3xl` em gradiente + rótulo `text-[10px] uppercase` | apenas normal (sem loading/skeleton) |
| 9 | **Atalho de gestão (admin)** | `admin/index.tsx` | Painel admin | `px-1 py-3` | ícone `size-4` + label `text-[10px]`, grid 4 colunas | hover `hover:border-primary/60` |
| 10 | **Linha "Próximas aulas" (admin)** | `admin/index.tsx` | Painel admin | `px-4 py-3` | modalidade + metadados + contador `usados/limite` (dourado ou destrutivo quando lotado) | normal; **lotado** muda a cor do contador |
| 11 | **Card de aula expansível (admin)** | `src/routes/_authenticated/admin/agenda.tsx` | Agenda admin | card com cabeçalho clicável | aula + ocupação + `ChevronDown` que expande a lista de alunos reservados | **collapsed / expanded**, loading, empty |
| 12 | **Card de aluno** | `src/routes/_authenticated/admin/alunos.tsx` | Alunos (admin) | card de lista | foto/avatar + nome + contatos + CPF/nascimento mascarados + ações editar/excluir/revelar | normal + diálogo de revelação de dado sensível + confirmação de exclusão |
| 13 | **Card de modalidade (admin)** | `admin/modalidades.tsx` | Modalidades (admin) | card de lista | nome + descrição + ações CRUD | normal |
| 14 | **Card de horário (admin)** | `admin/horarios.tsx` | Horários (admin) | card de lista | modalidade + data/hora + instrutor + ocupação + ações | normal + modal de conflito de horário |
| 15 | **Card de treino (admin)** | `admin/treinos.tsx` | Treinos (admin) | card de lista | nome + modalidade + data + ações CRUD | normal |
| 16 | **`EmptyState`** | `src/components/AppShell.tsx` | todas as telas | `px-5 py-10`, centralizado | texto `text-sm muted` | é o **único** componente compartilhado de estado; usado também como "carregando" e como bloqueio de permissão em `AdminGuard` |
| 17 | **Bloco de confirmação por e-mail** | `src/routes/auth.tsx` | Login | `p-5` | `rounded-xl border border-border bg-surface` — **não usa `surface-panel`** | normal |

### 4.3 Cards por público

- **Aluno:** próxima aula, atalhos, avisos, aula da agenda, WOD, modalidade, notificação.
- **Administrador:** métrica (`Stat`), atalho de gestão, próximas aulas, aula expansível, aluno, modalidade, horário, treino.
- **Pagamentos / planos:** **não existem cards de pagamento ou plano** (a coluna `alunos.plano_id` existe no banco, mas não há tela nem card correspondente).
- **Gráficos/métricas visuais:** apenas o `Stat` numérico; nenhum gráfico renderizado.

### 4.4 Cards visualmente semelhantes implementados separadamente

- **Atalho do aluno** (`px-2 py-4`, ícone `size-5`, `text-[11px]`, grid 3) e **atalho de gestão do admin** (`px-1 py-3`, ícone `size-4`, `text-[10px]`, grid 4) são o mesmo padrão visual duplicado com medidas diferentes.
- **Card de aviso** (`app.tsx`) e **card de notificação** (`notificacoes.tsx`) têm marcação quase idêntica (`surface-panel px-4 py-3`), duplicada em dois arquivos.
- Os cinco cards de lista do admin (aluno, modalidade, horário, treino, aula) repetem a mesma estrutura "linha com título + metadados + ações" sem componente compartilhado.

---

## 5. SISTEMA DE BOTÕES ATUAL

### 5.1 Componente base

Arquivo: `src/components/ui/button.tsx` (shadcn + `class-variance-authority`).

Classes base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0`.

| Variante | Background | Texto | Borda | Hover | Uso no app |
| --- | --- | --- | --- | --- | --- |
| `default` (primary) | `bg-primary` (dourado) | `text-primary-foreground` (preto) | — | `bg-primary/90` | Entrar, Reservar, Salvar, Confirmar, Adicionar |
| `destructive` | `bg-destructive` | branco | — | `bg-destructive/90` | exclusões no admin |
| `outline` | `bg-background` | `text-foreground` | `border-input` | `bg-accent` + `text-accent-foreground` | Entrar com Google, Cancelar reserva, Trocar foto, "Agora não" |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | — | `bg-secondary/80` | pouco usado |
| `ghost` | transparente | herdado | — | `bg-accent` + `text-accent-foreground` | "Voltar para o login", ícone do Google Agenda |
| `link` | transparente | `text-primary` | — | `underline` | uso pontual |

| Tamanho | Altura | Padding | Fonte |
| --- | --- | --- | --- |
| `default` | `h-9` (36px) | `px-4 py-2` | `text-sm` |
| `sm` | `h-8` (32px) | `px-3` | `text-xs` |
| `lg` | `h-10` (40px) | `px-8` | `text-sm` |
| `icon` | `h-9 w-9` | — | — |

Border radius de todos: `rounded-md` = `calc(0.75rem - 2px)` ≈ `10px`.

### 5.2 Estados

- **Focus:** `focus-visible:ring-1 ring-ring` (dourado). Não há `ring-offset`.
- **Disabled:** `opacity-50`, `pointer-events-none`, `cursor-not-allowed`.
- **Loading:** não existe estado embutido; é feito manualmente com `disabled={busy}` + `<Loader2 className="animate-spin" />` em `auth.tsx`, e com troca de rótulo ("Enviando…") em `RecordDialog.tsx`.
- **Active/pressed:** não há estilo dedicado (apenas o hover).

### 5.3 Botões fora do componente `Button`

| Botão | Arquivo | Estilo |
| --- | --- | --- |
| Ícones do header (notificações, tema, sair) | `AppShell.tsx` | `<button>`/`<Link>` cru: `size-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary` (o Sair usa `hover:text-destructive`) |
| Abas da navegação inferior | `AppShell.tsx` | `<Link>` com `flex-1 rounded-lg py-1.5 text-[10px] uppercase`, ativo = `text-primary` |
| Chips de filtro do WOD | `wod.tsx` | `<button>` cru: `rounded-full border px-4 py-1.5 text-xs uppercase`; ativo = `bg-primary text-primary-foreground` |
| Links de troca de modo no login | `auth.tsx` | `<button>` cru com `underline-offset-4 hover:underline` |
| "Remover" foto | `RecordDialog.tsx` | `<button>` cru `text-[11px] underline` |

**Não existem** floating action buttons nem toggle buttons no app.

---

## 6. INVENTÁRIO DE COMPONENTES

### 6.1 Componentes próprios do projeto

| Componente | Arquivo | Função | Utilizado em |
| --- | --- | --- | --- |
| `AppShell` | `src/components/AppShell.tsx` | Layout logado: header fixo (logo, sino, tema, sair) + `main max-w-3xl` + navegação inferior fixa por papel; redireciona admin para `/admin` | todas as rotas `_authenticated` |
| `PageTitle` | `src/components/AppShell.tsx` | Cabeçalho de página com eyebrow, título e slot de ação | agenda, WOD, modalidades, notificações, perfil, todas as telas admin |
| `EmptyState` | `src/components/AppShell.tsx` | Painel de estado vazio / carregando / sem permissão | quase todas as telas |
| `AdminGuard` | `src/components/AdminGuard.tsx` | Bloqueia a renderização se `isAdmin` for falso; mostra "Verificando permissões…" enquanto carrega | `admin/index`, `admin/agenda`, `admin/alunos`, `admin/horarios`, `admin/modalidades`, `admin/treinos` |
| `RecordDialog` | `src/components/RecordDialog.tsx` | Formulário CRUD genérico em modal, dirigido por `FieldSpec[]` (text, textarea, date, time, number, email, select, image) | telas CRUD do admin |
| `ImageField` | `src/components/RecordDialog.tsx` (interno) | Upload de imagem para o bucket `avatars` com preview assinado, limite de 5 MB | dentro do `RecordDialog` |
| `NovaAulaDialog` | `src/routes/_authenticated/admin/horarios.tsx` (local) | Criação de aulas em lote via calendário, com verificação de conflito de horário | Horários (admin) |
| `AuthProvider` / `useAuth` | `src/lib/auth.tsx` | Contexto de sessão, perfil, ficha de aluno e flag `isAdmin` | `__root.tsx` e todas as telas |
| `ThemeProvider` / `useTheme` | `src/lib/theme.tsx` | Alternância dark/light persistida em `localStorage` (`wbc-theme`) | `__root.tsx`, header |
| `AuthSync` | `src/routes/__root.tsx` (local) | Invalida o router em eventos de login/logout | root |
| `NotFoundComponent` | `src/routes/__root.tsx` | Tela 404 com "404" em gradiente dourado | root |
| `ErrorComponent` | `src/routes/__root.tsx` | Boundary de erro com botões "Tentar novamente" / "Início" | root |
| `GoogleIcon` | `src/routes/auth.tsx` (local) | SVG do logo Google | Login |
| `Stat` | `admin/index.tsx` (local) | Card numérico de métrica | Painel admin |
| `Field` | `wod.tsx` (local) | Rótulo eyebrow + valor | WOD |
| `use-mobile` | `src/hooks/use-mobile.tsx` | Hook de breakpoint 768px | **não é importado por nenhuma tela** (só pelo `ui/sidebar.tsx`, também não usado) |

### 6.2 Biblioteca shadcn/ui — 45 arquivos em `src/components/ui/`

**Efetivamente usados:** `button`, `input`, `label`, `textarea`, `dialog`, `alert-dialog`, `sonner` (toasts via `sonner` diretamente no `__root.tsx`).

**Presentes mas sem uso nas telas:** `accordion`, `alert`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `toggle`, `toggle-group`, `tooltip`.

Consequências práticas do estado atual:
- **Select:** os formulários usam `<select>` HTML nativo estilizado, não o `ui/select.tsx`.
- **Skeleton:** nunca usado — todos os carregamentos mostram texto em `EmptyState`.
- **Table:** nenhuma tabela renderizada; todas as listagens são cards empilhados.
- **Badge:** os "badges" existentes (Cancelada, vagas) são `<span>` com classes inline.
- **Avatar:** as fotos usam `<img>` cru dentro de um `div` arredondado.
- **Form / react-hook-form / zod:** instalados, mas todos os formulários usam `useState` manual.

---

## 7. MAPA COMPLETO DE TELAS

Roteamento por arquivo (TanStack Router). Árvore gerada em `src/routeTree.gen.ts`.

| # | Tela | Rota | Arquivo | Acesso | Dados | Ações | Estados |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Splash / redirect | `/` | `src/routes/index.tsx` | público | `useAuth` | redireciona para `/app` (logado) ou `/auth` | logo com `animate-pulse` + "Carregando…" |
| 2 | Login / Cadastro / Recuperação | `/auth` | `src/routes/auth.tsx` | público | sessão | login e-mail+senha, cadastro, reset de senha, login Google | busy (spinner), enviado (confirmação por e-mail), erros por toast |
| 3 | Redefinir senha | `/reset-password` | `src/routes/reset-password.tsx` | link de e-mail | sessão de recuperação | definir nova senha | busy, sucesso, erro |
| 4 | Layout autenticado | (pathless `_authenticated`) | `src/routes/_authenticated/route.tsx` | autenticado | `supabase.auth.getUser()` no `beforeLoad`; `ssr: false` | redireciona para `/auth` se não houver sessão | — |
| 5 | Dashboard do aluno | `/app` | `_authenticated/app.tsx` | aluno (admin é redirecionado) | `fetchMinhasReservas`, `fetchNotificacoes` | navegar pelos atalhos | empty da próxima aula, empty de avisos |
| 6 | Agenda do aluno | `/agenda` | `_authenticated/agenda.tsx` | aluno | `fetchHorarios(true)`, `fetchOcupacao`, `fetchMinhasReservas` | reservar (com confirmação), cancelar (com confirmação), adicionar ao Google Agenda | loading, empty, lotada, cancelada, confirmada |
| 7 | WOD | `/wod` | `_authenticated/wod.tsx` | aluno | `fetchTreinos`, `fetchModalidades` | filtrar por modalidade, assistir vídeo | loading, empty |
| 8 | Modalidades | `/modalidades` | `_authenticated/modalidades/index.tsx` | aluno | `fetchModalidades` | abrir detalhe | loading, empty |
| 9 | Detalhe da modalidade | `/modalidades/$id` | `_authenticated/modalidades/$id.tsx` | aluno | modalidade por id | ver vídeo e galeria | loading, não encontrado |
| 10 | Perfil | `/perfil` | `_authenticated/perfil.tsx` | aluno | `profiles`, `alunos`, `alunos_sensiveis`, `fetchMinhasReservas`, `signedAvatar` | upload de foto, editar dados, CPF/nascimento, trocar senha, sair | busy, toasts de sucesso/erro |
| 11 | Notificações | `/notificacoes` | `_authenticated/notificacoes.tsx` | autenticado | `fetchNotificacoes` | leitura | loading, empty |
| 12 | Painel admin | `/admin` | `_authenticated/admin/index.tsx` | admin (`AdminGuard`) | `fetchAlunos`, `fetchHorarios`, `fetchOcupacao` | navegar pelas seções | empty de próximas aulas |
| 13 | Agenda admin | `/admin/agenda` | `_authenticated/admin/agenda.tsx` | admin | `fetchHorarios`, `fetchReservasDetalhadas` | expandir aula e ver alunos reservados | loading, empty, expandido |
| 14 | Alunos | `/admin/alunos` | `_authenticated/admin/alunos.tsx` | admin | `fetchAlunos` (exclui admins), `alunos_sensiveis` | criar, editar, excluir, buscar, revelar CPF/nascimento | busca sem resultado, confirmação, empty |
| 15 | Modalidades (admin) | `/admin/modalidades` | `_authenticated/admin/modalidades.tsx` | admin | `fetchModalidades` | CRUD + galeria | empty |
| 16 | Horários | `/admin/horarios` | `_authenticated/admin/horarios.tsx` | admin | `fetchHorarios(false)`, `fetchModalidades`, `fetchOcupacao` | criar aula, criar em lote por calendário, editar, excluir | modal de conflito de horário, empty |
| 17 | Treinos / WOD (admin) | `/admin/treinos` | `_authenticated/admin/treinos.tsx` | admin | `fetchTreinos`, `fetchModalidades` | CRUD de WOD | empty |
| 18 | Notificações (admin) | `/admin/notificacoes` | `_authenticated/admin/notificacoes.tsx` | admin (**sem `AdminGuard`**) | nenhum | nenhuma | **placeholder: "Envio de comunicados em breve."** |
| 19 | 404 | qualquer rota inexistente | `__root.tsx` (`notFoundComponent`) | público | — | voltar ao início | — |

---

## 8. DASHBOARD DO ALUNO (`/app`)

**Estrutura vertical (`space-y-6`), em coluna única:**

1. **Saudação** — eyebrow com `saudacao()` (04:00–12:00 "Bom dia", 12:01–18:00 "Boa tarde", 18:01–00:00 "Boa noite", 00:01–03:59 "Isso é hora?") e `h1 font-display text-4xl` com `"Aluno " + primeiro nome`. Para admin, o prefixo "Aluno" é omitido e aparece o link "Você é administrador → abrir painel de gestão".
2. **Card "Próxima aula"** — `surface-panel` com header dividido; mostra modalidade em gradiente dourado, data (`formatDateLong`), hora (`formatHora`) e "Prof. {instrutor}". Vazio: mensagem + link "Ver agenda".
3. **Atalhos** — grid de 3 colunas fixas com 4 itens (Agendar aula, WOD do dia, Modalidades, Perfil) → o quarto item quebra para a segunda linha.
4. **Avisos recentes** — três primeiras notificações (`avisos.slice(0, 3)`); vazio → `EmptyState`.

**Queries:** `fetchMinhasReservas(aluno.id)` (habilitada só com ficha de aluno) e `fetchNotificacoes()`. A "próxima aula" é calculada no cliente: filtra `status === "confirmada"` e `data >= hoje`, ordena por `data+horario` e pega o primeiro.

**Navegação:** header do `AppShell` + bottom nav de aluno (Início, Agenda, WOD, Perfil).

**Responsividade:** nenhuma classe responsiva nesta tela; o layout é o mesmo em todas as larguras, limitado a `max-w-3xl`.

---

## 9. DASHBOARD ADMINISTRATIVO (`/admin` e subtelas)

### 9.1 Painel (`/admin`)

- `PageTitle` "Administração / Painel".
- **Métricas (grid 2 colunas):** "Alunos" (`fetchAlunos().length`, já excluindo contas com papel admin) e "Turmas lotadas" (horários futuros onde `ocupação >= limite_vagas`).
- **Gestão (grid 4 colunas):** Agenda, Alunos, Modalidades, Horários, Treinos, Notificações.
- **Próximas aulas:** cinco primeiros horários futuros com contador `usados/limite`, dourado ou vermelho quando lotado.
- Envolto em `AdminGuard`.

### 9.2 Telas de gestão

| Tela | Recursos | Dependência de backend |
| --- | --- | --- |
| Agenda | lista aulas futuras, expande para mostrar os alunos reservados e a ocupação | `horarios`, `reservas` + join `alunos` |
| Alunos | CRUD completo, busca por texto, upload de foto, CPF/nascimento mascarados com revelação sob confirmação, admins ocultos | `alunos`, `alunos_sensiveis`, `user_roles`, Storage `avatars` |
| Modalidades | CRUD com descrição, o que é, como funciona, benefícios, exercícios, vídeo YouTube, galeria | `modalidades` |
| Horários | criar aula, criar em lote por calendário, bloqueio de conflito (mesma data+hora), editar, excluir, ocupação | `horarios`, `modalidades`, `reservas` |
| Treinos | CRUD de WOD por modalidade e data | `treinos`, `modalidades` |
| Notificações | **placeholder, sem funcionalidade implementada** | — |

**Não existem no painel:** filtros avançados, tabelas, exportação, relatórios, gráficos, telas de pagamento ou de configurações.

---

## 10. RESPONSIVIDADE ATUAL

### 10.1 Breakpoints

Breakpoints padrão do Tailwind v4 (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`). O projeto usa apenas **`sm:` e `md:`**, em três lugares:

| Uso | Local |
| --- | --- |
| `sm:grid-cols-2` na lista de modalidades | `modalidades/index.tsx` |
| `sm:gap-2` no rodapé de um diálogo | `agenda.tsx` |
| `md:text-sm` no input | `ui/input.tsx` |

Também há `max-h-[85vh]` no `RecordDialog`, `max-w-[70vw]` no logo do splash, e `env(safe-area-inset-bottom)` na navegação inferior.

### 10.2 Comportamento por dispositivo

| Elemento | Celular | Tablet | Desktop |
| --- | --- | --- | --- |
| Container | `max-w-3xl` ocupando a largura | idêntico | idêntico, centralizado com áreas laterais vazias |
| Navegação | barra inferior fixa de 4 abas | igual | **igual** — a barra inferior permanece fixa também no desktop |
| Header | altura `h-14`, logo + 3 ícones | igual | igual |
| Grid de atalhos (aluno) | 3 colunas | 3 colunas | 3 colunas |
| Grid de gestão (admin) | 4 colunas | 4 colunas | 4 colunas |
| Grid de métricas | 2 colunas | 2 colunas | 2 colunas |
| Modalidades | 1 coluna | 2 colunas (`sm:`) | 2 colunas |
| Cards | largura total | largura total | largura total do container |
| Tipografia | escala única | idêntica | idêntica (exceto input `md:text-sm`) |
| Modais | `DialogContent` padrão do shadcn, `max-h-[85vh]` com rolagem | igual | igual |
| Formulários | coluna única | coluna única | coluna única |
| Tabelas | não existem | — | — |
| Botões | tamanhos fixos (`h-8`/`h-9`/`h-10`) | idênticos | idênticos |

### 10.3 Problemas observados (registrados, não corrigidos)

- O layout de desktop é literalmente o layout mobile centralizado: há muito espaço lateral não aproveitado acima de 768px.
- A navegação inferior fixa continua em telas grandes, onde uma navegação horizontal ou lateral seria mais natural.
- 4 atalhos em grid de 3 colunas no dashboard do aluno deixam um item isolado na segunda linha.
- 6 seções em grid de 4 colunas no painel admin deixam 2 itens isolados na segunda linha; com ícone `size-4`, label de 10px e `px-1`, os rótulos ficam bastante apertados no mobile.
- Textos de 10–11px em vários rótulos ficam abaixo do confortável para leitura em telas pequenas.
- A imagem de modalidade tem altura fixa `h-32` em qualquer largura, o que distorce a proporção em telas largas.
- Nenhum ajuste de padding entre breakpoints: `px-4` é usado tanto em 360px quanto em 1440px.

---

## 11. ANIMAÇÕES ATUAIS

Biblioteca disponível: `tw-animate-css` (importada em `styles.css`) e as animações internas do Radix (usadas pelos componentes shadcn).

| Efeito | Elemento | Arquivo | Duração / easing | Comportamento |
| --- | --- | --- | --- | --- |
| `transition-colors` | botões, links do header, abas, cards com hover, chips do WOD | `ui/button.tsx`, `AppShell.tsx`, `app.tsx`, `admin/index.tsx`, `modalidades/index.tsx`, `wod.tsx` | padrão do Tailwind (150ms, `ease`) | idêntico em mobile e desktop; no toque não há hover perceptível |
| `animate-pulse` | logo da tela de splash | `src/routes/index.tsx` | keyframe padrão do Tailwind | igual em todos os dispositivos |
| `animate-spin` | `Loader2` no botão de login | `auth.tsx` | padrão | igual |
| Fade + zoom + slide de modal | `DialogContent`, `AlertDialogContent`, overlay | `ui/dialog.tsx`, `ui/alert-dialog.tsx` | classes `data-[state=open]:animate-in fade-in-0 zoom-in-95 slide-in-from-*`, ~150–200ms | padrão Radix/shadcn |
| Toasts | `sonner` `<Toaster position="top-center" theme="dark" richColors />` | `__root.tsx` | animação interna do sonner | igual |
| `backdrop-blur-md` | header e navegação inferior | `AppShell.tsx` | estático (não é animação) | igual |
| Hover de borda dourada | cards de atalho e modalidade | várias | `transition-colors` | só desktop, na prática |

**Não implementado atualmente:** scale/transform em hover, glow, parallax, animações de scroll, transições entre páginas, skeleton loading, animações de background, splash screen animada (além do `animate-pulse`), microinterações em botões (press/ripple), animações de entrada de listas.

---

## 12. IMAGENS E ASSETS

| Asset | Caminho | Formato | Dimensões | Onde aparece |
| --- | --- | --- | --- | --- |
| Logo Wine Barbell Club | `src/assets/wine-barbell-logo.png.asset.json` (referência externa, importada como `logo.url`) | PNG | usada com `width={512} height={768}` | splash (`/`), tela de login, header do `AppShell` (`h-9`) |
| Ícone PWA 192 | `public/icons/icon-192.png` | PNG | 192×192 | manifest (`any`), `apple-touch-icon` |
| Ícone PWA 512 | `public/icons/icon-512.png` | PNG | 512×512 | manifest (`any` e `maskable`) |
| Favicon | `public/favicon.png` | PNG | — | `<link rel="icon">` |
| Imagem OG/Twitter | URL externa em `__root.tsx` (`storage.googleapis.com/...`) | — | — | metadados de compartilhamento (definida no `__root`) |
| Galeria de modalidades | URLs armazenadas em `modalidades.galeria_imagens[]` | conforme upload | variável | card e detalhe de modalidade |
| Fotos de aluno/perfil | bucket privado `avatars` (URL assinada, 1h) | conforme upload | variável | perfil, admin/alunos, `RecordDialog` |
| Vídeos | iframes do YouTube (`youtubeEmbed`) | — | `aspect-video` | WOD e detalhe de modalidade |

**Não existem** no projeto: SVGs de ilustração (apenas o SVG inline do Google), GIFs, WebP, backgrounds decorativos, banners ou biblioteca de ícones em arquivo — todos os ícones vêm de **lucide-react**.

Ícones lucide efetivamente usados: `Bell`, `CalendarClock`, `CalendarDays`, `CalendarPlus`, `Camera`, `ChevronDown`, `ChevronRight`, `Clock`, `Dumbbell`, `Home`, `KeyRound`, `LayoutDashboard`, `LayoutGrid`, `Loader2`, `LogOut`, `Moon`, `Sun`, `User`, `User2`, `Users`.

---

## 13. PWA

**Manifest:** `public/manifest.webmanifest`, ligado em `__root.tsx`.

```json
name: "Wine Barbell Club"
short_name: "Wine Barbell Club"
description: "Gestão de treinos, aulas e check-in do Wine Barbell Club."
start_url: "/"
scope: "/"
display: "standalone"
orientation: "portrait"
background_color: "#0A0A0A"
theme_color: "#0A0A0A"
lang: "pt-BR"
icons: 192 (any), 512 (any), 512 (maskable)
```

**Meta tags de PWA/iOS em `__root.tsx`:** `theme-color #0A0A0A`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title="Wine Barbell Club"`, `viewport` com `viewport-fit=cover`, `apple-touch-icon`.

**Estado real:**
- **Service worker: não existe** nenhum arquivo de service worker nem registro no código. Portanto **não há cache offline** — o app é instalável, mas requer conexão.
- Instalação em Android/Windows funciona pelo manifest; no iOS via "Adicionar à Tela de Início".
- Comportamento standalone: sem barra do navegador, orientação retrato.
- A descrição do manifest ainda menciona "check-in", funcionalidade já removida do app.

---

## 14. ESTRUTURA DO PROJETO

```
/
├── public/
│   ├── icons/icon-192.png, icon-512.png   ícones PWA
│   ├── favicon.png
│   ├── manifest.webmanifest
│   └── robots.txt
├── src/
│   ├── assets/            referência do logo
│   ├── components/
│   │   ├── AppShell.tsx   layout logado + PageTitle + EmptyState
│   │   ├── AdminGuard.tsx guarda de papel admin
│   │   ├── RecordDialog.tsx  formulário CRUD genérico
│   │   └── ui/            45 componentes shadcn
│   ├── hooks/use-mobile.tsx
│   ├── integrations/
│   │   ├── lovable/       auth social (OAuth Google)
│   │   └── supabase/      client, client.server, auth-middleware, auth-attacher, types (autogerados)
│   ├── lib/
│   │   ├── auth.tsx       contexto de sessão/papel
│   │   ├── theme.tsx      dark/light
│   │   ├── queries.ts     acesso a dados e query keys
│   │   ├── format.ts      máscaras, datas, saudação, YouTube
│   │   ├── calendar.ts    URL do Google Agenda
│   │   ├── utils.ts       cn()
│   │   └── error-*.ts     captura/relato de erros
│   ├── routes/
│   │   ├── __root.tsx     shell HTML, head, providers, 404, error boundary
│   │   ├── index.tsx      splash/redirect
│   │   ├── auth.tsx       login/cadastro/recuperação
│   │   ├── reset-password.tsx
│   │   └── _authenticated/
│   │       ├── route.tsx  guarda de sessão + AppShell
│   │       ├── app.tsx, agenda.tsx, wod.tsx, perfil.tsx, notificacoes.tsx
│   │       ├── modalidades/index.tsx, $id.tsx
│   │       └── admin/index, agenda, alunos, modalidades, horarios, treinos, notificacoes
│   ├── routeTree.gen.ts   GERADO — nunca editar
│   ├── router.tsx, server.ts, start.ts
│   └── styles.css         design system (tokens + utilitários)
├── DOCUMENTACAO.md        documentação funcional anterior
├── vite.config.ts, tsconfig.json, components.json, eslint.config.js
```

| Pasta | Finalidade |
| --- | --- |
| `src/routes` | rotas por arquivo (TanStack Router); define URL, metadados e componente |
| `src/components` | componentes próprios + biblioteca shadcn em `ui/` |
| `src/lib` | contextos, acesso a dados, formatação e utilitários |
| `src/integrations` | clientes gerados do backend e do provedor OAuth |
| `src/assets` | referências de imagem importadas pelo código |
| `public` | arquivos servidos como estão (PWA, ícones, robots) |

---

## 15. STACK TECNOLÓGICA (versões reais do `package.json`)

| Categoria | Tecnologia | Versão |
| --- | --- | --- |
| Framework | TanStack Start | ^1.168.32 |
| Roteamento | @tanstack/react-router | ^1.170.18 |
| UI runtime | React / React DOM | ^19.2.0 |
| Linguagem | TypeScript | ^5.8.3 |
| Build | Vite | ^8.1.5 |
| Estilo | Tailwind CSS + @tailwindcss/vite | ^4.2.1 |
| Componentes | Radix UI (25+ pacotes) + shadcn/ui | ver `package.json` |
| Variantes | class-variance-authority / clsx / tailwind-merge | 0.7.1 / 2.1.1 / 3.5.0 |
| Ícones | lucide-react | ^0.575.0 |
| Animação | tw-animate-css | ^1.3.4 |
| Estado de servidor | @tanstack/react-query | ^5.101.1 |
| Backend | @supabase/supabase-js | ^2.111.0 |
| Auth social | @lovable.dev/cloud-auth-js | ^1.1.2 |
| Toasts | sonner | ^2.0.7 |
| Datas | date-fns | ^4.1.0 |
| Formulários | react-hook-form + @hookform/resolvers | ^7.71.2 / ^5.2.2 |
| Validação | zod | ^3.24.2 |
| Gráficos | recharts | ^2.15.4 |
| Calendário | react-day-picker | ^9.14.0 |
| Outros instalados | embla-carousel-react, cmdk, vaul, input-otp, react-resizable-panels | — |
| Qualidade | ESLint 9, Prettier 3, typescript-eslint | — |

**Dependências instaladas mas sem uso no código de aplicação:** `recharts`, `react-hook-form`, `@hookform/resolvers`, `zod`, `embla-carousel-react`, `cmdk`, `vaul`, `input-otp`, `react-resizable-panels`, e `date-fns` (as datas são formatadas manualmente em `format.ts`).

---

## 16. ESTRUTURA ATUAL DO BANCO

Schemas: `public` (dados do app) e `private` (funções de verificação de papel). Todas as tabelas têm RLS habilitada.

### 16.1 `profiles`
Perfil básico de qualquer usuário autenticado.
`id (uuid, PK → auth.users.id)`, `nome (text, default '')`, `telefone`, `foto_url`, `created_at`, `updated_at`.
**Policies:** insert próprio ou admin; select próprio ou admin; update próprio ou admin; **DELETE negado**.
**Trigger:** `trg_profiles_updated` → `set_updated_at()`.

### 16.2 `user_roles`
Papéis, separados da tabela de usuários por segurança.
`id`, `user_id (→ auth.users.id)`, `role (app_role)`, `created_at`. Unicidade por (user_id, role).
**Policies:** select próprio ou admin; **INSERT, UPDATE e DELETE negados via API** (gravação só por trigger/função no servidor).

### 16.3 `alunos`
Ficha do aluno.
`id`, `user_id (→ auth.users.id)`, `nome`, `telefone`, `email`, `endereco`, `contato_emergencia`, `observacoes`, `foto_url`, `ativo (bool, default true)`, `cpf_mascarado`, `nascimento_mascarado`, `plano_id (uuid, sem tabela de planos)`, `whatsapp_optin (bool)`, `google_calendar_id`, `metadata (jsonb)`, `created_at`, `updated_at`.
**Policies:** select próprio ou admin; insert admin ou self; update próprio ou admin; delete apenas admin.
**Triggers:** `trg_block_admin_aluno` → `block_admin_aluno()` (impede que uma conta admin vire aluno); `trg_alunos_updated` → `set_updated_at()`.

### 16.4 `alunos_sensiveis`
Dados sensíveis isolados.
`aluno_id (PK → alunos.id)`, `cpf`, `data_nascimento`, `updated_at`.
**Policies:** `ALL` para admin; select/insert/update apenas do próprio aluno.
**Triggers:** `trg_sync_mascarados` → `sync_mascarados()` (preenche `cpf_mascarado`/`nascimento_mascarado` em `alunos`); `trg_sensiveis_updated`.

### 16.5 `modalidades`
`id`, `nome`, `descricao`, `o_que_e`, `como_funciona`, `beneficios`, `exercicios`, `video_youtube_url`, `galeria_imagens (text[])`, `cor`, `ativo`, timestamps.
**Policies:** select para autenticados; escrita apenas admin. **Trigger:** `trg_modalidades_updated`.
Observação: a coluna `cor` existe no banco mas **não é usada em nenhuma tela**.

### 16.6 `horarios`
`id`, `modalidade_id (→ modalidades.id)`, `instrutor (text livre)`, `data (date)`, `horario (time)`, `limite_vagas (int, default 10)`, `observacoes`, `cancelada (bool)`, timestamps.
**Policies:** select para autenticados; escrita apenas admin. **Trigger:** `trg_horarios_updated`.

### 16.7 `reservas`
`id`, `aluno_id (→ alunos.id)`, `horario_id (→ horarios.id)`, `status (enum reserva_status: confirmada | cancelada)`, timestamps.
**Policies:** select/insert/update/delete para o próprio aluno ou admin.
**Triggers:** `trg_check_vagas` → `check_vagas()` (impede reserva acima do limite de vagas); `trg_reservas_updated`.

### 16.8 `treinos` (WOD)
`id`, `modalidade_id`, `nome`, `data (default CURRENT_DATE)`, `objetivo`, `exercicios`, `series`, `repeticoes`, `tempo`, `observacoes`, `video_youtube_url`, timestamps.
**Policies:** select para autenticados; escrita apenas admin. **Trigger:** `trg_treinos_updated`.

### 16.9 `notificacoes`
`id`, `titulo`, `mensagem`, `tipo (default 'comunicado')`, `data_envio`, `enviado_por (→ auth.users.id)`.
**Policies:** select para autenticados; escrita apenas admin.

### 16.10 `notificacoes_leitura`
`id`, `notificacao_id`, `user_id`, `lida_em`.
**Policy:** `ALL` restrito ao próprio usuário. **Nenhuma tela do app lê ou grava nesta tabela atualmente.**

### 16.11 Tipos enumerados
- `app_role`: `admin`, `aluno`
- `reserva_status`: `confirmada`, `cancelada`

### 16.12 Funções

| Função | Schema | Tipo | Finalidade |
| --- | --- | --- | --- |
| `is_admin()` | `private` | SECURITY DEFINER | verifica se o usuário atual é admin; usada em quase todas as policies |
| `has_role(_user_id, _role)` | `private` | SECURITY DEFINER | verificação genérica de papel |
| `handle_new_user()` | `public` | trigger, SECURITY DEFINER | cria `profiles` e atribui papel no cadastro; admins não geram ficha de aluno |
| `block_admin_aluno()` | `public` | trigger, SECURITY DEFINER | bloqueia inserção de conta admin em `alunos` |
| `check_vagas()` | `public` | trigger, SECURITY DEFINER | valida limite de vagas na reserva |
| `sync_mascarados()` | `public` | trigger, SECURITY DEFINER | sincroniza os campos mascarados |
| `set_updated_at()` | `public` | trigger | atualiza `updated_at` |

### 16.13 Storage

| Bucket | Público | Limite | Conteúdo |
| --- | --- | --- | --- |
| `avatars` | **não** (privado) | sem limite no bucket; limite de 5 MB validado no app | fotos de perfil (`{user_id}/avatar-*.ext`) e fotos cadastradas pelo admin (`alunos/*.ext`); leitura via URL assinada de 1 hora |

Não há Edge Functions, RPCs chamadas pelo app, nem canais Realtime em uso.

---

## 17. AUTENTICAÇÃO E PERFIS

**Provedores:** e-mail + senha (Supabase Auth) e Google OAuth (via `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`).

**Cadastro:** `supabase.auth.signUp` com `data: { nome }` e `emailRedirectTo: window.location.origin`. Se não houver sessão imediata, a tela mostra o bloco "verifique sua caixa de entrada". O trigger `handle_new_user()` cria o `profiles`, atribui o papel (`aluno` por padrão; `admin` para o e-mail administrativo) e cria a ficha em `alunos` apenas para alunos.

**Login:** `signInWithPassword`; sucesso → `navigate("/app")`. Mensagens de erro traduzidas para "E-mail ou senha incorretos." e "Este e-mail já está cadastrado.".

**Recuperação:** `resetPasswordForEmail` com `redirectTo: origin + "/reset-password"`; a tela `/reset-password` define a nova senha.

**Logout:** `signOut()` no header (`AppShell`) e no perfil, seguido de redirecionamento para `/auth`.

**Sessão:** `AuthProvider` (`src/lib/auth.tsx`) mantém `session`, `user`, `perfil`, `aluno`, `isAdmin` e `loading`; escuta `onAuthStateChange` e recarrega perfil, papéis e ficha de aluno em paralelo. `AuthSync` no root invalida o router em SIGNED_IN / SIGNED_OUT / USER_UPDATED.

**Proteção de rotas (duas camadas):**
1. `src/routes/_authenticated/route.tsx` — `ssr: false` e `beforeLoad` com `supabase.auth.getUser()`; sem sessão → `redirect({ to: "/auth" })`.
2. `AdminGuard` — verifica `isAdmin` no cliente; enquanto carrega mostra "Verificando permissões…"; sem permissão mostra aviso com link para `/app`.
3. Camada final e efetiva: **RLS no banco**, com `private.is_admin()`.

**Redirecionamentos:** `/` → `/app` (logado) ou `/auth`; `/auth` → `/app` quando já há sessão; `AppShell` empurra qualquer admin fora de `/admin*` de volta para `/admin`.

**Ponto registrado:** a rota `/admin/notificacoes` **não está envolvida por `AdminGuard`** (é um placeholder sem dados, mas está fora do padrão das demais telas admin).

---

## 18. FLUXOS DO USUÁRIO

```
Abertura do app
   ↓
/ (splash com logo)
   ↓
Sessão existe?
   ├── Não → /auth
   └── Sim → /app
                ↓
        AppShell verifica papel
           ├── aluno → dashboard do aluno
           └── admin → redirecionado para /admin
```

```
Login
   ↓
E-mail+senha  ou  Google OAuth
   ↓
Supabase Auth cria sessão
   ↓
handle_new_user() (só no 1º acesso): profiles + user_roles + alunos
   ↓
AuthProvider carrega perfil, papéis e ficha
   ↓
/app
```

```
Reserva de aula (aluno)
   ↓
/agenda → lista de horários futuros com vagas
   ↓
Clique em "Reservar"
   ↓
AlertDialog "Confirmar reserva?"
   ↓
insert/update em reservas → trigger check_vagas valida limite
   ↓
Toast de sucesso
   ↓
Modal "Adicionar ao Google Agenda?" (opcional, abre link externo)
```

```
Cancelamento
   ↓
Clique em "Cancelar" → AlertDialog → update status = 'cancelada' → toast
```

```
Criação de aula (admin)
   ↓
/admin/horarios → "Nova aula"
   ↓
Modalidade + instrutor + limite + seleção de um ou vários dias no calendário
   ↓
Verificação de conflito (mesma data + horário)
   ├── Conflito → modal informando a modalidade já agendada; pede outra data/horário
   └── Sem conflito → insert em horarios → toast
```

```
Edição de perfil (aluno)
   ↓
/perfil → upload de foto (bucket avatars) → profiles.foto_url + alunos.foto_url
        → dados de contato → update em profiles e alunos
        → CPF / nascimento → upsert em alunos_sensiveis → trigger gera versões mascaradas
        → nova senha → supabase.auth.updateUser
```

---

## 19. REGRAS DE NEGÓCIO IMPLEMENTADAS

### Aluno
- Todo novo cadastro recebe o papel `aluno` automaticamente.
- O aluno só enxerga a própria ficha, as próprias reservas e os próprios dados sensíveis (RLS).
- CPF e data de nascimento são exibidos mascarados (`***.000.000-**` e `00/00/*****`).
- A reserva exige ficha de aluno vinculada (`alunos.user_id = auth.uid()`); sem ficha, a ação falha com "Ficha de aluno não encontrada.".
- Reserva e cancelamento exigem confirmação em modal.
- Se já existir reserva cancelada para a aula, reservar novamente faz `update` para `confirmada` em vez de criar outra.
- Adicionar ao Google Agenda é opcional e abre link externo (não grava nada).
- Saudação por faixa horária: 04:00–12:00 "Bom dia"; 12:01–18:00 "Boa tarde"; 18:01–00:00 "Boa noite"; 00:01–03:59 "Isso é hora?".
- O prefixo "Aluno" só aparece para quem não é admin.

### Administrador
- A conta administrativa nunca é contada nem listada como aluno (`fetchAlunos` filtra por `user_roles` e o trigger `block_admin_aluno` impede a inserção no banco).
- Admin autenticado é redirecionado para `/admin` ao tentar acessar telas de aluno.
- CRUD completo de alunos, modalidades, horários e treinos.
- Revelação de CPF/nascimento reais exige confirmação explícita em diálogo.
- Criação de aulas em lote por seleção de múltiplas datas no calendário.
- **Conflito de horário:** não é permitido criar duas aulas na mesma data e horário; o sistema barra e informa a modalidade conflitante.

### Turmas e vagas
- Cada horário tem `limite_vagas` (padrão 10).
- O trigger `check_vagas()` impede reservas acima do limite (validação no banco, não apenas na UI).
- Turma cheia exibe "Sem vagas" com o botão desabilitado.
- "Turmas lotadas" no painel = horários futuros com ocupação ≥ limite.
- A agenda do aluno lista apenas horários com `data >= hoje`.

### Conteúdo
- WOD lista apenas treinos com `data <= hoje`, limitado a 20 itens, com filtro por modalidade.
- Vídeos aceitam URLs de `youtube.com/watch`, `youtu.be`, `/embed/` e `/shorts/`.
- Modalidades inativas continuam sendo retornadas pela query atual (`fetchModalidades` não filtra `ativo`).

### Acesso
- Toda a área logada exige sessão; a área admin exige o papel `admin` verificado no banco.
- Upload de imagem limitado a 5 MB, validado no cliente.

### Pagamentos
- **Nenhuma regra de pagamento implementada.** Não há integração de cobrança, tela de planos ou tabela de planos (apenas a coluna órfã `alunos.plano_id`).

---

## 20. INTEGRAÇÃO COM O BACKEND

| Recurso | Estado |
| --- | --- |
| Autenticação | e-mail/senha + Google OAuth; sessão no cliente |
| Cliente | `src/integrations/supabase/client.ts` (gerado, não editar) |
| Tipos | `src/integrations/supabase/types.ts` (gerado) |
| Middleware de auth | `auth-middleware.ts` / `auth-attacher.ts` (gerados) |
| Tabelas | 9 tabelas em `public`, todas com RLS |
| Storage | bucket privado `avatars` com URLs assinadas |
| RPC | nenhuma chamada de RPC a partir do app |
| Edge Functions | nenhuma |
| Server Functions | nenhuma (`createServerFn` não é usado; todo acesso a dados é feito no cliente com RLS) |
| Realtime | não utilizado |
| Segurança | funções de papel em schema `private`, `SECURITY DEFINER` com privilégios restritos |

---

## 21. DESIGN SYSTEM ATUAL CONSOLIDADO

| Categoria | Estado atual |
| --- | --- |
| **Cores** | 30+ tokens OKLCH em `:root` e `.light`; base preto `#0A0A0A`, dourado `#B49B63`, superfícies `#1B1B1B` / `#2D2D2D` |
| **Fontes** | Bebas Neue (display), Oswald (headings/eyebrow), Inter (corpo) |
| **Escala tipográfica** | `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-3xl`, `text-4xl` — sem escala formalizada |
| **Espaçamento** | escala padrão do Tailwind; padrões recorrentes: seções `space-y-6`, listas `space-y-2/3/4`, cards `px-4 py-3` e `px-5 py-4`, container `px-4` |
| **Border radius** | `--radius: 0.75rem`, com `sm` 0.25rem, `md` 0.5rem, `lg` 0.75rem, `xl` 1rem, `2xl` 1.25rem, `3xl` 1.5rem. Na prática: cards `rounded-lg`, botões/inputs `rounded-md`, chips `rounded-full`, ícones do header `rounded-lg` |
| **Sombras** | `--shadow-elevated` (usada) e `--shadow-gold` (não usada); shadcn adiciona `shadow`/`shadow-sm` em botões |
| **Botões** | 6 variantes × 4 tamanhos (shadcn/cva) + botões crus fora do sistema |
| **Cards** | um único utilitário base (`surface-panel`) e ~15 composições ad hoc; `ui/card.tsx` não é usado |
| **Inputs** | `h-9`, `rounded-md`, `border-input`, fundo transparente, ring dourado no foco |
| **Badges** | `ui/badge.tsx` existe mas não é usado; os badges reais são `<span>` inline |
| **Ícones** | lucide-react, tamanhos `size-4` e `size-5` |
| **Containers** | `mx-auto w-full max-w-3xl px-4`; conteúdo com `pt-5 pb-28` |
| **Grids** | `grid-cols-2` (métricas), `grid-cols-3` (atalhos aluno, séries/reps/tempo), `grid-cols-4` (gestão admin), `sm:grid-cols-2` (modalidades) |
| **Breakpoints** | Tailwind padrão; apenas `sm:` e `md:` em uso |
| **Utilitários próprios** | `font-display`, `text-gold-gradient`, `surface-panel`, `eyebrow`, `no-scrollbar` |

---

## 22. INCONSISTÊNCIAS ENCONTRADAS

Registradas sem correção.

**Cor**
1. `#000000` inline em `/` e `/auth` versus `--background` `#0A0A0A` nas demais telas — o fundo muda ao passar do login para o app.
2. Estilo inline `style={{ backgroundColor: "#000000" }}` contorna o sistema de tokens.
3. Tokens declarados e nunca usados: `--success`, `--shadow-gold`, `--chart-1..5`, os sete tokens de sidebar.
4. Hover de ícone do header usa `hover:text-primary`, enquanto os botões usam `hover:text-accent-foreground` — dois caminhos para o mesmo dourado.

**Tipografia**
5. Três famílias em uso simultâneo, com Bebas Neue e Oswald ocupando papéis próximos.
6. `h1` do dashboard do aluno é `text-4xl`, mas o `h1` do `PageTitle` é `text-3xl`.
7. Tamanhos arbitrários (`text-[10px]`, `text-[11px]`) misturados com a escala padrão.
8. Em `admin/notificacoes.tsx` o título é escrito à mão em vez de usar `PageTitle`.

**Cards e componentes**
9. `ui/card.tsx` existe mas nenhuma tela o usa; tudo é `surface-panel`.
10. Atalho do aluno e atalho do admin são o mesmo card com medidas divergentes (`px-2 py-4`/`size-5`/`text-[11px]` vs `px-1 py-3`/`size-4`/`text-[10px]`).
11. Card de aviso e card de notificação são duplicatas em arquivos diferentes.
12. Paddings de card inconsistentes: `px-3 py-4`, `px-4 py-3`, `px-4 py-4`, `px-5 py-3`, `px-5 py-4`, `px-5 py-6`, `px-5 py-10`.
13. Bloco do login usa `rounded-xl border bg-surface` em vez de `surface-panel` (`rounded-lg` + gradiente).
14. Cards com hover dourado em algumas listas e sem hover em outras (métricas, avisos, aulas).
15. Badges e chips implementados como `<span>`/`<button>` crus em vez do componente `Badge`.
16. `<select>` HTML nativo em `RecordDialog` contrasta visualmente com os inputs do shadcn.

**Estados**
17. Loading é sempre um texto ("Carregando…") dentro de `EmptyState`; nenhum skeleton, apesar de `ui/skeleton.tsx` existir.
18. Nenhuma tela tem estado de erro dedicado — os erros aparecem apenas como toast, ou no boundary global.
19. `EmptyState` acumula três papéis (vazio, carregando, sem permissão) com a mesma aparência.
20. Cards de métrica não têm estado de carregamento — exibem `0` antes de os dados chegarem.

**Responsividade e layout**
21. Layout de desktop idêntico ao mobile, com grandes áreas laterais vazias.
22. Navegação inferior fixa também no desktop.
23. Grids de 3 e 4 colunas com 4 e 6 itens deixam linhas incompletas.
24. Nenhum ajuste responsivo de tipografia ou espaçamento.

**Contraste e acessibilidade**
25. `text-muted-foreground` (~`#9A9A9A`) em textos de 10px sobre superfície escura fica próximo do limite de contraste.
26. Alguns alvos de toque ficam abaixo de 44px (chips `py-1.5`, botões `h-8`, links de texto do login).
27. Iframes e imagens têm `alt`/`title`, mas nenhum card interativo declara `aria-*` além dos ícones do header.

**Hierarquia**
28. Números de métrica e nomes de modalidade usam o mesmo gradiente dourado, achatando a hierarquia.
29. O eyebrow é usado tanto como rótulo de seção quanto como rótulo de campo dentro dos cards de WOD.

---

## 23. PONTOS TÉCNICOS PARA REVISÃO FUTURA

1. **Componentes duplicados:** cards de atalho, cards de aviso/notificação e as cinco listas do admin repetem estrutura sem abstração comum.
2. **Arquivo grande:** `admin/horarios.tsx` (442 linhas) concentra listagem, criação em lote, verificação de conflito e diálogos; `perfil.tsx` (381) e `agenda.tsx` (313) também acumulam responsabilidades.
3. **Queries repetidas:** `fetchMinhasReservas` é chamada em três telas com chaves ligeiramente distintas; `fetchOcupacao` usa a chave solta `["ocupacao"]`, fora do objeto `qk`.
4. **Ocupação calculada no cliente:** `fetchOcupacao` baixa todas as reservas confirmadas e agrupa em memória — não escala com o volume.
5. **`any` disseminado:** reservas, notificações e alunos são tratados como `any` em várias telas, apesar dos tipos gerados em `types.ts`.
6. **Dependências instaladas sem uso:** recharts, react-hook-form, zod, date-fns, embla, cmdk, vaul, input-otp, resizable-panels — peso de bundle sem contrapartida.
7. **45 componentes shadcn** presentes, com 7 efetivamente usados.
8. **Formulários manuais:** `useState` campo a campo, sem validação declarativa, apesar de `zod` + `react-hook-form` estarem instalados.
9. **PWA incompleta:** manifest sem service worker → nenhum cache offline, apesar de o app se apresentar como PWA.
10. **Placeholder em produção:** `/admin/notificacoes` está publicada sem funcionalidade e sem `AdminGuard`.
11. **Colunas e tabelas órfãs:** `alunos.plano_id`, `alunos.whatsapp_optin`, `alunos.google_calendar_id`, `alunos.metadata`, `modalidades.cor`, `horarios.observacoes`, `notificacoes.tipo`, e a tabela `notificacoes_leitura` inteira não têm uso na interface.
12. **Descrição desatualizada** no manifest ("check-in"), funcionalidade já removida.
13. **Acessibilidade:** falta de `aria-live` nos estados de carregamento, alvos de toque pequenos, contraste limítrofe em micro-textos.
14. **Sem testes automatizados** de qualquer tipo.
15. **Sem tratamento de erro por tela:** falhas de query silenciam (dados vazios) em vez de mostrar estado de erro.

---

## 24. ARQUIVOS QUE NÃO DEVEM SER ALTERADOS SEM ANÁLISE

| Arquivo | Por quê |
| --- | --- |
| `src/integrations/supabase/client.ts` | cliente gerado automaticamente; edição quebra a conexão com o backend |
| `src/integrations/supabase/client.server.ts` | cliente privilegiado gerado; risco de segurança |
| `src/integrations/supabase/types.ts` | tipos gerados a partir do schema |
| `src/integrations/supabase/auth-middleware.ts` / `auth-attacher.ts` | anexam o token de sessão às chamadas |
| `.env` | chaves públicas do backend, gerenciadas pela plataforma |
| `src/routeTree.gen.ts` | gerado pelo plugin do router; edição manual quebra o build |
| `src/routes/__root.tsx` | shell HTML, providers, head/SEO, PWA e boundary de erro — afeta o app inteiro |
| `src/routes/_authenticated/route.tsx` | guarda de sessão de toda a área logada |
| `src/lib/auth.tsx` | contexto de sessão, perfil e papel; base de todas as permissões do cliente |
| `src/components/AdminGuard.tsx` | proteção da área administrativa |
| `src/lib/queries.ts` | acesso a dados e filtro que exclui admins da lista de alunos |
| `src/lib/format.ts` | máscaras de CPF/nascimento e regras de saudação |
| `src/styles.css` | design system inteiro; qualquer mudança propaga para todas as telas |
| `public/manifest.webmanifest` + `public/icons/*` | identidade e instalação do PWA |
| Banco: funções `private.is_admin`, `handle_new_user`, `block_admin_aluno`, `check_vagas`, `sync_mascarados` e todas as policies | sustentam papéis, limite de vagas e proteção de dados sensíveis |
| `vite.config.ts`, `src/server.ts`, `src/start.ts`, `src/router.tsx` | bootstrap do framework |

---

## 25. MATRIZ TELA × COMPONENTE

| Tela | AppShell | PageTitle | EmptyState | AdminGuard | Button | Input/Label | Dialog | AlertDialog | RecordDialog | Toast | Ícones | Imagem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` splash | Não | Não | Não | Não | Não | Não | Não | Não | Não | Não | Não | Sim |
| `/auth` | Não | Não | Não | Não | Sim | Sim | Não | Não | Não | Sim | Sim | Sim |
| `/reset-password` | Não | Não | Não | Não | Sim | Sim | Não | Não | Não | Sim | Não | Não |
| `/app` | Sim | Não | Sim | Não | Não | Não | Não | Não | Não | Não | Sim | Não |
| `/agenda` | Sim | Sim | Sim | Não | Sim | Não | Sim | Sim | Não | Sim | Sim | Não |
| `/wod` | Sim | Sim | Sim | Não | Não | Não | Não | Não | Não | Não | Não | Sim (iframe) |
| `/modalidades` | Sim | Sim | Sim | Não | Não | Não | Não | Não | Não | Não | Sim | Sim |
| `/modalidades/$id` | Sim | Sim | Sim | Não | Não | Não | Não | Não | Não | Não | Sim | Sim |
| `/perfil` | Sim | Sim | Sim | Não | Sim | Sim | Não | Não | Não | Sim | Sim | Sim |
| `/notificacoes` | Sim | Sim | Sim | Não | Não | Não | Não | Não | Não | Não | Não | Não |
| `/admin` | Sim | Sim | Sim | Sim | Não | Não | Não | Não | Não | Não | Sim | Não |
| `/admin/agenda` | Sim | Sim | Sim | Sim | Sim | Não | Não | Não | Não | Não | Sim | Não |
| `/admin/alunos` | Sim | Sim | Sim | Sim | Sim | Sim | Não | Sim | Sim | Sim | Sim | Sim |
| `/admin/modalidades` | Sim | Sim | Sim | Sim | Sim | Não | Não | Sim | Sim | Sim | Sim | Sim |
| `/admin/horarios` | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Não |
| `/admin/treinos` | Sim | Sim | Sim | Sim | Sim | Não | Não | Sim | Sim | Sim | Sim | Não |
| `/admin/notificacoes` | Sim | Não | Não | **Não** | Não | Não | Não | Não | Não | Não | Não | Não |

---

## 26. MATRIZ DESKTOP × TABLET × MOBILE

| Elemento | Desktop (≥1024px) | Tablet (768–1023px) | Mobile (<768px) |
| --- | --- | --- | --- |
| Navegação | barra inferior fixa (igual ao mobile) | barra inferior fixa | barra inferior fixa com `safe-area-inset` |
| Header | `h-14`, logo + 3 ícones, centralizado em `max-w-3xl` | idêntico | idêntico |
| Container | `max-w-3xl` centralizado, laterais vazias | `max-w-3xl` quase pleno | largura total com `px-4` |
| Grid — atalhos aluno | 3 colunas | 3 colunas | 3 colunas |
| Grid — gestão admin | 4 colunas | 4 colunas | 4 colunas (rótulos apertados) |
| Grid — métricas | 2 colunas | 2 colunas | 2 colunas |
| Grid — modalidades | 2 colunas | 2 colunas (`sm:`) | 1 coluna |
| Cards | largura do container | largura do container | largura total |
| Tipografia | escala única | escala única | escala única (input `text-base`) |
| Modais | shadcn padrão centralizado, `max-h-[85vh]` | idêntico | idêntico (sem drawer/bottom sheet) |
| Formulários | coluna única | coluna única | coluna única |
| Tabelas | inexistentes | inexistentes | inexistentes |
| Botões | mesmas alturas | mesmas alturas | mesmas alturas |
| Hover | ativo | parcial | inexistente na prática |

---

## 27. RESUMO DO ESTADO ATUAL

O **Wine Barbell Club** é um PWA mobile-first construído em TanStack Start + React 19 + Tailwind v4, com backend Postgres (Auth, Storage e RLS). A aplicação está organizada em duas experiências: **aluno** (dashboard, agenda com reserva, WOD, modalidades, perfil e notificações) e **administrador** (painel com métricas, agenda com alunos reservados, e CRUD de alunos, modalidades, horários e treinos). Os papéis são separados no banco por uma tabela dedicada e por funções `SECURITY DEFINER` em schema privado; o front reforça isso com guarda de sessão na rota `_authenticated` e o `AdminGuard`.

**Identidade visual:** preto profundo com dourado metálico, aplicada por tokens OKLCH em `src/styles.css` e um gradiente dourado usado em títulos e números. Não há `tailwind.config.js`; o tema vive integralmente no CSS. Existe alternância dark/light persistida em `localStorage`.

**Tipografia:** três famílias simultâneas — Bebas Neue (display), Oswald (headings/eyebrow) e Inter (corpo) — sem escala formalizada e praticamente sem variação entre breakpoints.

**Cards:** todos derivam de um único utilitário CSS `surface-panel` (gradiente + borda + raio 0.75rem + sombra elevada), com padding e conteúdo definidos caso a caso; o componente `Card` do shadcn não é utilizado. Existem cerca de quinze composições, várias delas visualmente duplicadas.

**Botões:** shadcn/cva com 6 variantes e 4 tamanhos, complementados por botões crus no header, na navegação inferior e nos chips do WOD.

**Arquitetura visual:** container único `max-w-3xl`, layout em coluna com seções `space-y-6`, navegação inferior fixa em todas as larguras. O desktop é o layout mobile centralizado.

**Arquitetura técnica:** roteamento por arquivo, TanStack Query para dados, acesso direto ao backend a partir do cliente (sem server functions nem edge functions), segurança garantida por RLS.

**Banco:** nove tabelas com RLS completa, sete funções e dez triggers; regras de negócio críticas (limite de vagas, mascaramento de dados sensíveis, bloqueio de admin como aluno) são aplicadas no próprio banco.

**Responsividade:** funcional, mas essencialmente única — apenas três classes responsivas em todo o projeto.

**Animações:** mínimas — transições de cor, `animate-pulse` no splash, `animate-spin` no login e as animações nativas de modal e toast. Nada de scroll, glow, parallax, skeleton ou transição entre páginas.

**Principais inconsistências:** fundo preto puro no login versus `#0A0A0A` no app; paddings de card em seis medidas diferentes; componentes duplicados entre aluno e admin; grande biblioteca shadcn subutilizada; loading sempre em texto; PWA sem service worker; e uma tela admin publicada como placeholder.

---

## 28. BASE PARA NOVO PADRÃO VISUAL

Esta seção **não implementa** nada; apenas classifica o que poderá ser alterado depois e com qual nível de risco.

### 28.1 Alterações predominantemente visuais (risco baixo)

| Alvo | Arquivos | Observação |
| --- | --- | --- |
| Paleta, gradientes e sombras | `src/styles.css` (`:root`, `.light`) | os componentes já consomem tokens; trocar valores propaga globalmente |
| Tipografia (famílias, escala, tracking) | `src/styles.css` + `<link>` do Google Fonts em `__root.tsx` | trocar `--font-display/heading/sans` altera todo o app |
| Padrão de card | utilitário `surface-panel` em `src/styles.css` | ponto único para novo raio, borda, fundo e sombra |
| Novos utilitários (glow, hover, elevações) | `src/styles.css` (`@utility`) | não afeta lógica |
| Espaçamentos e raios | `--radius` e classes de padding nas telas | padronizável sem tocar em dados |
| Animações e microinterações | classes nas telas + `tw-animate-css` | `transition`, `transform`, `scale`, entrada de listas |
| Estilos dos botões | `src/components/ui/button.tsx` (variantes cva) | manter os nomes das variantes evita quebras |
| Estados vazios | `EmptyState` em `AppShell.tsx` | pode ganhar ilustração e variação |
| Splash / launch screen | `src/routes/index.tsx` e `public/icons/*` | visual e assets |
| Ícones | trocas dentro de lucide-react | 1-para-1 |

### 28.2 Alterações que podem afetar componentes funcionais (risco médio)

| Alvo | Impacto |
| --- | --- |
| `AppShell.tsx` | contém o redirecionamento de admin e as listas de abas; mexer no layout exige preservar essa lógica |
| Substituir cards ad hoc por componentes compartilhados | refatoração ampla; alterar props muda o comportamento das telas |
| Adotar `ui/card`, `ui/badge`, `ui/skeleton`, `ui/table` | melhora a consistência, mas reescreve marcação em quase todas as telas |
| Trocar `<select>` nativo por `ui/select` no `RecordDialog` | muda o contrato de eventos do formulário genérico |
| Reorganizar a navegação (ex.: sidebar no desktop) | altera hierarquia de rotas e o comportamento do `AppShell` |
| Adotar react-hook-form + zod | reescreve todos os formulários |
| Adicionar skeletons | exige expor `isLoading` de cada query nas telas |

### 28.3 Alterações que podem afetar regras de negócio (risco alto — exigem validação)

- Alterar a lógica de reserva/cancelamento em `agenda.tsx` (reativação de reserva cancelada, confirmações).
- Alterar a verificação de conflito de horário e a criação em lote em `admin/horarios.tsx`.
- Alterar `fetchAlunos`/`fetchAdminUserIds` (exclusão de admins da contagem).
- Alterar `saudacao()` e as máscaras em `format.ts`.
- Alterar o cálculo de ocupação e de "turmas lotadas".
- Implementar de fato `/admin/notificacoes` (hoje placeholder).

### 28.4 Alterações que podem afetar banco ou autenticação (risco máximo — não tocar sem migração planejada)

- Qualquer mudança em policies RLS, funções `private.*` ou triggers (`check_vagas`, `block_admin_aluno`, `sync_mascarados`, `handle_new_user`).
- Alterações de schema (colunas órfãs como `plano_id`, `metadata`, `cor`, ou a tabela `notificacoes_leitura`).
- Configuração do bucket `avatars` (hoje privado, com URL assinada).
- `src/lib/auth.tsx`, `_authenticated/route.tsx`, `AdminGuard.tsx` e os arquivos gerados em `src/integrations/supabase/`.
- Manifest e ícones do PWA (afetam instalações já existentes).

---

*Fim do documento. Nenhuma alteração foi aplicada ao aplicativo nesta etapa.*
