# Design System — Wine Barbell Club

Documentação de referência do design system atual do **Wine Barbell Club**, baseada nos tokens definidos em `src/styles.css`, nas fontes carregadas em `src/routes/__root.tsx` e nos componentes de `src/components/`.

Stack visual: **Tailwind CSS v4** (CSS-first com `@theme inline`), **shadcn/ui** (Radix UI + `class-variance-authority` + `tw-animate-css`), **Lucide React** e **Sonner**.

---

## 1. Paleta de cores

As cores são definidas em **OKLCH** em `src/styles.css` e expostas como tokens semânticos (`bg-background`, `text-foreground`, `bg-primary`, etc.). O tema padrão é **escuro** (`:root` / `.dark`); o tema claro é ativado pela classe `.light` no elemento `<html>` (`src/lib/theme.tsx`).

### Tema escuro (padrão — `:root`)

| Token CSS | Valor OKLCH | Hex equivalente | Uso principal |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(0.145 0 0)` | `#0A0A0A` | Fundo principal da aplicação |
| `--foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto principal |
| `--surface` / `--card` / `--popover` | `oklch(0.21 0 0)` | `#181818` *(ref. `#1B1B1B`)* | Superfície de cards, painéis e popovers |
| `--surface-2` | `oklch(0.29 0 0)` | `#2B2B2B` *(ref. `#2D2D2D`)* | Superfície elevada secundária |
| `--sidebar` | `oklch(0.175 0 0)` | `#101010` | Fundo do menu lateral |
| `--primary` / `--gold` / `--ring` | `oklch(0.694 0.062 85.5)` | `#AE9A70` *(ref. `#B49B63`)* | Destaque dourado, CTA principal, foco |
| `--primary-foreground` | `oklch(0.145 0 0)` | `#0A0A0A` | Texto sobre botão/badge primário |
| `--gold-soft` | `oklch(0.8 0.052 85.5)` | `#CDBC98` | Dourado suave (gráficos e gradientes) |
| `--secondary` / `--muted` / `--accent` | `oklch(0.29 0 0)` | `#2B2B2B` | Fundos neutros, hover de ghost/outline, abas |
| `--secondary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre superfície secundária |
| `--muted-foreground` | `oklch(0.68 0 0)` | `#989898` | Texto secundário, legendas, placeholders |
| `--accent-foreground` | `oklch(0.694 0.062 85.5)` | `#AE9A70` | Texto/ícone em destaque no hover |
| `--border` / `--input` | `oklch(0.29 0 0)` | `#2B2B2B` | Bordas de cards, divisores e campos |
| `--success` | `oklch(0.68 0.15 150)` | `#45B164` | Estado de sucesso (confirmado, presente) |
| `--success-foreground` | `oklch(0.145 0 0)` | `#0A0A0A` | Texto sobre fundo de sucesso |
| `--destructive` | `oklch(0.6 0.21 25)` | `#E23439` | Erro, cancelamento, turma lotada, exclusão |
| `--destructive-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre fundo destrutivo |

### Tema claro (`.light`)

| Token CSS | Valor OKLCH | Hex equivalente | Uso principal |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(0.985 0.002 90)` | `#FAFAF9` | Fundo principal |
| `--foreground` | `oklch(0.16 0 0)` | `#0D0D0D` | Texto principal |
| `--surface` / `--card` / `--popover` / `--sidebar` | `oklch(1 0 0)` | `#FFFFFF` | Cards, painéis, popovers e sidebar |
| `--surface-2` | `oklch(0.95 0.003 90)` | `#EFEEEC` | Superfície secundária |
| `--primary` / `--gold` / `--ring` | `oklch(0.56 0.07 82)` | `#897143` | Destaque dourado com contraste no claro |
| `--primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre CTA primário |
| `--gold-soft` | `oklch(0.66 0.065 84)` | `#A58F64` | Dourado suave |
| `--secondary` / `--muted` / `--accent` | `oklch(0.94 0.003 90)` | `#ECEBE9` | Fundos neutros e estados hover |
| `--secondary-foreground` | `oklch(0.2 0 0)` | `#161616` | Texto sobre secundário |
| `--muted-foreground` | `oklch(0.48 0 0)` | `#5D5D5D` | Texto secundário e legendas |
| `--accent-foreground` | `oklch(0.5 0.07 82)` | `#775F32` | Texto/ícone em hover |
| `--border` / `--input` | `oklch(0.9 0.003 90)` | `#DFDEDC` | Bordas e inputs |
| `--success` | `oklch(0.55 0.15 150)` | `#05893E` | Estado de sucesso |
| `--success-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre sucesso |
| `--destructive` | `oklch(0.55 0.21 25)` | `#D01C29` | Estado de erro/destrutivo |
| `--destructive-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre destrutivo |

### Observações sobre estados e gradientes

- **Estado de aviso (warning):** não há token `--warning` dedicado em `src/styles.css`. Avisos e pendências (ex.: pagamento pendente, alerta de plano) usam o dourado da marca (`text-primary` / `text-gold` / `border-primary/40`) ou o estilo nativo `richColors` do Sonner.
- **Gradiente dourado (`--gradient-gold`):** `linear-gradient(120deg, oklch(0.62 0.055 78), oklch(0.85 0.06 92), oklch(0.66 0.06 80))`, aplicado em títulos via utilitário `.text-gold-gradient`.
- **Gradiente de superfície (`--gradient-surface`):** usado em `.surface-panel` para dar profundidade sutil aos painéis.

---

## 2. Tipografia

As fontes são carregadas via Google Fonts em `src/routes/__root.tsx`:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
/>
```

### Famílias e pesos

| Papel | Token | Família | Pesos carregados | Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `--font-display` | `"Bebas Neue", "Oswald", system-ui, sans-serif` | `400` | Títulos de página, nome da marca, números de KPI, destaques |
| **Heading** | `--font-heading` | `"Oswald", system-ui, sans-serif` | `400, 500, 600, 700` | `h1`, `h2`, `h3` (padrão `600`, `letter-spacing: 0.02em`) e `.eyebrow` |
| **Corpo (Sans)** | `--font-sans` | `"Inter", system-ui, sans-serif` | `400, 500, 600, 700` | Corpo de texto, formulários, tabelas, botões e metadados |

### Escala tipográfica usada no app

| Nível | Classes Tailwind | Tamanho | Altura de linha | Tracking / Estilo |
| :--- | :--- | :--- | :--- | :--- |
| **Display 404 / Hero numérico** | `font-display text-7xl` | `4.5rem` (72px) | `1` (`leading-none`) | `0.06em` |
| **Título de página (`PageTitle`)** | `font-display text-3xl leading-none` | `1.875rem` (30px) | `1` (`leading-none`) | `0.06em` |
| **Título de destaque / KPI** | `font-display text-2xl` | `1.5rem` (24px) | `2rem` (32px) | `0.06em` |
| **Título de card / seção** | `font-display text-lg` ou `text-xl` | `1.125rem–1.25rem` (18–20px) | `1.75rem` (28px) | `0.06em` |
| **Subtítulo / Modal title** | `text-lg font-semibold leading-none tracking-tight` | `1.125rem` (18px) | `1` (`leading-none`) | `-0.025em` |
| **Corpo padrão** | `text-sm` | `0.875rem` (14px) | `1.25rem` (20px) | normal |
| **Input mobile / desktop** | `text-base md:text-sm` | `16px` mobile / `14px` desktop | `1.5rem` / `1.25rem` | evita zoom automático no iOS |
| **Legenda / Metadado** | `text-xs text-muted-foreground` | `0.75rem` (12px) | `1rem` (16px) | normal |
| **Micro-label / Atalho** | `text-[11px]` | `11px` | `1rem` | normal |
| **Eyebrow (`.eyebrow`)** | `.eyebrow` | `0.7rem` (11.2px) | padrão | `Oswald`, `uppercase`, `letter-spacing: 0.18em`, `var(--color-gold)` |

---

## 3. Espaçamento e grid

- **Escala base:** padrão Tailwind v4 em múltiplos de `0.25rem` (`4px`). Os ritmos mais usados são `gap-2` (`8px`), `gap-3` (`12px`), `space-y-4` (`16px`) e `space-y-6` (`24px`) entre seções.
- **Largura máxima de conteúdo:** `max-w-7xl` (`1280px`) centralizado com `mx-auto w-full flex-1 px-4 py-5 sm:px-6 lg:px-8` (`AppShell.tsx`).
- **Formulários centralizados (Login / Reset):** `max-w-sm` (`384px`) com `px-6 py-10`.
- **Sidebar:** `16rem` (`256px`) expandida no desktop, `3rem` (`48px`) recolhida em ícones, `82vw` no drawer mobile.

### Breakpoints responsivos

| Breakpoint | Largura mínima | Uso no projeto |
| :--- | :--- | :--- |
| Base (Mobile) | `< 640px` | 1 coluna em listas, 2 colunas em KPIs (`grid-cols-2`), 3 colunas em atalhos (`grid-cols-3`), sidebar em drawer (`82vw`) |
| `sm` | `640px` | Padding lateral `px-6`, grids de 3–4 colunas em KPIs, `PageTitle` em flex horizontal |
| `md` | `768px` | `MOBILE_BREAKPOINT = 768` (`useIsMobile`): transição de drawer mobile para sidebar lateral; logo central do header oculta (`md:hidden`) |
| `lg` | `1024px` | Padding lateral `px-8`, cards lado a lado em grids mais largos |
| `xl` | `1280px` | Sidebar inicia expandida por padrão no desktop (`window.matchMedia("(min-width: 1280px)")`, persistida em `localStorage`) |

---

## 4. Bordas e raios

Base configurada em `:root` com `--radius: 0.75rem` (`12px`):

| Token / Classe | Valor | Onde é usado |
| :--- | :--- | :--- |
| `rounded-sm` (`--radius-sm`) | `calc(0.75rem - 4px)` = `8px` | Pequenos detalhes internos |
| `rounded-md` (`--radius-md`) | `calc(0.75rem - 2px)` = `10px` | Botões (`Button`), inputs (`Input`), badges (`Badge`), `TabsTrigger`, `Skeleton`, itens de menu |
| `rounded-lg` (`--radius-lg`) | `0.75rem` = `12px` | `.surface-panel`, `TabsList`, modais (`Dialog` em `sm:rounded-lg`) |
| `rounded-xl` (`--radius-xl`) | `calc(0.75rem + 4px)` = `16px` | `Card` (shadcn) e containers destacados |
| `rounded-t-[10px]` | `10px` (topo) | `DrawerContent` (bottom sheet `vaul`) |

Bordas usam `1px solid var(--color-border)` (`border border-border`) e divisores internos usam `divide-y divide-border` ou `border-t border-border`.

---

## 5. Sombras e elevação

| Token / Classe | Valor (Escuro / Claro) | Onde é usado |
| :--- | :--- | :--- |
| `--shadow-elevated` | Escuro: `0 18px 40px -18px oklch(0 0 0 / 0.85)`<br>Claro: `0 14px 34px -20px oklch(0 0 0 / 0.35)` | `.surface-panel` (cards principais, listas, `EmptyState`) |
| `--shadow-gold` | Escuro: `0 10px 30px -12px oklch(0.694 0.062 85.5 / 0.55)`<br>Claro: `0 10px 26px -14px oklch(0.56 0.07 82 / 0.5)` | Disponível para destaques dourados / CTAs premium |
| `shadow-sm` | Padrão Tailwind | `Input`, `Button` (`destructive`, `outline`, `secondary`) |
| `shadow` | Padrão Tailwind | `Button` (`default`), `Card`, `Badge` (`default`), `TabsTrigger` ativo |
| `shadow-md` | Padrão Tailwind | `SelectContent`, `Popover`, `HoverCard` |
| `shadow-lg` | Padrão Tailwind | `Dialog`, `AlertDialog`, `Sheet`, `DropdownMenu` |

---

## 6. Componentes

### Botões (`src/components/ui/button.tsx`)

Variantes: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
Tamanhos: `default` (`h-9 px-4 py-2`), `sm` (`h-8 px-3 text-xs`), `lg` (`h-10 px-8`), `icon` (`h-9 w-9`).
Estados: `hover:bg-primary/90`, `focus-visible:ring-1 focus-visible:ring-ring`, `disabled:pointer-events-none disabled:opacity-50`.

```tsx
<Button variant="default" size="lg">Entrar</Button>
<Button variant="outline" size="sm">Ver todas</Button>
<Button variant="destructive">Cancelar reserva</Button>
<Button variant="ghost" size="icon" aria-label="Alternar tema"><Sun className="size-4" /></Button>
```

### Cards e Painéis (`src/components/ui/card.tsx` e `.surface-panel`)

Na maior parte das telas, o projeto usa o utilitário `.surface-panel` (gradiente de superfície + borda + `--radius-lg` + `--shadow-elevated`). O `Card` do shadcn (`rounded-xl border bg-card text-card-foreground shadow`) também está disponível.

```tsx
<section className="surface-panel overflow-hidden">
  <div className="border-b border-border px-5 py-3">
    <p className="eyebrow">Próxima aula</p>
  </div>
  <div className="px-5 py-4">...</div>
</section>
```

### Inputs (`src/components/ui/input.tsx`)

```tsx
<Input
  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 md:text-sm"
/>
```

### Selects (`src/components/ui/select.tsx`)

Baseado em `@radix-ui/react-select`: trigger com altura `h-9`, borda `border-input`, e `SelectContent` em `bg-popover text-popover-foreground shadow-md rounded-md border`.

### Modais (`dialog.tsx` e `alert-dialog.tsx`)

Overlay `fixed inset-0 z-50 bg-black/80` com conteúdo centralizado (`max-w-lg border bg-background p-6 shadow-lg sm:rounded-lg`) e animação `fade-in-0 zoom-in-95` em `duration-200`.

### Drawers e Sheets (`drawer.tsx` e `sheet.tsx`)

- `Drawer` (`vaul`): bottom sheet com alça superior (`h-2 w-[100px] rounded-full bg-muted`) e `rounded-t-[10px] border bg-background`.
- `Sheet` (Radix Dialog): painel lateral deslizante usado internamente pela `Sidebar` no mobile (`82vw`, `duration-300` ao fechar, `duration-500` ao abrir).

### Abas (`src/components/ui/tabs.tsx`)

```tsx
<Tabs defaultValue="proximas">
  <TabsList className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
    <TabsTrigger value="proximas" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
      Próximas
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Badges (`src/components/ui/badge.tsx`)

Variantes: `default` (`bg-primary text-primary-foreground`), `secondary`, `destructive`, `outline`. Formato: `rounded-md border px-2.5 py-0.5 text-xs font-semibold`.

### Toasts (`sonner` em `src/routes/__root.tsx`)

Montado uma única vez na raiz:

```tsx
<Toaster position="top-center" theme="dark" richColors />
```

Disparado via `toast.success(...)` e `toast.error(...)`.

### Navegação (`src/components/AppShell.tsx` e `src/components/ui/sidebar.tsx`)

- **Padrão atual:** navegação lateral unificada em todos os dispositivos. **Não existe menu inferior no mobile** (foi substituído pelo drawer lateral).
- **Desktop (`>= 1280px`):** sidebar fixa de `16rem`, recolhível para modo ícones (`3rem`) com tooltips no hover e estado salvo em `localStorage` (`wbc-sidebar-open`).
- **Tablet (`768px–1279px`):** sidebar inicia recolhida e expande ao acionar o botão `Menu`.
- **Mobile (`< 768px`):** drawer lateral off-canvas (`82vw`) aberto pelo botão `☰` no header, fecha ao tocar fora ou ao selecionar um item.
- **Estado ativo:** `data-[active=true]` com barra vertical dourada à esquerda (`w-0.5 bg-sidebar-primary`).

---

## 7. Movimento

Animações utilitárias fornecidas por `@import "tw-animate-css"` em `src/styles.css`.

| Elemento | Duração | Curva / Efeito |
| :--- | :--- | :--- |
| `Button`, `Input`, `Badge`, links | padrão (`150ms`) | `transition-colors` |
| `Sidebar` (largura/posição) | `duration-200` | `ease-linear` (`transition-[width]`) |
| `Dialog` / `AlertDialog` / `Accordion` | `duration-200` | `fade-in-0`, `zoom-in-95`, `animate-accordion-down/up` |
| `Sheet` (drawer lateral) | `300ms` fechar / `500ms` abrir | `ease-in-out` + slide |
| `NavigationMenu` ícone | `duration-300` | `rotate-180` |
| Loaders / Splash | contínuo | `animate-spin` (`Loader2`), `animate-pulse` (`Skeleton` e splash `/`) |

### `prefers-reduced-motion`

Atualmente o projeto **não** possui uma regra global `@media (prefers-reduced-motion: reduce)` em `src/styles.css`. Ao reutilizar este design system em outro projeto, recomenda-se adicionar:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 8. Padrões de layout das telas principais

- **Cabeçalho (`AppShell.tsx`):** `sticky top-0 z-30 h-14 border-b border-border bg-background/90 backdrop-blur-md`, em grid de 3 colunas (`grid-cols-[auto_minmax(0,1fr)_auto]`): botão de menu à esquerda, logo + marca centralizados no mobile (`md:hidden`), ações à direita (Perfil, Alternar tema, Sair).
- **Login (`/auth`):** tela limpa sem shell, fundo preto (`#000000`), coluna central `max-w-sm`, logo `w-44` no topo, subtítulo em caixa alta com tracking `0.2em`, formulário com `space-y-4` e botão `size="lg" w-full`.
- **Dashboard do aluno (`/app`):** pilha vertical (`space-y-5`/`space-y-6`) com card de resumo do plano (nome em `.text-gold-gradient` + contador numérico `font-display text-2xl`), card da próxima aula (`.surface-panel`), grade de atalhos `grid-cols-3 gap-3` e lista de avisos recentes.
- **Agenda (`/agenda`):** `PageTitle` no topo + lista de cartões `.surface-panel` por aula/horário com data, horário, instrutor, contador de vagas (`usados/limite` em `text-primary` ou `text-destructive` quando lotada) e ações contextuais (reservar, entrar na fila, cancelar).
- **Painel do administrador (`/admin`):** `PageTitle` + seções separadas por `.eyebrow` com grids de KPIs (`grid-cols-2 gap-3 sm:grid-cols-3` e `sm:grid-cols-4`), seguido por listas em `.surface-panel divide-y divide-border` (alunos por plano, modalidades/horários procurados, próximas aulas).

---

## 9. Iconografia e imagens

- **Biblioteca de ícones:** `lucide-react`.
- **Tamanhos padrão:** `size-4` (`16px`) em botões, inputs e metadados; `size-5` (`20px`) em atalhos e trigger do menu; `size-3.5` (`14px`) em contadores compactos.
- **Logo:** asset único (`@/assets/wine-barbell-logo.png.asset.json`), renderizado com `object-contain` (`size-9` na sidebar, `size-8` no header mobile, `w-44` no login, `w-56` no splash).
- **Fotos e mídia:** quando exibidas em eventos, modalidades ou perfis, usam proporção controlada (`aspect-ratio`) com `object-cover` e bordas arredondadas alinhadas ao raio dos cards.

---

## 10. Estados vazio, carregamento e erro

- **Estado vazio (`EmptyState` em `src/components/AppShell.tsx`):**

```tsx
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="surface-panel px-5 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
```

- **Carregamento:**
  - Telas de listagem: `<EmptyState>Carregando…</EmptyState>` durante `isLoading` do TanStack Query.
  - Botões em ação assíncrona: `<Loader2 className="mr-2 size-4 animate-spin" />` com `disabled={busy}`.
  - Placeholder estrutural disponível: `<Skeleton className="animate-pulse rounded-md bg-primary/10" />` (`src/components/ui/skeleton.tsx`).
  - Splash inicial (`/`): logo centralizada com `animate-pulse`.
- **Erro:**
  - Erros de ação/formulário: notificação via `toast.error("mensagem clara em português")`.
  - Erro de rota (`ErrorComponent` em `src/routes/__root.tsx`): tela centralizada com mensagem amigável e ações **Tentar novamente** (`router.invalidate()`) e **Início**.
  - Rota inexistente (`NotFoundComponent`): `404` em `font-display text-7xl text-gold-gradient` + botão **Voltar ao início**.