# Auditoria final para liberação — Wine Barbell Club

## Objetivo
Validar o sistema publicado e o ambiente de teste de ponta a ponta, registrar toda falha antes de corrigi-la e liberar somente sem pendências críticas ou altas.

## 1. Inventário e linha de base
- Executar compilação, checagem de tipos, dependências, logs, saúde do banco e varredura de segurança.
- Inventariar todas as páginas, ações, RPCs, gatilhos, restrições e regras de acesso envolvidas.
- Registrar cada ocorrência com ID, fluxo, esperado, obtido, erro, causa, severidade e correção proposta antes de qualquer alteração.

## 2. Rotas, sessão e interface
- Testar todas as URLs por acesso direto, atualização, menu, voltar, página inexistente e papel do usuário.
- Validar login correto/incorreto, logout, nova sessão, atualização da página, expiração e retorno após autenticação.
- Conferir estados de carregamento, erro, vazio e sucesso sem mascarar falhas como listas vazias.
- Validar o menu em 360, 390, 430, 1366 e 1920 px, incluindo drawer, overlay, fechamento, tooltips e ausência de sobreposição.

## 3. Cadastro, perfil e papéis
- Criar contas de teste isoladas e confirmar UUID, perfil, ID WBC, papel Aluno e ficha sem duplicidade.
- Confirmar presença imediata nas páginas Usuários e Alunos, inclusive sem plano.
- Editar todos os campos permitidos do perfil e verificar persistência após nova leitura, atualização, logout e login.
- Tentar alterar campos protegidos e papéis pela interface e diretamente pelo servidor.
- Validar acessos de Aluno, Professor, Administrador e Administrador Master, incluindo troca e reversão de papel sem alterar UUID ou ID WBC.

## 4. Jornada operacional completa
- Usar dados de teste para validar plano, ativação, reservas, limite semanal, cancelamento, duplicidade e lotação.
- Validar fila cronológica, oportunidade sem reserva automática, disputa da última vaga e reativação com todas as regras.
- Validar check-in único, presença, frequência, faltas e exclusão correta de cancelamentos dos indicadores.
- Conferir os quatro planos reais nas duas áreas, inclusive formatação no celular.
- Validar somente a lógica atual de `whatsapp_notifications` e os contratos HTTP existentes, sem alterar o bot.

## 5. Banco, integridade e segurança
- Comparar contagens de papéis e fichas; procurar órfãos e duplicidades em todas as relações críticas.
- Auditar RLS das tabelas principais, permissões operacionais e exclusividade do Administrador Master.
- Confirmar restrições e funções concorrentes com tentativas positivas e negativas.
- Não desativar RLS, não apagar dados reais e não aplicar migração destrutiva.

## 6. Correções comprovadas e regressão
- Corrigir somente falhas reproduzidas e previamente registradas.
- Para cada correção, executar novamente o teste que falhou e os fluxos relacionados.
- Repetir cadastro, perfil, plano, reserva, cancelamento, reativação, fila, check-in, frequência, papéis e painel.
- Executar novamente compilação, logs, segurança e testes de desktop/celular.

## Entrega
- Matriz `Teste | Fluxo | Resultado | Status`, totais executados/aprovados/falhos/corrigidos e pendências.
- Relação de falhas por severidade, arquivos, migrations, funções, gatilhos e regras de acesso alterados.
- Resultado por dispositivo, confirmação de preservação dos dados e de que o bot não foi alterado.
- Veredito final `APTO PARA LIBERAÇÃO` ou `NÃO APTO PARA LIBERAÇÃO`, com bloqueadores exatos.

## Limites
- Nenhuma funcionalidade nova, redesenho ou novo sistema de notificações.
- Nenhuma alteração no bot WhatsApp, login, contratos de API ou dados reais fora de correções comprovadas.
- Alertas de dependências serão tratados como achados até haver confirmação de exposição ou atualização segura disponível.
