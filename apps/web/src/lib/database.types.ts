export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity: string | null;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      board_locks: {
        Row: {
          active: boolean;
          id: string;
          location: string;
          locked_at: string;
          locked_by: string | null;
          snapshot: Json | null;
        };
        Insert: {
          active?: boolean;
          id?: string;
          location: string;
          locked_at?: string;
          locked_by?: string | null;
          snapshot?: Json | null;
        };
        Update: {
          active?: boolean;
          id?: string;
          location?: string;
          locked_at?: string;
          locked_by?: string | null;
          snapshot?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'board_locks_locked_by_fkey';
            columns: ['locked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      box_contents: {
        Row: {
          assigned_order_line_id: string | null;
          box_id: string;
          created_at: string;
          grade: string | null;
          id: string;
          lock_initial: string | null;
          locked: boolean;
          part: Database['public']['Enums']['box_part'] | null;
          species: string;
          split_group: string | null;
          weight: number;
        };
        Insert: {
          assigned_order_line_id?: string | null;
          box_id: string;
          created_at?: string;
          grade?: string | null;
          id?: string;
          lock_initial?: string | null;
          locked?: boolean;
          part?: Database['public']['Enums']['box_part'] | null;
          species: string;
          split_group?: string | null;
          weight: number;
        };
        Update: {
          assigned_order_line_id?: string | null;
          box_id?: string;
          created_at?: string;
          grade?: string | null;
          id?: string;
          lock_initial?: string | null;
          locked?: boolean;
          part?: Database['public']['Enums']['box_part'] | null;
          species?: string;
          split_group?: string | null;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'box_contents_assigned_order_line_id_fkey';
            columns: ['assigned_order_line_id'];
            isOneToOne: false;
            referencedRelation: 'order_lines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'box_contents_assigned_order_line_id_fkey';
            columns: ['assigned_order_line_id'];
            isOneToOne: false;
            referencedRelation: 'order_lines_with_fulfillment';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'box_contents_box_id_fkey';
            columns: ['box_id'];
            isOneToOne: false;
            referencedRelation: 'boxes';
            referencedColumns: ['id'];
          },
        ];
      };
      boxes: {
        Row: {
          created_at: string;
          id: string;
          idx: number | null;
          label: string;
          lot_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          idx?: number | null;
          label: string;
          lot_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          idx?: number | null;
          label?: string;
          lot_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'boxes_lot_id_fkey';
            columns: ['lot_id'];
            isOneToOne: false;
            referencedRelation: 'lots';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_claims: {
        Row: {
          amount: number;
          boxes: string | null;
          claimed_by: string | null;
          counter_amount: number | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          lot: string | null;
          lot_id: string | null;
          order_id: string | null;
          qbo_ref: string | null;
          reason: string | null;
          resolved_note: string | null;
          sales_rep: string | null;
          species: string | null;
          status: Database['public']['Enums']['claim_status'];
          vendor_id: string | null;
        };
        Insert: {
          amount?: number;
          boxes?: string | null;
          claimed_by?: string | null;
          counter_amount?: number | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          lot?: string | null;
          lot_id?: string | null;
          order_id?: string | null;
          qbo_ref?: string | null;
          reason?: string | null;
          resolved_note?: string | null;
          sales_rep?: string | null;
          species?: string | null;
          status?: Database['public']['Enums']['claim_status'];
          vendor_id?: string | null;
        };
        Update: {
          amount?: number;
          boxes?: string | null;
          claimed_by?: string | null;
          counter_amount?: number | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          lot?: string | null;
          lot_id?: string | null;
          order_id?: string | null;
          qbo_ref?: string | null;
          reason?: string | null;
          resolved_note?: string | null;
          sales_rep?: string | null;
          species?: string | null;
          status?: Database['public']['Enums']['claim_status'];
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_claims_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_claims_lot_id_fkey';
            columns: ['lot_id'];
            isOneToOne: false;
            referencedRelation: 'lots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_claims_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_claims_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders_with_fulfillment';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_claims_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          channel_pref: string | null;
          contact: string | null;
          created_at: string;
          default_carrier: string | null;
          email: string | null;
          id: string;
          location: string | null;
          name: string;
          phone: string | null;
          qbo_customer_id: string | null;
          standing_order: string | null;
          status: Database['public']['Enums']['customer_status'];
          terms: string | null;
          tier: Database['public']['Enums']['customer_tier'];
        };
        Insert: {
          channel_pref?: string | null;
          contact?: string | null;
          created_at?: string;
          default_carrier?: string | null;
          email?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          phone?: string | null;
          qbo_customer_id?: string | null;
          standing_order?: string | null;
          status?: Database['public']['Enums']['customer_status'];
          terms?: string | null;
          tier?: Database['public']['Enums']['customer_tier'];
        };
        Update: {
          channel_pref?: string | null;
          contact?: string | null;
          created_at?: string;
          default_carrier?: string | null;
          email?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          phone?: string | null;
          qbo_customer_id?: string | null;
          standing_order?: string | null;
          status?: Database['public']['Enums']['customer_status'];
          terms?: string | null;
          tier?: Database['public']['Enums']['customer_tier'];
        };
        Relationships: [];
      };
      downgrades: {
        Row: {
          box: string | null;
          box_content_id: string | null;
          box_id: string | null;
          created_at: string;
          from_grade: string | null;
          id: string;
          impact: number | null;
          lot_id: string | null;
          reason: string | null;
          species: string | null;
          status: Database['public']['Enums']['downgrade_status'];
          to_grade: string | null;
          vendor_id: string | null;
          weight_lb: number | null;
        };
        Insert: {
          box?: string | null;
          box_content_id?: string | null;
          box_id?: string | null;
          created_at?: string;
          from_grade?: string | null;
          id?: string;
          impact?: number | null;
          lot_id?: string | null;
          reason?: string | null;
          species?: string | null;
          status?: Database['public']['Enums']['downgrade_status'];
          to_grade?: string | null;
          vendor_id?: string | null;
          weight_lb?: number | null;
        };
        Update: {
          box?: string | null;
          box_content_id?: string | null;
          box_id?: string | null;
          created_at?: string;
          from_grade?: string | null;
          id?: string;
          impact?: number | null;
          lot_id?: string | null;
          reason?: string | null;
          species?: string | null;
          status?: Database['public']['Enums']['downgrade_status'];
          to_grade?: string | null;
          vendor_id?: string | null;
          weight_lb?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'downgrades_box_content_id_fkey';
            columns: ['box_content_id'];
            isOneToOne: false;
            referencedRelation: 'box_contents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'downgrades_box_id_fkey';
            columns: ['box_id'];
            isOneToOne: false;
            referencedRelation: 'boxes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'downgrades_lot_id_fkey';
            columns: ['lot_id'];
            isOneToOne: false;
            referencedRelation: 'lots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'downgrades_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      integration_tokens: {
        Row: {
          access_token: string | null;
          expires_at: string | null;
          id: string;
          provider: Database['public']['Enums']['integration_provider'];
          realm_id: string | null;
          refresh_token: string | null;
          updated_at: string;
        };
        Insert: {
          access_token?: string | null;
          expires_at?: string | null;
          id?: string;
          provider: Database['public']['Enums']['integration_provider'];
          realm_id?: string | null;
          refresh_token?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string | null;
          expires_at?: string | null;
          id?: string;
          provider?: Database['public']['Enums']['integration_provider'];
          realm_id?: string | null;
          refresh_token?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          amount: number;
          created_at: string;
          customer_id: string | null;
          err_msg: string | null;
          id: string;
          invoice_no: string;
          order_id: string | null;
          qbo_ref: string | null;
          status: Database['public']['Enums']['invoice_status'];
          synced_at: string | null;
          terms: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          err_msg?: string | null;
          id?: string;
          invoice_no: string;
          order_id?: string | null;
          qbo_ref?: string | null;
          status?: Database['public']['Enums']['invoice_status'];
          synced_at?: string | null;
          terms?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          err_msg?: string | null;
          id?: string;
          invoice_no?: string;
          order_id?: string | null;
          qbo_ref?: string | null;
          status?: Database['public']['Enums']['invoice_status'];
          synced_at?: string | null;
          terms?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders_with_fulfillment';
            referencedColumns: ['id'];
          },
        ];
      };
      lots: {
        Row: {
          created_at: string;
          id: string;
          location: string | null;
          lot_code: string;
          received_at: string | null;
          status: Database['public']['Enums']['lot_status'];
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location?: string | null;
          lot_code: string;
          received_at?: string | null;
          status?: Database['public']['Enums']['lot_status'];
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string | null;
          lot_code?: string;
          received_at?: string | null;
          status?: Database['public']['Enums']['lot_status'];
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lots_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_prefs: {
        Row: {
          email: boolean;
          id: string;
          in_app: boolean;
          sms: boolean;
          type: Database['public']['Enums']['notif_type'];
          user_id: string;
        };
        Insert: {
          email?: boolean;
          id?: string;
          in_app?: boolean;
          sms?: boolean;
          type: Database['public']['Enums']['notif_type'];
          user_id: string;
        };
        Update: {
          email?: boolean;
          id?: string;
          in_app?: boolean;
          sms?: boolean;
          type?: Database['public']['Enums']['notif_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_prefs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read: boolean;
          type: Database['public']['Enums']['notif_type'];
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read?: boolean;
          type: Database['public']['Enums']['notif_type'];
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read?: boolean;
          type?: Database['public']['Enums']['notif_type'];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      order_lines: {
        Row: {
          created_at: string;
          grade: string | null;
          id: string;
          order_id: string;
          species: string;
          target_weight: number;
          unit_price: number | null;
        };
        Insert: {
          created_at?: string;
          grade?: string | null;
          id?: string;
          order_id: string;
          species: string;
          target_weight?: number;
          unit_price?: number | null;
        };
        Update: {
          created_at?: string;
          grade?: string | null;
          id?: string;
          order_id?: string;
          species?: string;
          target_weight?: number;
          unit_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_lines_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_lines_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders_with_fulfillment';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          carrier: string | null;
          code: string;
          color: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          location: string | null;
          ship_date: string | null;
          status: Database['public']['Enums']['order_status'];
        };
        Insert: {
          carrier?: string | null;
          code: string;
          color?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          location?: string | null;
          ship_date?: string | null;
          status?: Database['public']['Enums']['order_status'];
        };
        Update: {
          carrier?: string | null;
          code?: string;
          color?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          location?: string | null;
          ship_date?: string | null;
          status?: Database['public']['Enums']['order_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      pick_slips: {
        Row: {
          box_refs: Json | null;
          generated_at: string;
          id: string;
          order_id: string;
          pdf_url: string | null;
          slip_no: string;
        };
        Insert: {
          box_refs?: Json | null;
          generated_at?: string;
          id?: string;
          order_id: string;
          pdf_url?: string | null;
          slip_no: string;
        };
        Update: {
          box_refs?: Json | null;
          generated_at?: string;
          id?: string;
          order_id?: string;
          pdf_url?: string | null;
          slip_no?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_slips_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_slips_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders_with_fulfillment';
            referencedColumns: ['id'];
          },
        ];
      };
      price_overrides: {
        Row: {
          created_at: string;
          customer_id: string;
          effective_from: string | null;
          id: string;
          price: number;
          sku: string;
          species: string | null;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          effective_from?: string | null;
          id?: string;
          price: number;
          sku: string;
          species?: string | null;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          effective_from?: string | null;
          id?: string;
          price?: number;
          sku?: string;
          species?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'price_overrides_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_overrides_sku_fkey';
            columns: ['sku'];
            isOneToOne: false;
            referencedRelation: 'skus';
            referencedColumns: ['code'];
          },
        ];
      };
      pricing_tiers: {
        Row: {
          base_multiplier: number;
          created_at: string;
          label: string;
          terms: string | null;
          tier: string;
        };
        Insert: {
          base_multiplier?: number;
          created_at?: string;
          label: string;
          terms?: string | null;
          tier: string;
        };
        Update: {
          base_multiplier?: number;
          created_at?: string;
          label?: string;
          terms?: string | null;
          tier?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          last_seen: string | null;
          location: string | null;
          name: string;
          role: Database['public']['Enums']['user_role'];
          status: Database['public']['Enums']['user_status'];
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          last_seen?: string | null;
          location?: string | null;
          name?: string;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['user_status'];
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          last_seen?: string | null;
          location?: string | null;
          name?: string;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['user_status'];
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          created_at: string;
          expected_at: string | null;
          expected_lb: number;
          id: string;
          lot_id: string | null;
          po_number: string;
          species: string;
          status: string;
          vendor_id: string;
        };
        Insert: {
          created_at?: string;
          expected_at?: string | null;
          expected_lb?: number;
          id?: string;
          lot_id?: string | null;
          po_number: string;
          species: string;
          status?: string;
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          expected_at?: string | null;
          expected_lb?: number;
          id?: string;
          lot_id?: string | null;
          po_number?: string;
          species?: string;
          status?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'purchase_orders_lot_id_fkey';
            columns: ['lot_id'];
            isOneToOne: false;
            referencedRelation: 'lots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      skus: {
        Row: {
          active: boolean;
          base_price_lb: number | null;
          code: string;
          created_at: string;
          description: string | null;
          grade: string | null;
          pack_type: string | null;
          qbo_item: string | null;
          species: string;
          uom: string | null;
        };
        Insert: {
          active?: boolean;
          base_price_lb?: number | null;
          code: string;
          created_at?: string;
          description?: string | null;
          grade?: string | null;
          pack_type?: string | null;
          qbo_item?: string | null;
          species: string;
          uom?: string | null;
        };
        Update: {
          active?: boolean;
          base_price_lb?: number | null;
          code?: string;
          created_at?: string;
          description?: string | null;
          grade?: string | null;
          pack_type?: string | null;
          qbo_item?: string | null;
          species?: string;
          uom?: string | null;
        };
        Relationships: [];
      };
      tier_species_prices: {
        Row: {
          id: string;
          price_lb: number;
          sku_code: string;
          tier: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          price_lb: number;
          sku_code: string;
          tier: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          price_lb?: number;
          sku_code?: string;
          tier?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tier_species_prices_sku_code_fkey';
            columns: ['sku_code'];
            isOneToOne: false;
            referencedRelation: 'skus';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'tier_species_prices_tier_fkey';
            columns: ['tier'];
            isOneToOne: false;
            referencedRelation: 'pricing_tiers';
            referencedColumns: ['tier'];
          },
        ];
      };
      roles: {
        Row: {
          key: string;
          label: string;
          description: string | null;
          color: string;
          bg: string;
          sort: number;
          is_system: boolean;
          assignable: boolean;
          created_at: string;
        };
        Insert: {
          key: string;
          label: string;
          description?: string | null;
          color?: string;
          bg?: string;
          sort?: number;
          is_system?: boolean;
          assignable?: boolean;
          created_at?: string;
        };
        Update: {
          key?: string;
          label?: string;
          description?: string | null;
          color?: string;
          bg?: string;
          sort?: number;
          is_system?: boolean;
          assignable?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      standing_orders: {
        Row: {
          active: boolean;
          cadence: string;
          created_at: string;
          customer_id: string;
          grade: string | null;
          id: string;
          quantity_lb: number;
          species: string;
        };
        Insert: {
          active?: boolean;
          cadence: string;
          created_at?: string;
          customer_id: string;
          grade?: string | null;
          id?: string;
          quantity_lb: number;
          species: string;
        };
        Update: {
          active?: boolean;
          cadence?: string;
          created_at?: string;
          customer_id?: string;
          grade?: string | null;
          id?: string;
          quantity_lb?: number;
          species?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'standing_orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      statement_lines: {
        Row: {
          amount: number;
          description: string | null;
          id: string;
          statement_id: string;
          type: string | null;
        };
        Insert: {
          amount?: number;
          description?: string | null;
          id?: string;
          statement_id: string;
          type?: string | null;
        };
        Update: {
          amount?: number;
          description?: string | null;
          id?: string;
          statement_id?: string;
          type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'statement_lines_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_statements';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_emails: {
        Row: {
          attachment_urls: Json | null;
          created_at: string;
          gmail_message_id: string | null;
          id: string;
          parse_status: Database['public']['Enums']['parse_status'];
          raw_body: string | null;
          received_at: string | null;
          subject: string | null;
          vendor_id: string | null;
        };
        Insert: {
          attachment_urls?: Json | null;
          created_at?: string;
          gmail_message_id?: string | null;
          id?: string;
          parse_status?: Database['public']['Enums']['parse_status'];
          raw_body?: string | null;
          received_at?: string | null;
          subject?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          attachment_urls?: Json | null;
          created_at?: string;
          gmail_message_id?: string | null;
          id?: string;
          parse_status?: Database['public']['Enums']['parse_status'];
          raw_body?: string | null;
          received_at?: string | null;
          subject?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_emails_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_mappings: {
        Row: {
          box_col: string;
          created_at: string;
          grade_col: string | null;
          id: string;
          species_col: string;
          uom: string;
          vendor_id: string;
          weight_col: string;
        };
        Insert: {
          box_col: string;
          created_at?: string;
          grade_col?: string | null;
          id?: string;
          species_col: string;
          uom?: string;
          vendor_id: string;
          weight_col: string;
        };
        Update: {
          box_col?: string;
          created_at?: string;
          grade_col?: string | null;
          id?: string;
          species_col?: string;
          uom?: string;
          vendor_id?: string;
          weight_col?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_mappings_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: true;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_species_codes: {
        Row: {
          code: string;
          id: string;
          species: string;
          vendor_id: string;
        };
        Insert: {
          code: string;
          id?: string;
          species: string;
          vendor_id: string;
        };
        Update: {
          code?: string;
          id?: string;
          species?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_species_codes_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_statements: {
        Row: {
          created_at: string;
          id: string;
          net_due: number;
          period: string | null;
          sent_at: string | null;
          settled_at: string | null;
          status: Database['public']['Enums']['statement_status'];
          vendor_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          net_due?: number;
          period?: string | null;
          sent_at?: string | null;
          settled_at?: string | null;
          status?: Database['public']['Enums']['statement_status'];
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          net_due?: number;
          period?: string | null;
          sent_at?: string | null;
          settled_at?: string | null;
          status?: Database['public']['Enums']['statement_status'];
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_statements_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      vendors: {
        Row: {
          code: string;
          contact_email: string | null;
          created_at: string;
          id: string;
          name: string;
          terms: string | null;
        };
        Insert: {
          code: string;
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          terms?: string | null;
        };
        Update: {
          code?: string;
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          terms?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      availability_by_species: {
        Row: {
          allocated_lb: number | null;
          available_lb: number | null;
          incoming_lb: number | null;
          location: string | null;
          species: string | null;
        };
        Relationships: [];
      };
      order_lines_with_fulfillment: {
        Row: {
          created_at: string | null;
          customer: string | null;
          fulfilled_pct: number | null;
          fulfilled_weight: number | null;
          grade: string | null;
          id: string | null;
          location: string | null;
          order_code: string | null;
          order_id: string | null;
          order_status: Database['public']['Enums']['order_status'] | null;
          species: string | null;
          target_weight: number | null;
          tier: Database['public']['Enums']['customer_tier'] | null;
          unit_price: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_lines_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_lines_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders_with_fulfillment';
            referencedColumns: ['id'];
          },
        ];
      };
      orders_with_fulfillment: {
        Row: {
          carrier: string | null;
          code: string | null;
          color: string | null;
          created_at: string | null;
          customer: string | null;
          customer_id: string | null;
          fulfilled_weight: number | null;
          id: string | null;
          line_count: number | null;
          lines_full: number | null;
          location: string | null;
          ship_date: string | null;
          status: Database['public']['Enums']['order_status'] | null;
          target_weight: number | null;
          tier: Database['public']['Enums']['customer_tier'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      app_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      lock_board: { Args: { p_location: string }; Returns: Json };
      unlock_board: { Args: { p_location: string }; Returns: Json };
      add_role: {
        Args: {
          p_key: string;
          p_label: string;
          p_description?: string;
          p_color?: string;
          p_bg?: string;
        };
        Returns: Database['public']['Tables']['roles']['Row'];
      };
    };
    Enums: {
      box_part: 'A' | 'B';
      claim_status: 'open' | 'approved' | 'countered' | 'rejected';
      customer_status: 'active' | 'inactive';
      customer_tier: 'T1' | 'T2' | 'T3';
      downgrade_status: 'pending' | 'applied' | 'disputed';
      integration_provider: 'qbo' | 'gmail';
      invoice_status: 'pending' | 'failed' | 'synced';
      lot_status: 'incoming' | 'received' | 'available' | 'allocated' | 'shipped';
      notif_type: 'shortage' | 'sync' | 'approval' | 'credit' | 'receiving' | 'shipment';
      order_status: 'open' | 'allocated' | 'locked' | 'shipped' | 'invoiced';
      parse_status: 'pending' | 'parsed' | 'needs_review' | 'posted';
      statement_status: 'draft' | 'sent' | 'countered' | 'settled';
      user_role: 'admin' | 'operations' | 'finance' | 'sales' | 'logistics' | 'viewer';
      user_status: 'active' | 'invited' | 'inactive';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      box_part: ['A', 'B'],
      claim_status: ['open', 'approved', 'countered', 'rejected'],
      customer_status: ['active', 'inactive'],
      customer_tier: ['T1', 'T2', 'T3'],
      downgrade_status: ['pending', 'applied', 'disputed'],
      integration_provider: ['qbo', 'gmail'],
      invoice_status: ['pending', 'failed', 'synced'],
      lot_status: ['incoming', 'received', 'available', 'allocated', 'shipped'],
      notif_type: ['shortage', 'sync', 'approval', 'credit', 'receiving', 'shipment'],
      order_status: ['open', 'allocated', 'locked', 'shipped', 'invoiced'],
      parse_status: ['pending', 'parsed', 'needs_review', 'posted'],
      statement_status: ['draft', 'sent', 'countered', 'settled'],
      user_role: ['admin', 'operations', 'finance', 'sales', 'logistics', 'viewer'],
      user_status: ['active', 'invited', 'inactive'],
    },
  },
} as const;
