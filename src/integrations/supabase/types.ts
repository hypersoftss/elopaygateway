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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          is_read: boolean | null
          merchant_id: string | null
          message: string
          notification_type: string
          title: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          merchant_id?: string | null
          message: string
          notification_type: string
          title: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          merchant_id?: string | null
          message?: string
          notification_type?: string
          title?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_profiles: {
        Row: {
          created_at: string | null
          google_2fa_secret: string | null
          id: string
          is_2fa_enabled: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          google_2fa_secret?: string | null
          id?: string
          is_2fa_enabled?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          google_2fa_secret?: string | null
          id?: string
          is_2fa_enabled?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          admin_telegram_chat_id: string | null
          balance_threshold_bdt: number | null
          balance_threshold_inr: number | null
          balance_threshold_pkr: number | null
          bondpay_base_url: string | null
          default_payin_fee: number | null
          default_payout_fee: number | null
          favicon_url: string | null
          gateway_domain: string | null
          gateway_name: string | null
          id: string
          large_payin_threshold: number | null
          large_payout_threshold: number | null
          large_withdrawal_threshold: number | null
          logo_url: string | null
          master_api_key: string
          master_merchant_id: string
          master_payout_key: string
          support_email: string | null
          telegram_bot_token: string | null
          telegram_webhook_url: string | null
          updated_at: string | null
        }
        Insert: {
          admin_telegram_chat_id?: string | null
          balance_threshold_bdt?: number | null
          balance_threshold_inr?: number | null
          balance_threshold_pkr?: number | null
          bondpay_base_url?: string | null
          default_payin_fee?: number | null
          default_payout_fee?: number | null
          favicon_url?: string | null
          gateway_domain?: string | null
          gateway_name?: string | null
          id?: string
          large_payin_threshold?: number | null
          large_payout_threshold?: number | null
          large_withdrawal_threshold?: number | null
          logo_url?: string | null
          master_api_key?: string
          master_merchant_id?: string
          master_payout_key?: string
          support_email?: string | null
          telegram_bot_token?: string | null
          telegram_webhook_url?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_telegram_chat_id?: string | null
          balance_threshold_bdt?: number | null
          balance_threshold_inr?: number | null
          balance_threshold_pkr?: number | null
          bondpay_base_url?: string | null
          default_payin_fee?: number | null
          default_payout_fee?: number | null
          favicon_url?: string | null
          gateway_domain?: string | null
          gateway_name?: string | null
          id?: string
          large_payin_threshold?: number | null
          large_payout_threshold?: number | null
          large_withdrawal_threshold?: number | null
          logo_url?: string | null
          master_api_key?: string
          master_merchant_id?: string
          master_payout_key?: string
          support_email?: string | null
          telegram_bot_token?: string | null
          telegram_webhook_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gateway_balance_history: {
        Row: {
          balance: number | null
          checked_at: string
          gateway_id: string
          id: string
          message: string | null
          status: string
        }
        Insert: {
          balance?: number | null
          checked_at?: string
          gateway_id: string
          id?: string
          message?: string | null
          status?: string
        }
        Update: {
          balance?: number | null
          checked_at?: string
          gateway_id?: string
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_balance_history_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          account_number: string
          api_key: string | null
          balance: number | null
          callback_url: string | null
          created_at: string | null
          frozen_balance: number | null
          gateway_id: string | null
          google_2fa_secret: string | null
          id: string
          is_2fa_enabled: boolean | null
          is_active: boolean | null
          merchant_name: string
          notify_balance_changes: boolean | null
          notify_new_transactions: boolean | null
          notify_status_updates: boolean | null
          payin_fee: number | null
          payout_fee: number | null
          payout_key: string | null
          telegram_chat_id: string | null
          trade_type: string | null
          updated_at: string | null
          user_id: string
          withdrawal_password: string | null
        }
        Insert: {
          account_number: string
          api_key?: string | null
          balance?: number | null
          callback_url?: string | null
          created_at?: string | null
          frozen_balance?: number | null
          gateway_id?: string | null
          google_2fa_secret?: string | null
          id?: string
          is_2fa_enabled?: boolean | null
          is_active?: boolean | null
          merchant_name: string
          notify_balance_changes?: boolean | null
          notify_new_transactions?: boolean | null
          notify_status_updates?: boolean | null
          payin_fee?: number | null
          payout_fee?: number | null
          payout_key?: string | null
          telegram_chat_id?: string | null
          trade_type?: string | null
          updated_at?: string | null
          user_id: string
          withdrawal_password?: string | null
        }
        Update: {
          account_number?: string
          api_key?: string | null
          balance?: number | null
          callback_url?: string | null
          created_at?: string | null
          frozen_balance?: number | null
          gateway_id?: string | null
          google_2fa_secret?: string | null
          id?: string
          is_2fa_enabled?: boolean | null
          is_active?: boolean | null
          merchant_name?: string
          notify_balance_changes?: boolean | null
          notify_new_transactions?: boolean | null
          notify_status_updates?: boolean | null
          payin_fee?: number | null
          payout_fee?: number | null
          payout_key?: string | null
          telegram_chat_id?: string | null
          trade_type?: string | null
          updated_at?: string | null
          user_id?: string
          withdrawal_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          api_key: string
          app_id: string
          base_url: string
          created_at: string | null
          currency: string
          gateway_code: string
          gateway_name: string
          gateway_type: string
          id: string
          is_active: boolean | null
          payout_key: string | null
          trade_type: string | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          app_id: string
          base_url: string
          created_at?: string | null
          currency: string
          gateway_code: string
          gateway_name: string
          gateway_type: string
          id?: string
          is_active?: boolean | null
          payout_key?: string | null
          trade_type?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          app_id?: string
          base_url?: string
          created_at?: string | null
          currency?: string
          gateway_code?: string
          gateway_name?: string
          gateway_type?: string
          id?: string
          is_active?: boolean | null
          payout_key?: string | null
          trade_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          link_code: string
          merchant_id: string
          trade_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          link_code: string
          merchant_id: string
          trade_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          link_code?: string
          merchant_id?: string
          trade_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          callback_data: Json | null
          created_at: string | null
          extra: string | null
          fee: number | null
          gateway_id: string | null
          id: string
          ifsc_code: string | null
          merchant_id: string
          merchant_order_no: string | null
          net_amount: number | null
          order_no: string
          payment_url: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          usdt_address: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          callback_data?: Json | null
          created_at?: string | null
          extra?: string | null
          fee?: number | null
          gateway_id?: string | null
          id?: string
          ifsc_code?: string | null
          merchant_id: string
          merchant_order_no?: string | null
          net_amount?: number | null
          order_no: string
          payment_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          usdt_address?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          callback_data?: Json | null
          created_at?: string | null
          extra?: string | null
          fee?: number | null
          gateway_id?: string | null
          id?: string
          ifsc_code?: string | null
          merchant_id?: string
          merchant_order_no?: string | null
          net_amount?: number | null
          order_no?: string
          payment_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          usdt_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_account_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "merchant"
      transaction_status: "pending" | "success" | "failed"
      transaction_type: "payin" | "payout"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "merchant"],
      transaction_status: ["pending", "success", "failed"],
      transaction_type: ["payin", "payout"],
    },
  },
} as const
