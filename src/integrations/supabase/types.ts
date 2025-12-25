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
      debts: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          is_archived: boolean | null
          is_paid: boolean | null
          paid_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          is_archived?: boolean | null
          is_paid?: boolean | null
          paid_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          is_archived?: boolean | null
          is_paid?: boolean | null
          paid_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          profit_amount: number | null
          related_entity: Database["public"]["Enums"]["related_entity_type"]
          related_entity_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          profit_amount?: number | null
          related_entity: Database["public"]["Enums"]["related_entity_type"]
          related_entity_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          profit_amount?: number | null
          related_entity?: Database["public"]["Enums"]["related_entity_type"]
          related_entity_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixed_number_transfers: {
        Row: {
          amount: number
          created_at: string
          fixed_number_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fixed_number_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fixed_number_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_number_transfers_fixed_number_id_fkey"
            columns: ["fixed_number_id"]
            isOneToOne: false
            referencedRelation: "fixed_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_numbers: {
        Row: {
          created_at: string | null
          id: string
          is_disabled: boolean | null
          monthly_limit: number | null
          name: string
          phone_number: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_disabled?: boolean | null
          monthly_limit?: number | null
          name: string
          phone_number?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_disabled?: boolean | null
          monthly_limit?: number | null
          name?: string
          phone_number?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          name: string
          profit_per_unit: number | null
          quantity: number | null
          unit_type: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          profit_per_unit?: number | null
          quantity?: number | null
          unit_type?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          profit_per_unit?: number | null
          quantity?: number | null
          unit_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          item_id: string
          profit: number | null
          quantity_change: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          item_id: string
          profit?: number | null
          quantity_change: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          item_id?: string
          profit?: number | null
          quantity_change?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      profits: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          profit_per_unit: number | null
          quantity: number | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["profit_source_type"]
          transaction_id: string | null
          unit_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          profit_per_unit?: number | null
          quantity?: number | null
          source_id?: string | null
          source_type: Database["public"]["Enums"]["profit_source_type"]
          transaction_id?: string | null
          unit_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          profit_per_unit?: number | null
          quantity?: number | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["profit_source_type"]
          transaction_id?: string | null
          unit_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      record_history: {
        Row: {
          action: Database["public"]["Enums"]["record_action"]
          changes: Json
          created_at: string
          id: string
          previous_values: Json | null
          reason: string | null
          record_id: string
          record_type: Database["public"]["Enums"]["record_type"]
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["record_action"]
          changes?: Json
          created_at?: string
          id?: string
          previous_values?: Json | null
          reason?: string | null
          record_id: string
          record_type: Database["public"]["Enums"]["record_type"]
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["record_action"]
          changes?: Json
          created_at?: string
          id?: string
          previous_values?: Json | null
          reason?: string | null
          record_id?: string
          record_type?: Database["public"]["Enums"]["record_type"]
          user_id?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          amount: number
          created_at: string | null
          fixed_number_id: string | null
          id: string
          is_archived: boolean | null
          notes: string | null
          profit: number | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fixed_number_id?: string | null
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          profit?: number | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fixed_number_id?: string | null
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          profit?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_fixed_number_id_fkey"
            columns: ["fixed_number_id"]
            isOneToOne: false
            referencedRelation: "fixed_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ledger_entries: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string | null
          profit: number | null
          record_type: Database["public"]["Enums"]["record_type"] | null
          related_entity_id: string | null
          related_entity_name: string | null
          related_entity_type: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          sub_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_capital_balance: { Args: { _user_id: string }; Returns: number }
      get_daily_profit: {
        Args: { _date?: string; _user_id: string }
        Returns: number
      }
      get_financial_summary: {
        Args: { _user_id: string }
        Returns: {
          capital_balance: number
          total_debt_given: number
          total_debt_received: number
          total_expense: number
          total_income: number
          total_profit: number
        }[]
      }
      get_fixed_number_monthly_usage: {
        Args: { _fixed_number_id: string; _user_id: string }
        Returns: number
      }
      get_profit_by_date_range: {
        Args: { _end_date: string; _start_date: string; _user_id: string }
        Returns: {
          inventory_amount: number
          profit_date: string
          total_amount: number
          transfer_amount: number
        }[]
      }
      get_profit_by_source: {
        Args: {
          _source_type: Database["public"]["Enums"]["profit_source_type"]
          _user_id: string
        }
        Returns: number
      }
      get_profit_summary: {
        Args: { _user_id: string }
        Returns: {
          inventory_profit: number
          today_profit: number
          total_profit: number
          transfer_profit: number
        }[]
      }
      get_record_history: {
        Args: { _record_id: string; _user_id: string }
        Returns: {
          action: Database["public"]["Enums"]["record_action"]
          changes: Json
          created_at: string
          id: string
          previous_values: Json
          reason: string
        }[]
      }
      get_total_profit: { Args: { _user_id: string }; Returns: number }
      get_user_total_profit: { Args: { _user_id: string }; Returns: number }
      log_record_change: {
        Args: {
          _action: Database["public"]["Enums"]["record_action"]
          _changes?: Json
          _previous_values?: Json
          _reason?: string
          _record_id: string
          _record_type: Database["public"]["Enums"]["record_type"]
          _user_id: string
        }
        Returns: string
      }
      reverse_debt: {
        Args: { _debt_id: string; _reason?: string; _user_id: string }
        Returns: boolean
      }
      reverse_transfer: {
        Args: { _reason?: string; _transfer_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      profit_source_type: "inventory_sale" | "cash_transfer"
      record_action: "create" | "update" | "reverse" | "delete"
      record_status: "active" | "reversed" | "deleted"
      record_type:
        | "transfer"
        | "inventory_sale"
        | "inventory_add"
        | "debt"
        | "debt_payment"
        | "fixed_number_transfer"
      related_entity_type:
        | "cash_transfer"
        | "inventory_sale"
        | "debt"
        | "phone_number"
      transaction_status: "pending" | "confirmed" | "failed" | "reversed"
      transaction_type:
        | "income"
        | "expense"
        | "profit"
        | "debt"
        | "debt_payment"
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
      profit_source_type: ["inventory_sale", "cash_transfer"],
      record_action: ["create", "update", "reverse", "delete"],
      record_status: ["active", "reversed", "deleted"],
      record_type: [
        "transfer",
        "inventory_sale",
        "inventory_add",
        "debt",
        "debt_payment",
        "fixed_number_transfer",
      ],
      related_entity_type: [
        "cash_transfer",
        "inventory_sale",
        "debt",
        "phone_number",
      ],
      transaction_status: ["pending", "confirmed", "failed", "reversed"],
      transaction_type: ["income", "expense", "profit", "debt", "debt_payment"],
    },
  },
} as const
