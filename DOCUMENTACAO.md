# Wine Barbell Club — Documentação de Funcionalidades

App PWA de gestão de estúdio de treinamento (LPO, Híbrido e outras modalidades cadastráveis).

## 1. Visão geral

- **Tema:** escuro por padrão (preto #0A0A0A + dourado #B49B63), com alternância para tema claro.
- **PWA:** instalável em Android, iPhone e Windows, com ícone e nome "Wine Barbell Club".
- **Responsivo:** mobile-first, navegação inferior por papel do usuário.
- **Papéis:** apenas **Aluno** e **Administrador**. Todo novo cadastro vira aluno automaticamente; a conta `winebarbellclub@gmail.com` é administrador e nunca é contada como aluno.

## 2. Autenticação e acesso

| Recurso | Descrição |
| --- | --- |
| Login / cadastro | E-mail e senha |
| Login social | Google |
| Recuperação de senha | Envio de e-mail + tela `/reset-password` |
| Proteção de rotas | Área logada bloqueada; área admin protegida por verificação de papel no banco |
| Sair | Botão de logout no cabeçalho, ao lado do modo noturno |

## 3. Telas do Aluno

### Dashboard (`/app`)
- Saudação por horário: 04:00–12:00 bom dia, 12:01–18:00 boa tarde, 18:01–00:00 boa noite, 00:01–03:59 "Isso é hora?".
- Exibe "Aluno + nome" para perfis de aluno.
- Card da próxima aula reservada (modalidade, data, hora, instrutor).
- Atalhos: agenda, WOD, modalidades, perfil.
- Últimos avisos publicados pelo administrador.

### Modalidades (`/modalidades`)
- Lista de modalidades ativas.
- Detalhe (`/modalidades/:id`): o que é, como funciona, benefícios, exercícios, vídeo do YouTube e galeria de imagens.

### Agenda (`/agenda`)
- Aulas disponíveis com data, horário, instrutor e vagas restantes.
- Reserva de vaga com **modal de confirmação** (evita cliques acidentais).
- Cancelamento de reserva também com confirmação.
- Turmas lotadas ficam bloqueadas.
- Após confirmar, modal opcional para **adicionar o lembrete ao Google Calendar**.


### WOD (`/wod`)
- Treino do dia: nome, objetivo, exercícios, séries, repetições, tempo, observações e vídeo.


### Perfil (`/perfil`)
- Upload de foto de perfil.
- Edição de CPF, data de nascimento, telefone, e-mail, endereço, contato de emergência e observações.
- Dados sensíveis (CPF e nascimento) exibidos mascarados.

### Notificações (`/notificacoes`)
- Lista de comunicados enviados pelo estúdio.

## 4. Telas do Administrador

Menu de gestão fixo na parte inferior da tela.

### Painel (`/admin`)
- Indicadores: total de alunos (sem contar admins), presentes hoje, turmas lotadas.
- Atalhos para todas as áreas de gestão.
- Próximas aulas com ocupação (usados/limite).

### Agenda (`/admin/agenda`)
- Todas as aulas cadastradas com data, horário e instrutor.
- Lista de alunos reservados em cada aula e ocupação da turma.

### Alunos (`/admin/alunos`)
- CRUD de alunos com busca.
- Upload de foto (sem campo de URL).
- CPF e data de nascimento mascarados, com revelação sob confirmação.
- Contas administradoras não aparecem na lista nem nas contagens.

### Modalidades (`/admin/modalidades`)
- CRUD completo: descrição, o que é, como funciona, benefícios, exercícios, vídeo e galeria.

### Horários (`/admin/horarios`)
- Criação de aulas com modalidade, instrutor, data, horário e limite de vagas.
- **Criação em lote por calendário**: repetir a mesma aula em vários dias da semana/mês.
- **Bloqueio de choque de horários**: se já existir aula naquele dia/horário, o sistema barra e exibe modal informando a modalidade conflitante.
- Visualização de ocupação em tempo real.

### Treinos / WOD (`/admin/treinos`)
- Publicação e edição dos treinos por modalidade e data.



### Notificações (`/admin/notificacoes`)
- Envio de comunicados a todos os alunos.

## 5. Segurança e dados

- Backend com Postgres, Auth, Storage e Row Level Security.
- Funções internas de verificação de papel em esquema privado (`SECURITY DEFINER` com privilégios restritos).
- Políticas RLS por papel: aluno enxerga apenas os próprios dados; admin gerencia tudo.
- Trigger que impede que uma conta administradora seja registrada como aluno.
- Dados sensíveis (CPF, nascimento) protegidos por política própria e exibidos mascarados.

## 6. Tabelas principais

`profiles`, `user_roles`, `alunos`, `modalidades`, `horarios`, `reservas`, `treinos`, `notificacoes`.
