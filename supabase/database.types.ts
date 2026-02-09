// Generated TypeScript types for Supabase database
// Auto-generated on 2026-02-01

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: number
          client_name: string
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          postal_address: string | null
          city: string | null
          postal_code: string | null
          country: string | null
          lead_status: string | null
          service_type: string | null
          contact_date: string | null
          is_contacted: boolean | null
          is_archived: boolean | null
          comments: string | null
          notion_page_id: string | null
          notion_url: string | null
          notion_project_url: string | null
          spreadsheet_row: number | null
          youtube_channel: string | null
          instagram_account: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_name: string
          company_name?: string | null
          contact_email?: string | null
          lead_status?: string | null
          service_type?: string | null
        }
        Update: {
          client_name?: string
          company_name?: string | null
          contact_email?: string | null
          lead_status?: string | null
        }
      }
      projects: {
        Row: {
          id: number
          client_id: number | null
          title: string | null
          project_name: string
          status: string | null
          type: string | null
          project_type: string | null
          price: number | null
          budget: number | null
          start_date: string | null
          end_date: string | null
          delivery_url: string | null
          raw_files_url: string | null
          comments: string | null
          notion_page_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          project_name: string
          client_id?: number | null
          status?: string | null
        }
        Update: {
          title?: string | null
          status?: string | null
        }
      }
      invoices: {
        Row: {
          id: number
          invoice_number: string
          number: string | null
          client_id: number | null
          amount_ht: number | null
          subtotal: number | null
          total_amount: number | null
          tax_amount: number | null
          status: string | null
          items: Json | null
          issue_date: string | null
          due_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          invoice_number: string
          client_id?: number | null
          status?: string | null
        }
        Update: {
          status?: string | null
          amount_ht?: number | null
        }
      }
      contracts: {
        Row: {
          id: string
          client_id: number | null
          template_id: string | null
          content_snapshot: string | null
          status: string | null
          signed_at: string | null
          signed_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: number | null
          template_id?: string | null
          status?: string | null
        }
        Update: {
          status?: string | null
        }
      }
      media_generations: {
        Row: {
          id: string
          user_id: string | null
          type: string
          provider: string | null
          model_id: string | null
          prompt: string
          public_url: string | null
          thumbnail_url: string | null
          storage_path: string | null
          width: number | null
          height: number | null
          duration: number | null
          job_id: string | null
          status: string | null
          cost_tokens: number | null
          tags: string[] | null
          is_favorite: boolean | null
          is_archived: boolean | null
          created_at: string | null
        }
        Insert: {
          type: string
          prompt: string
          user_id?: string | null
        }
        Update: {
          status?: string | null
          is_favorite?: boolean | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          actor_id: string | null
          actor_name: string | null
          action: string
          entity_type: string
          entity_id: string | null
          target_id: string | null
          old_values: Json | null
          new_values: Json | null
          metadata: Json | null
          level: string | null
          created_at: string | null
        }
        Insert: {
          action: string
          entity_type: string
          actor_name?: string | null
        }
        Update: {
          level?: string | null
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          config: Json | null
          description: string | null
          is_encrypted: boolean | null
          updated_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          value?: Json
          config?: Json | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string | null
          preferences: Json | null
          telegram_id: string | null
          is_active: boolean | null
          last_login_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          email: string
          full_name?: string | null
        }
        Update: {
          full_name?: string | null
          role?: string | null
        }
      }
      n8n_chat_histories: {
        Row: {
          id: number
          session_id: string
          message: Json
          created_at: string | null
        }
        Insert: {
          session_id: string
          message: Json
        }
        Update: {
          message?: Json
        }
      }
      chat_history: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          role: string
          content: string
          metadata: Json | null
          source: string | null
          created_at: string | null
        }
        Insert: {
          session_id: string
          role: string
          content: string
        }
        Update: {
          metadata?: Json | null
        }
      }
      leads: {
        Row: {
          id: string
          company_id: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          job_title: string | null
          linkedin_url: string | null
          status: string | null
          score: number | null
          source: string | null
          tags: string[] | null
          notes: string | null
          assigned_to: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          first_name?: string | null
          last_name?: string | null
          email?: string | null
        }
        Update: {
          status?: string | null
          score?: number | null
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          type: string
          status: string | null
          description: string | null
          stats: Json | null
          created_by: string | null
          start_date: string | null
          end_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          name: string
          type: string
        }
        Update: {
          status?: string | null
        }
      }
      news_articles: {
        Row: {
          id: string
          source_id: string | null
          title: string
          content: string | null
          summary: string | null
          url: string | null
          image_url: string | null
          author: string | null
          published_at: string | null
          sentiment_score: number | null
          relevance_score: number | null
          is_processed: boolean | null
          is_archived: boolean | null
          created_at: string | null
        }
        Insert: {
          title: string
        }
        Update: {
          is_processed?: boolean | null
        }
      }
      video_projects: {
        Row: {
          id: string
          project_id: number | null
          name: string
          description: string | null
          type: string | null
          status: string | null
          client_name: string | null
          specs: Json | null
          duration_seconds: number | null
          deadline: string | null
          delivery_formats: string[] | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          name: string
        }
        Update: {
          status?: string | null
        }
      }
    }
    Views: {
      clients_app_view: {
        Row: {
          id: string | null
          notionPageId: string | null
          spreadsheetRow: number | null
          name: string | null
          companyName: string | null
          email: string | null
          leadStatus: string | null
          serviceType: string | null
          contactDate: string | null
          comments: string | null
          isContacted: boolean | null
          lastSyncedAt: string | null
          postalAddress: string | null
          youtubeChannel: string | null
          instagramAccount: string | null
          isArchived: boolean | null
        }
      }
      projects_app_view: {
        Row: {
          id: string | null
          notionPageId: string | null
          clientId: string | null
          clientName: string | null
          title: string | null
          status: string | null
          type: string | null
          rawFilesUrl: string | null
          deliveryUrl: string | null
          price: number | null
          startDate: string | null
          endDate: string | null
          comments: string | null
          createdAt: string | null
        }
      }
      invoices_app_view: {
        Row: {
          id: string | null
          number: string | null
          clientId: string | null
          amountHT: number | null
          status: string | null
          items: Json | null
          created_at: string | null
          dueDate: string | null
        }
      }
      contracts_app_view: {
        Row: {
          id: string | null
          clientId: string | null
          templateId: string | null
          contentSnapshot: string | null
          status: string | null
          created_at: string | null
          clientName: string | null
        }
      }
      audit_logs_app_view: {
        Row: {
          id: string | null
          actorId: string | null
          actorName: string | null
          action: string | null
          targetId: string | null
          metadata: Json | null
          level: string | null
          timestamp: string | null
        }
      }
      media_generations_app_view: {
        Row: {
          id: string | null
          userId: string | null
          type: string | null
          prompt: string | null
          publicUrl: string | null
          thumbnailUrl: string | null
          width: number | null
          height: number | null
          duration: number | null
          jobId: string | null
          tags: string[] | null
          isFavorite: boolean | null
          createdAt: string | null
        }
      }
      system_settings_app: {
        Row: {
          id: string | null
          config: Json | null
          updated_at: string | null
          updated_by: string | null
        }
      }
    }
    Functions: {
      get_or_create_app_config: {
        Args: Record<string, never>
        Returns: Json
      }
      update_app_config: {
        Args: {
          new_config: Json
          user_uuid?: string
        }
        Returns: Json
      }
      upsert_client_from_app: {
        Args: {
          p_id?: string
          p_notion_page_id?: string
          p_spreadsheet_row?: number
          p_name?: string
          p_company_name?: string
          p_email?: string
          p_lead_status?: string
          p_service_type?: string
          p_contact_date?: string
          p_comments?: string
          p_is_contacted?: boolean
          p_postal_address?: string
          p_youtube_channel?: string
          p_instagram_account?: string
        }
        Returns: Json
      }
      upsert_project_from_app: {
        Args: {
          p_id?: string
          p_client_id?: string
          p_title?: string
          p_status?: string
          p_type?: string
          p_price?: number
          p_delivery_url?: string
          p_raw_files_url?: string
          p_comments?: string
          p_notion_page_id?: string
        }
        Returns: Json
      }
      update_invoice_from_app: {
        Args: {
          p_id: string
          p_status?: string
          p_amount_ht?: number
        }
        Returns: boolean
      }
      update_contract_from_app: {
        Args: {
          p_id: string
          p_status?: string
        }
        Returns: boolean
      }
      add_audit_log_from_app: {
        Args: {
          p_actor_id?: string
          p_actor_name?: string
          p_action?: string
          p_target_id?: string
          p_metadata?: Json
          p_level?: string
        }
        Returns: string
      }
      save_media_asset_from_app: {
        Args: {
          p_user_id?: string
          p_type?: string
          p_prompt?: string
          p_public_url?: string
          p_width?: number
          p_height?: number
          p_duration?: number
          p_job_id?: string
          p_tags?: string[]
        }
        Returns: Json
      }
    }
  }
}

// Helper types for easy access
export type Client = Database['public']['Tables']['clients']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type MediaGeneration = Database['public']['Tables']['media_generations']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type NewsArticle = Database['public']['Tables']['news_articles']['Row']
export type VideoProject = Database['public']['Tables']['video_projects']['Row']

// View types (camelCase format for app compatibility)
export type ClientAppView = Database['public']['Views']['clients_app_view']['Row']
export type ProjectAppView = Database['public']['Views']['projects_app_view']['Row']
export type InvoiceAppView = Database['public']['Views']['invoices_app_view']['Row']
export type ContractAppView = Database['public']['Views']['contracts_app_view']['Row']
export type AuditLogAppView = Database['public']['Views']['audit_logs_app_view']['Row']
export type MediaGenerationAppView = Database['public']['Views']['media_generations_app_view']['Row']
