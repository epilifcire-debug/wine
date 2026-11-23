# Plano visual — Wine Barbell Club

Base: padrão EFCsys (`skills/design-direction` + `skills/ui-ux`) com identidade do cliente (logo e briefing).

## 1. Briefing do assunto
- **Produto:** gestão de estúdio de treinamento (LPO e Híbrido). Trabalho principal do aluno: reservar e fazer check-in da aula. Trabalho principal do admin: ver quem está presente e manter a grade de aulas.
- **Quem usa:** aluno no celular, no dia a dia. Admin no desktop e no celular, no estúdio.
- **Identidade:** logo preto com "WINE" em branco, "BARBELL" em dourado, bulldog com barra de peso e anilhas. Vocabulário de academia de levantamento de peso.

## 2. Cores (60-30-10)
| Papel | Hex | Uso |
|---|---|---|
| Fundo | #0A0A0A | Fundo de todas as telas (60%) |
| Superfície | #1B1B1B | Cards e painéis (30%) |
| Superfície elevada | #2D2D2D | Campos, hover, divisores |
| Texto | #FFFFFF | Títulos e corpo |
| Destaque | #B49B63 | Único acento: CTA principal, estado ativo, foco (10%) |

Cinza de texto secundário: a definir no preview (ponto de atenção de contraste AA sobre #0A0A0A).

## 3. Tipografia (2 famílias)
- **Títulos e números:** Bebas Neue. Vem do logo ("BARBELL" é condensado) e combina com a robustez da marca.
- **Interface e corpo:** Inter. Legível em tela pequena, neutra para formulários e listas.
- Pesos: 400 e 600 no corpo; Bebas Neue só em 400.
- Escala: título de página 32px, título de seção 22px, corpo 16px no mobile, legenda 13px. Nada abaixo de 12px.

## 4. Elemento memorável (só um)
**Anilhas como indicador.** A barra de vagas da aula e o contador de frequência são desenhados como anilhas empilhadas (cheias = vagas usadas). É o único elemento decorativo com forma própria; o resto fica quieto.

## 5. Layout
- Mobile: navegação inferior com 4 abas (Início, Agenda, Check-in, Perfil). Mais telas ficam em "Mais".
- Desktop: barra lateral fixa com os mesmos itens.
- Padrões de página: lista (agenda, alunos), detalhe (modalidade), formulário (check-in, perfil), dashboard (início do admin).

## 6. Revisão anti-genérico
Removidos do design atual do Lovable: texto em degradê (`text-gold-gradient`), rótulo em maiúsculas acima de todo título (`.eyebrow`), fundo de superfície em gradiente, sombras pesadas nos painéis.
Mantido: fundo preto e dourado, que vêm da marca.

## 7. Movimento
Transições de 150 a 250 ms só em cor e opacidade. Sem fundos animados. Respeitar `prefers-reduced-motion`.

## 8. Entregáveis
- Preview navegável em 375px e 1280px: login, início do aluno, agenda, check-in, início do admin.
- Assinatura "by: efcsys" no rodapé, sem prejudicar a marca.
- Ponto de aprovação: validar tipografia e cores no preview antes de codificar todas as telas.
