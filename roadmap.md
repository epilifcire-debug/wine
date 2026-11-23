# Etapas 10–13

- [x] Concorrência de vagas, fila e oportunidade via WhatsApp no banco
- [x] Reativação segura e estados claros na agenda
- [x] Indicadores completos e fonte administrativa única no painel
- [x] Auditoria final de segurança, banco, build e visual

# Navegação lateral

- [x] Sidebar fixa e recolhível no desktop, com preferência salva
- [x] Sidebar compacta no tablet e drawer com overlay no celular
- [x] Menus organizados pela role usando somente rotas existentes
- [x] Estado ativo, tooltips, fechamento automático e remoção do menu inferior
- [x] Validação visual, responsiva e de compilação
# Auditoria final para liberação

- [ ] Registrar linha de base de build, runtime, dependências e segurança
- [ ] Testar todas as rotas, sessão, navegação e responsividade
- [ ] Validar cadastro, perfil, papéis e campos protegidos
- [ ] Executar jornada completa de plano, reservas, fila, check-in e frequência
- [ ] Auditar RLS, constraints, órfãos e duplicidades
- [ ] Corrigir somente falhas comprovadas e executar regressão
- [ ] Entregar matriz final e veredito de liberação
- [x] Cadastro público e cadeia UUID/perfil/WBC/papel/ficha validados
- [x] Integridade inicial: órfãos e duplicidades validados
- [ ] Reproduzir e corrigir SEG-01, CHK-01, CONC-01 e AUTH-07

# Pagamento presencial e liberação manual

- [x] Registrar seleção do plano como aguardando pagamento, sem liberar reservas
- [x] Implementar confirmação presencial exclusiva de Administrador ou Admin Master
- [x] Implementar ativação/renovação com vencimento calculado e pagamento auditável
- [x] Exibir estado pendente e histórico financeiro nas áreas do aluno e da administração
- [x] Validar segurança do aluno, contrato pago existente, liberação da reserva e visualização desktop/mobile
- [x] Retirar edição direta de contrato que não funcionava na tela financeira; manter confirmação segura pela operação existente
- [x] Revalidar telas de plano, financeiro e agenda em desktop/celular com a conta de aluno autorizada; confirmar bloqueio da área administrativa
- [ ] Testar ponta a ponta nova escolha pendente, confirmação pela tela de administrador e tentativa duplicada com conta autorizada (acesso à conta de teste administrativa não autorizado)
- [x] Entregar relatório técnico com resultados comprovados e pendências explícitas
