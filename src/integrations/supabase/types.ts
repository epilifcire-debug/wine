export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      aluno_planos: {
        Row: {
          aluno_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          observacao: string | null
          plano_id: string | null
          proximo_vencimento: string | null
          recorrencia_ativa: boolean
          recorrencia_ativada_em: string | null
          recorrencia_ativada_por: string | null
          recorrencia_solicitada: boolean
          status: Database["public"]["Enums"]["contrato_status"]
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacao?: string | null
          plano_id?: string | null
          proximo_vencimento?: string | null
          recorrencia_ativa?: boolean
          recorrencia_ativada_em?: string | null
          recorrencia_ativada_por?: string | null
          recorrencia_solicitada?: boolean
          status?: Database["public"]["Enums"]["contrato_status"]
          updated_at?: string
          valor_centavos?: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacao?: string | null
          plano_id?: string | null
          proximo_vencimento?: string | null
          recorrencia_ativa?: boolean
          recorrencia_ativada_em?: string | null
          recorrencia_ativada_por?: string | null
          recorrencia_solicitada?: boolean
          status?: Database["public"]["Enums"]["contrato_status"]
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "aluno_planos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_planos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          ativo: boolean
          codigo_wbc: string | null
          contato_emergencia: string | null
          cpf_mascarado: string | null
          created_at: string
          email: string | null
          endereco: string | null
          foto_url: string | null
          genero: string | null
          google_calendar_id: string | null
          id: string
          metadata: Json
          nascimento_mascarado: string | null
          nome: string
          observacoes: string | null
          plano_id: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          whatsapp_optin: boolean
        }
        Insert: {
          ativo?: boolean
          codigo_wbc?: string | null
          contato_emergencia?: string | null
          cpf_mascarado?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          genero?: string | null
          google_calendar_id?: string | null
          id?: string
          metadata?: Json
          nascimento_mascarado?: string | null
          nome: string
          observacoes?: string | null
          plano_id?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_optin?: boolean
        }
        Update: {
          ativo?: boolean
          codigo_wbc?: string | null
          contato_emergencia?: string | null
          cpf_mascarado?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          genero?: string | null
          google_calendar_id?: string | null
          id?: string
          metadata?: Json
          nascimento_mascarado?: string | null
          nome?: string
          observacoes?: string | null
          plano_id?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_optin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alunos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos_sensiveis: {
        Row: {
          aluno_id: string
          cpf: string | null
          data_nascimento: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          cpf?: string | null
          data_nascimento?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          cpf?: string | null
          data_nascimento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_sensiveis_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      day_uses: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          observacao: string | null
          plano_id: string | null
          reserva_id: string | null
          status: Database["public"]["Enums"]["day_use_status"]
          updated_at: string
          utilizado_em: string | null
          validade: string | null
          valor_centavos: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          plano_id?: string | null
          reserva_id?: string | null
          status?: Database["public"]["Enums"]["day_use_status"]
          updated_at?: string
          utilizado_em?: string | null
          validade?: string | null
          valor_centavos?: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          plano_id?: string | null
          reserva_id?: string | null
          status?: Database["public"]["Enums"]["day_use_status"]
          updated_at?: string
          utilizado_em?: string | null
          validade?: string | null
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "day_uses_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_uses_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_uses_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          horario: string | null
          id: string
          imagem_url: string | null
          informacoes: string | null
          local: string | null
          publicado: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          informacoes?: string | null
          local?: string | null
          publicado?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          informacoes?: string | null
          local?: string | null
          publicado?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      horarios: {
        Row: {
          cancelada: boolean
          created_at: string
          data: string
          horario: string
          id: string
          instrutor: string
          limite_vagas: number
          modalidade_id: string
          observacoes: string | null
          professor_user_id: string | null
          updated_at: string
        }
        Insert: {
          cancelada?: boolean
          created_at?: string
          data: string
          horario: string
          id?: string
          instrutor: string
          limite_vagas?: number
          modalidade_id: string
          observacoes?: string | null
          professor_user_id?: string | null
          updated_at?: string
        }
        Update: {
          cancelada?: boolean
          created_at?: string
          data?: string
          horario?: string
          id?: string
          instrutor?: string
          limite_vagas?: number
          modalidade_id?: string
          observacoes?: string | null
          professor_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_espera: {
        Row: {
          aluno_id: string
          created_at: string
          horario_id: string
          id: string
          oportunidade_em: string | null
          oportunidade_expira_em: string | null
          status: Database["public"]["Enums"]["espera_status"]
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          horario_id: string
          id?: string
          oportunidade_em?: string | null
          oportunidade_expira_em?: string | null
          status?: Database["public"]["Enums"]["espera_status"]
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          horario_id?: string
          id?: string
          oportunidade_em?: string | null
          oportunidade_expira_em?: string | null
          status?: Database["public"]["Enums"]["espera_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lista_espera_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_espera_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidades: {
        Row: {
          ativo: boolean
          beneficios: string | null
          como_funciona: string | null
          cor: string | null
          created_at: string
          descricao: string | null
          exercicios: string | null
          galeria_imagens: string[]
          id: string
          nome: string
          o_que_e: string | null
          updated_at: string
          video_youtube_url: string | null
        }
        Insert: {
          ativo?: boolean
          beneficios?: string | null
          como_funciona?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          exercicios?: string | null
          galeria_imagens?: string[]
          id?: string
          nome: string
          o_que_e?: string | null
          updated_at?: string
          video_youtube_url?: string | null
        }
        Update: {
          ativo?: boolean
          beneficios?: string | null
          como_funciona?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          exercicios?: string | null
          galeria_imagens?: string[]
          id?: string
          nome?: string
          o_que_e?: string | null
          updated_at?: string
          video_youtube_url?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          data_envio: string
          enviado_por: string | null
          id: string
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          data_envio?: string
          enviado_por?: string | null
          id?: string
          mensagem: string
          tipo?: string
          titulo: string
        }
        Update: {
          data_envio?: string
          enviado_por?: string | null
          id?: string
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      notificacoes_leitura: {
        Row: {
          id: string
          lida_em: string
          notificacao_id: string
          user_id: string
        }
        Insert: {
          id?: string
          lida_em?: string
          notificacao_id: string
          user_id: string
        }
        Update: {
          id?: string
          lida_em?: string
          notificacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_leitura_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          aluno_id: string
          aluno_plano_id: string
          chave_idempotencia: string | null
          created_at: string
          forma_pagamento: string
          id: string
          id_externo: string | null
          origem: string
          pago_em: string
          plano_id: string
          provedor: string | null
          registrado_por: string
          status: string
          user_id: string | null
          valor_centavos: number
        }
        Insert: {
          aluno_id: string
          aluno_plano_id: string
          chave_idempotencia?: string | null
          created_at?: string
          forma_pagamento: string
          id?: string
          id_externo?: string | null
          origem?: string
          pago_em?: string
          plano_id: string
          provedor?: string | null
          registrado_por: string
          status: string
          user_id?: string | null
          valor_centavos: number
        }
        Update: {
          aluno_id?: string
          aluno_plano_id?: string
          chave_idempotencia?: string | null
          created_at?: string
          forma_pagamento?: string
          id?: string
          id_externo?: string | null
          origem?: string
          pago_em?: string
          plano_id?: string
          provedor?: string | null
          registrado_por?: string
          status?: string
          user_id?: string | null
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_aluno_plano_id_fkey"
            columns: ["aluno_plano_id"]
            isOneToOne: false
            referencedRelation: "aluno_planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          aluno_id: string
          carga_kg: number | null
          created_at: string
          data: string
          distancia: string | null
          exercicio: string
          id: string
          observacao: string | null
          repeticoes: number | null
          resultado: string | null
          tempo: string | null
        }
        Insert: {
          aluno_id: string
          carga_kg?: number | null
          created_at?: string
          data?: string
          distancia?: string | null
          exercicio: string
          id?: string
          observacao?: string | null
          repeticoes?: number | null
          resultado?: string | null
          tempo?: string | null
        }
        Update: {
          aluno_id?: string
          carga_kg?: number | null
          created_at?: string
          data?: string
          distancia?: string | null
          exercicio?: string
          id?: string
          observacao?: string | null
          repeticoes?: number | null
          resultado?: string | null
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performances_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_historico: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          observacao: string | null
          plano_anterior_id: string | null
          plano_novo_id: string | null
          responsavel_user_id: string | null
          tipo: Database["public"]["Enums"]["plano_evento"]
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          plano_anterior_id?: string | null
          plano_novo_id?: string | null
          responsavel_user_id?: string | null
          tipo: Database["public"]["Enums"]["plano_evento"]
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          plano_anterior_id?: string | null
          plano_novo_id?: string | null
          responsavel_user_id?: string | null
          tipo?: Database["public"]["Enums"]["plano_evento"]
        }
        Relationships: [
          {
            foreignKeyName: "plano_historico_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_historico_plano_anterior_id_fkey"
            columns: ["plano_anterior_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_historico_plano_novo_id_fkey"
            columns: ["plano_novo_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          acesso_livre: boolean
          ativo: boolean
          beneficios: string | null
          created_at: string
          descricao: string | null
          dias_permitidos: number[] | null
          duracao_meses: number
          forma_pagamento: string
          id: string
          ilimitado: boolean
          limite_mensal: number | null
          limite_semanal: number | null
          modalidades_permitidas: string[] | null
          nome: string
          ordem: number
          preco_centavos: number
          preco_recorrencia_centavos: number | null
          regras_acesso: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          acesso_livre?: boolean
          ativo?: boolean
          beneficios?: string | null
          created_at?: string
          descricao?: string | null
          dias_permitidos?: number[] | null
          duracao_meses?: number
          forma_pagamento?: string
          id?: string
          ilimitado?: boolean
          limite_mensal?: number | null
          limite_semanal?: number | null
          modalidades_permitidas?: string[] | null
          nome: string
          ordem?: number
          preco_centavos?: number
          preco_recorrencia_centavos?: number | null
          regras_acesso?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          acesso_livre?: boolean
          ativo?: boolean
          beneficios?: string | null
          created_at?: string
          descricao?: string | null
          dias_permitidos?: number[] | null
          duracao_meses?: number
          forma_pagamento?: string
          id?: string
          ilimitado?: boolean
          limite_mensal?: number | null
          limite_semanal?: number | null
          modalidades_permitidas?: string[] | null
          nome?: string
          ordem?: number
          preco_centavos?: number
          preco_recorrencia_centavos?: number | null
          regras_acesso?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          codigo_wbc: string | null
          created_at: string
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          codigo_wbc?: string | null
          created_at?: string
          foto_url?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          codigo_wbc?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          aluno_id: string
          checkin_em: string | null
          created_at: string
          horario_id: string
          id: string
          presenca: string
          presenca_em: string | null
          presenca_por: string | null
          status: Database["public"]["Enums"]["reserva_status"]
          updated_at: string
        }
        Insert: {
          aluno_id: string
          checkin_em?: string | null
          created_at?: string
          horario_id: string
          id?: string
          presenca?: string
          presenca_em?: string | null
          presenca_por?: string | null
          status?: Database["public"]["Enums"]["reserva_status"]
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          checkin_em?: string | null
          created_at?: string
          horario_id?: string
          id?: string
          presenca?: string
          presenca_em?: string | null
          presenca_por?: string | null
          status?: Database["public"]["Enums"]["reserva_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_log: {
        Row: {
          alterado_por: string | null
          codigo_wbc: string | null
          created_at: string
          email: string | null
          id: string
          perfil_anterior: string | null
          perfil_novo: string | null
          user_id: string
        }
        Insert: {
          alterado_por?: string | null
          codigo_wbc?: string | null
          created_at?: string
          email?: string | null
          id?: string
          perfil_anterior?: string | null
          perfil_novo?: string | null
          user_id: string
        }
        Update: {
          alterado_por?: string | null
          codigo_wbc?: string | null
          created_at?: string
          email?: string | null
          id?: string
          perfil_anterior?: string | null
          perfil_novo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      treinos: {
        Row: {
          created_at: string
          data: string
          exercicios: string | null
          id: string
          modalidade_id: string
          nome: string
          objetivo: string | null
          observacoes: string | null
          repeticoes: string | null
          series: string | null
          tempo: string | null
          updated_at: string
          video_youtube_url: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          exercicios?: string | null
          id?: string
          modalidade_id: string
          nome: string
          objetivo?: string | null
          observacoes?: string | null
          repeticoes?: string | null
          series?: string | null
          tempo?: string | null
          updated_at?: string
          video_youtube_url?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          exercicios?: string | null
          id?: string
          modalidade_id?: string
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          repeticoes?: string | null
          series?: string | null
          tempo?: string | null
          updated_at?: string
          video_youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinos_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_notifications: {
        Row: {
          created_at: string
          enviado_em: string
          id: string
          lista_espera_id: string | null
          reserva_id: string | null
          telefone: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          enviado_em?: string
          id?: string
          lista_espera_id?: string | null
          reserva_id?: string | null
          telefone?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          enviado_em?: string
          id?: string
          lista_espera_id?: string | null
          reserva_id?: string | null
          telefone?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_lista_espera_id_fkey"
            columns: ["lista_espera_id"]
            isOneToOne: false
            referencedRelation: "lista_espera"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ativar_plano: { Args: { p_plano_id: string }; Returns: string }
      comprar_day_use: { Args: { p_plano_id: string }; Returns: string }
      ensure_current_student: { Args: never; Returns: string }
      entrar_lista_espera: { Args: { p_horario_id: string }; Returns: string }
      gerar_codigo_wbc: { Args: never; Returns: string }
      reativar_reserva: { Args: { p_reserva_id: string }; Returns: string }
      registrar_pagamento_presencial: {
        Args: { p_aluno_plano_id: string }
        Returns: string
      }
      sair_lista_espera: { Args: { p_horario_id: string }; Returns: undefined }
      sincronizar_ficha_aluno: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "aluno" | "professor" | "admin_master"
      contrato_status:
        | "ativo"
        | "proximo_vencimento"
        | "vencido"
        | "cancelado"
        | "aguardando_pagamento"
      day_use_status:
        | "aguardando_pagamento"
        | "disponivel"
        | "reservado"
        | "utilizado"
        | "vencido"
        | "cancelado"
      espera_status:
        | "aguardando"
        | "oportunidade_disponivel"
        | "aceito"
        | "expirado"
        | "removido"
        | "cancelado"
      plano_evento:
        | "contratacao"
        | "renovacao"
        | "upgrade"
        | "downgrade"
        | "cancelamento"
        | "reativacao"
      reserva_status: "confirmada" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "aluno", "professor", "admin_master"],
      contrato_status: [
        "ativo",
        "proximo_vencimento",
        "vencido",
        "cancelado",
        "aguardando_pagamento",
      ],
      day_use_status: [
        "aguardando_pagamento",
        "disponivel",
        "reservado",
        "utilizado",
        "vencido",
        "cancelado",
      ],
      espera_status: [
        "aguardando",
        "oportunidade_disponivel",
        "aceito",
        "expirado",
        "removido",
        "cancelado",
      ],
      plano_evento: [
        "contratacao",
        "renovacao",
        "upgrade",
        "downgrade",
        "cancelamento",
        "reativacao",
      ],
      reserva_status: ["confirmada", "cancelada"],
    },
  },
} as const
