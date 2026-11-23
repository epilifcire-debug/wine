# Pagamento presencial e liberação manual do plano

## Objetivo
Separar a escolha do plano da ativação: o aluno seleciona, o contrato fica aguardando pagamento e somente Administrador ou Administrador Master confirma o pagamento presencial e libera o plano.

## Implementação
- Reutilizar `aluno_planos`, o status existente `aguardando_pagamento` e a tabela `pagamentos`; não criar estrutura financeira duplicada.
- Substituir a ativação imediata por uma operação segura de seleção que cria uma cobrança pendente sem preencher o plano ativo do aluno, sem iniciar vigência e sem liberar reservas.
- Criar uma operação transacional exclusiva da administração para confirmar o pagamento presencial, registrar quem confirmou, ativar ou renovar o contrato e calcular o vencimento pela duração real do plano.
- Impedir confirmação duplicada do mesmo ciclo com chave única, trava transacional e validação do contrato pendente.
- Restringir gravações diretas em contratos e pagamentos; alunos poderão apenas consultar seus próprios registros e usar a operação de seleção permitida.
- Manter contratos e pagamentos antigos sem reclassificação ou exclusão.

## Área do aluno
- Após escolher, mostrar a confirmação solicitada e o estado **Aguardando pagamento**, com plano e valor selecionados.
- Manter reservas bloqueadas enquanto o contrato estiver pendente.
- Após a confirmação administrativa, mostrar estado ativo, início, vencimento, limites e benefícios sem exigir novo login.

## Financeiro administrativo
- Ao selecionar um aluno, mostrar ID WBC, plano/cobrança atual, valor, estado, vencimento, último pagamento e histórico financeiro.
- Adicionar **Confirmar pagamento presencial** com modal contendo aluno, ID WBC, plano, valor e forma.
- Atualizar imediatamente financeiro, alunos, contratos, planos, painel e regras dependentes após confirmação.

## Segurança e testes
- Validar escolha pendente, bloqueio de reserva, visualização administrativa, confirmação, ativação, vencimento e liberação posterior.
- Validar que aluno não altera pagamento/contrato diretamente e que a segunda confirmação não duplica pagamento ou período.
- Executar checagem de tipos, compilação e testes no navegador em desktop e celular.
- Não alterar bot WhatsApp, UUID, ID WBC, papéis, fila, notificações WhatsApp, modalidades, vagas ou limites semanais.

## Entrega
Relatório técnico com estruturas reutilizadas, estados, operações seguras, regras de acesso, idempotência, cálculo de vencimento, atualizações de tela e resultados dos testes obrigatórios.
