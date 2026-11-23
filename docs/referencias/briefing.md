Crie um aplicativo web PWA chamado "Wine Barbell Club" para gestão de um estúdio de treinamento (modalidades LPO — Levantamento de Peso Olímpico — e Híbrido, entre outras que o administrador poderá cadastrar).

IDENTIDADE VISUAL

- Estilo: premium, minimalista, moderno, elegante, esportivo.

- Paleta: preto (#0A0A0A) como fundo principal, dourado (#B49B63) como cor de destaque/CTA, branco (#FFFFFF) para textos, cinza escuro (#1B1B1B) e cinza médio (#2D2D2D) para cards e superfícies.

- Tipografia: fonte condensada e robusta (ex: Bebas Neue ou Oswald para títulos, Inter ou Montserrat para corpo de texto).

- Tema escuro como padrão, com opção de tema claro.

- Interface 100% responsiva (mobile-first), instalável como PWA (Android, iPhone e Windows), com funcionamento offline via cache para conteúdos já carregados.

STACK

- Backend: Supabase (Postgres + Auth + Storage + Row Level Security).

- Autenticação: e-mail/senha e login com Google.

- Apenas DOIS papéis de usuário: Aluno e Administrador. Não existe papel de "Coach"/instrutor como usuário do sistema — o nome de quem dá a aula é apenas um campo de texto livre preenchido pelo administrador ao criar o horário, sem login ou permissão associada.

MODELO DE DADOS (sugestão de tabelas)

- `alunos`: nome, cpf, data_nascimento, telefone, email, endereco, contato_emergencia, observacoes, foto_url. CPF e data de nascimento devem ser protegidos por RLS (somente o administrador autenticado pode ler os valores completos); na interface, exibir sempre mascarados: CPF como `***.000.000-**` e data de nascimento como `00/00/*****`.

- `modalidades`: nome, descricao, o_que_e, como_funciona, beneficios, exercicios, video_youtube_url, galeria_imagens. Totalmente dinâmica — o administrador cria e edita qualquer modalidade (não há modalidades fixas no código; LPO e Híbrido são apenas registros iniciais de exemplo).

- `horarios`: modalidade_id, instrutor (texto livre), data, horario, limite_vagas.

- `reservas`: aluno_id, horario_id, status (confirmada/cancelada). Quando a turma atinge o limite de vagas, o botão de reserva fica desabilitado — NÃO implementar lista de espera.

- `treinos` (WOD): modalidade_id, nome, objetivo, exercicios, series, repeticoes, tempo, observacoes, video_youtube_url (opcional).

- `presencas`: aluno_id, horario_id, data_checkin.

- `checkin_codigos`: codigo, horario_id (ou validade), usado_por. O check-in é feito somente por código digitado pelo aluno (informado no estúdio via cartaz/mural ou verbalmente) — NÃO implementar QR Code, pois exigiria um segundo dispositivo para exibir o código.

- `notificacoes`: titulo, mensagem, data_envio, enviado_por.

TELAS — ALUNO

1. Login/Cadastro: entrar, criar conta, recuperar senha, entrar com Google. Fundo preto puro (#000000), condizente com o logo.

2. Dashboard: saudação, próxima aula (horário, modalidade, instrutor), atalhos rápidos (Agendar Aula, Check-in, WOD, Modalidades, Agenda, Perfil).

3. Modalidades: lista de cards com todas as modalidades cadastradas pelo admin; cada uma abre uma página própria com vídeo do YouTube incorporado, "o que é", "como funciona uma aula", exercícios/movimentos e benefícios.

4. Agenda: lista de aulas por data, mostrando modalidade, horário, instrutor e vagas restantes. Botão "Reservar Aula"; se lotada, botão desabilitado "Sem vagas" (sem lista de espera).

5. Check-in: campo para digitar o código de check-in informado no estúdio + botão de confirmação. Sem câmera, sem QR Code.

6. WOD/Treinos: treino do dia por modalidade, com objetivo, exercícios, séries, repetições, tempo e observações.

7. Biblioteca Técnica: lista de exercícios com vídeo, explicação, dicas e erros comuns, com busca.

8. Perfil: foto, nome, telefone, e-mail, CPF mascarado, data de nascimento mascarada, histórico de aulas, notificações, alterar senha, sair.

TELAS — ADMINISTRADOR

1. Dashboard: total de alunos, alunos presentes no dia, próximas aulas, turmas lotadas.

2. Gestão de Alunos: CRUD completo (nome, CPF, nascimento, telefone, e-mail, endereço, contato de emergência, observações), com CPF e nascimento armazenados completos no banco mas exibidos mascarados na interface.

3. Gestão de Modalidades: CRUD completo (nome, descrição, o que é, como funciona, benefícios, exercícios, vídeo do YouTube, galeria de imagens).

4. Gestão de Horários: CRUD de aulas (modalidade, instrutor em texto livre, data, horário, limite de vagas).

5. Gestão de Treinos: publicação de WODs por modalidade.

6. Gestão de Presença: visualização de presentes/ausentes e histórico.

7. Notificações: envio de notificações push para todos os alunos (aula cancelada, novo WOD, alteração de horário, comunicados, eventos).

REGRAS IMPORTANTES

- Não criar papel de Coach/instrutor como usuário — apenas Aluno e Administrador.

- Não implementar lista de espera — reserva só é permitida com vaga disponível.

- Não implementar check-in por QR Code — apenas por código digitado.

- CPF e data de nascimento sempre mascarados na interface, mesmo para o administrador (considerar opção de "revelar" mediante confirmação).

- Preparar a estrutura pensando em futura adição de: planos/mensalidades, pagamentos online, integração com WhatsApp e Google Calendar — não implementar agora, mas deixar o schema extensível.
o primeiro arquivo é a logo e o segundo é um modelo do site ja montado