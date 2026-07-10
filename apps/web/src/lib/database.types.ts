export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      ap_bills: {
        Row: {
          amount: number;
          amount_paid: number;
          bill_date: string | null;
          bill_no: string | null;
          created_at: string;
          due_date: string | null;
          entity: Database['public']['Enums']['operating_entity'];
          id: string;
          memo: string | null;
          purchase_order_id: string | null;
          qbo_bill_id: string | null;
          status: Database['public']['Enums']['ap_bill_status'];
          vendor_id: string;
          vendor_invoice_id: string | null;
        };
        Insert: {
          amount?: number;
          amount_paid?: number;
          bill_date?: string | null;
          bill_no?: string | null;
          created_at?: string;
          due_date?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          id?: string;
          memo?: string | null;
          purchase_order_id?: string | null;
          qbo_bill_id?: string | null;
          status?: Database['public']['Enums']['ap_bill_status'];
          vendor_id: string;
          vendor_invoice_id?: string | null;
        };
        Update: {
          amount?: number;
          amount_paid?: number;
          bill_date?: string | null;
          bill_no?: string | null;
          created_at?: string;
          due_date?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          id?: string;
          memo?: string | null;
          purchase_order_id?: string | null;
          qbo_bill_id?: string | null;
          status?: Database['public']['Enums']['ap_bill_status'];
          vendor_id?: string;
          vendor_invoice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ap_bills_purchase_order_id_fkey';
            columns: ['purchase_order_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ap_bills_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ap_bills_vendor_invoice_id_fkey';
            columns: ['vendor_invoice_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      ap_payment_applications: {
        Row: {
          amount: number;
          bill_id: string;
          id: string;
          payment_id: string;
        };
        Insert: {
          amount: number;
          bill_id: string;
          id?: string;
          payment_id: string;
        };
        Update: {
          amount?: number;
          bill_id?: string;
          id?: string;
          payment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ap_payment_applications_bill_id_fkey';
            columns: ['bill_id'];
            isOneToOne: false;
            referencedRelation: 'ap_bills';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ap_payment_applications_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'ap_payments';
            referencedColumns: ['id'];
          },
        ];
      };
      ap_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          paid_at: string;
          qbo_payment_id: string | null;
          reference: string | null;
          vendor_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          paid_at?: string;
          qbo_payment_id?: string | null;
          reference?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          paid_at?: string;
          qbo_payment_id?: string | null;
          reference?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ap_payments_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
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
          address: string | null;
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
          tier: Database['public']['Enums']['customer_tier'] | null;
        };
        Insert: {
          address?: string | null;
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
          tier?: Database['public']['Enums']['customer_tier'] | null;
        };
        Update: {
          address?: string | null;
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
          tier?: Database['public']['Enums']['customer_tier'] | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          destination_code: string | null;
          id: string;
          kind: Database['public']['Enums']['document_kind'];
          manual_overrides: Json;
          mime_type: string | null;
          original_filename: string;
          parse_error: string | null;
          parse_status: Database['public']['Enums']['parse_status'];
          parsed_payload: Json | null;
          parser_version: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          routing_detected: Database['public']['Enums']['shipment_routing'] | null;
          sha256: string | null;
          shipment_id: string | null;
          storage_path: string;
          vendor_email_id: string | null;
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string;
          destination_code?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['document_kind'];
          manual_overrides?: Json;
          mime_type?: string | null;
          original_filename: string;
          parse_error?: string | null;
          parse_status?: Database['public']['Enums']['parse_status'];
          parsed_payload?: Json | null;
          parser_version?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          routing_detected?: Database['public']['Enums']['shipment_routing'] | null;
          sha256?: string | null;
          shipment_id?: string | null;
          storage_path: string;
          vendor_email_id?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string;
          destination_code?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['document_kind'];
          manual_overrides?: Json;
          mime_type?: string | null;
          original_filename?: string;
          parse_error?: string | null;
          parse_status?: Database['public']['Enums']['parse_status'];
          parsed_payload?: Json | null;
          parser_version?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          routing_detected?: Database['public']['Enums']['shipment_routing'] | null;
          sha256?: string | null;
          shipment_id?: string | null;
          storage_path?: string;
          vendor_email_id?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_shipment_id_fkey';
            columns: ['shipment_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_vendor_email_id_fkey';
            columns: ['vendor_email_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_emails';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
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
      invoice_lines: {
        Row: {
          amount: number | null;
          carton_ref_raw: string | null;
          created_at: string;
          description: string | null;
          grade: string | null;
          id: string;
          invoice_id: string;
          pieces: number | null;
          qbo_billable: boolean;
          source_vendor_invoice_line_id: string | null;
          species: string | null;
          unit_price_lb: number | null;
          weight_lb: number | null;
        };
        Insert: {
          amount?: number | null;
          carton_ref_raw?: string | null;
          created_at?: string;
          description?: string | null;
          grade?: string | null;
          id?: string;
          invoice_id: string;
          pieces?: number | null;
          qbo_billable?: boolean;
          source_vendor_invoice_line_id?: string | null;
          species?: string | null;
          unit_price_lb?: number | null;
          weight_lb?: number | null;
        };
        Update: {
          amount?: number | null;
          carton_ref_raw?: string | null;
          created_at?: string;
          description?: string | null;
          grade?: string | null;
          id?: string;
          invoice_id?: string;
          pieces?: number | null;
          qbo_billable?: boolean;
          source_vendor_invoice_line_id?: string | null;
          species?: string | null;
          unit_price_lb?: number | null;
          weight_lb?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_lines_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoice_lines_source_vendor_invoice_line_id_fkey';
            columns: ['source_vendor_invoice_line_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_invoice_lines';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          amount: number;
          created_at: string;
          customer_id: string | null;
          entity: Database['public']['Enums']['operating_entity'];
          err_msg: string | null;
          id: string;
          invoice_no: string;
          order_id: string | null;
          qbo_ref: string | null;
          shipment_id: string | null;
          source_vendor_invoice_id: string | null;
          status: Database['public']['Enums']['invoice_status'];
          synced_at: string | null;
          terms: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          err_msg?: string | null;
          id?: string;
          invoice_no: string;
          order_id?: string | null;
          qbo_ref?: string | null;
          shipment_id?: string | null;
          source_vendor_invoice_id?: string | null;
          status?: Database['public']['Enums']['invoice_status'];
          synced_at?: string | null;
          terms?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          err_msg?: string | null;
          id?: string;
          invoice_no?: string;
          order_id?: string | null;
          qbo_ref?: string | null;
          shipment_id?: string | null;
          source_vendor_invoice_id?: string | null;
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
          {
            foreignKeyName: 'invoices_shipment_id_fkey';
            columns: ['shipment_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_source_vendor_invoice_id_fkey';
            columns: ['source_vendor_invoice_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_invoices';
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
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          customer_id: string;
          delivery_address: string | null;
          freight_mode: string | null;
          id: string;
          location: string | null;
          ship_date: string | null;
          source: string;
          status: Database['public']['Enums']['order_status'];
        };
        Insert: {
          carrier?: string | null;
          code: string;
          color?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          customer_id: string;
          delivery_address?: string | null;
          freight_mode?: string | null;
          id?: string;
          location?: string | null;
          ship_date?: string | null;
          source?: string;
          status?: Database['public']['Enums']['order_status'];
        };
        Update: {
          carrier?: string | null;
          code?: string;
          color?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          customer_id?: string;
          delivery_address?: string | null;
          freight_mode?: string | null;
          id?: string;
          location?: string | null;
          ship_date?: string | null;
          source?: string;
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
      po_import_batches: {
        Row: {
          created_at: string;
          created_by: string | null;
          direction: string;
          document_id: string | null;
          error: string | null;
          id: string;
          row_count: number | null;
          status: string;
          target: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          direction: string;
          document_id?: string | null;
          error?: string | null;
          id?: string;
          row_count?: number | null;
          status?: string;
          target?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          direction?: string;
          document_id?: string | null;
          error?: string | null;
          id?: string;
          row_count?: number | null;
          status?: string;
          target?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'po_import_batches_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'po_import_batches_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
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
          customer_id: string | null;
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
          customer_id?: string | null;
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
          customer_id?: string | null;
          email?: string;
          id?: string;
          last_seen?: string | null;
          location?: string | null;
          name?: string;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['user_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      purchase_order_lines: {
        Row: {
          amount: number | null;
          box_id: string | null;
          box_numbers: number[] | null;
          box_ref_raw: string | null;
          created_at: string;
          grade: string | null;
          id: string;
          purchase_order_id: string;
          rate_per_lb: number | null;
          sku_code: string | null;
          species: string;
          weight_lb: number | null;
        };
        Insert: {
          amount?: number | null;
          box_id?: string | null;
          box_numbers?: number[] | null;
          box_ref_raw?: string | null;
          created_at?: string;
          grade?: string | null;
          id?: string;
          purchase_order_id: string;
          rate_per_lb?: number | null;
          sku_code?: string | null;
          species: string;
          weight_lb?: number | null;
        };
        Update: {
          amount?: number | null;
          box_id?: string | null;
          box_numbers?: number[] | null;
          box_ref_raw?: string | null;
          created_at?: string;
          grade?: string | null;
          id?: string;
          purchase_order_id?: string;
          rate_per_lb?: number | null;
          sku_code?: string | null;
          species?: string;
          weight_lb?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'purchase_order_lines_box_id_fkey';
            columns: ['box_id'];
            isOneToOne: false;
            referencedRelation: 'boxes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_order_lines_purchase_order_id_fkey';
            columns: ['purchase_order_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_order_lines_sku_code_fkey';
            columns: ['sku_code'];
            isOneToOne: false;
            referencedRelation: 'skus';
            referencedColumns: ['code'];
          },
        ];
      };
      purchase_orders: {
        Row: {
          bill_status: Database['public']['Enums']['po_bill_status'];
          created_at: string;
          customer_id: string | null;
          document_id: string | null;
          entity: Database['public']['Enums']['operating_entity'];
          expected_at: string | null;
          expected_lb: number;
          id: string;
          import_batch_id: string | null;
          lot_id: string | null;
          order_date: string | null;
          order_id: string | null;
          po_number: string;
          qbo_po_id: string | null;
          species: string;
          status: string;
          vendor_id: string;
        };
        Insert: {
          bill_status?: Database['public']['Enums']['po_bill_status'];
          created_at?: string;
          customer_id?: string | null;
          document_id?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          expected_at?: string | null;
          expected_lb?: number;
          id?: string;
          import_batch_id?: string | null;
          lot_id?: string | null;
          order_date?: string | null;
          order_id?: string | null;
          po_number: string;
          qbo_po_id?: string | null;
          species: string;
          status?: string;
          vendor_id: string;
        };
        Update: {
          bill_status?: Database['public']['Enums']['po_bill_status'];
          created_at?: string;
          customer_id?: string | null;
          document_id?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          expected_at?: string | null;
          expected_lb?: number;
          id?: string;
          import_batch_id?: string | null;
          lot_id?: string | null;
          order_date?: string | null;
          order_id?: string | null;
          po_number?: string;
          qbo_po_id?: string | null;
          species?: string;
          status?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'purchase_orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_import_batch_fkey';
            columns: ['import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'po_import_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_lot_id_fkey';
            columns: ['lot_id'];
            isOneToOne: false;
            referencedRelation: 'lots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders_with_fulfillment';
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
      qbo_object_links: {
        Row: {
          error: string | null;
          id: string;
          last_synced_at: string | null;
          local_id: string;
          local_table: string;
          qbo_id: string;
          qbo_type: string;
          sync_status: string;
        };
        Insert: {
          error?: string | null;
          id?: string;
          last_synced_at?: string | null;
          local_id: string;
          local_table: string;
          qbo_id: string;
          qbo_type: string;
          sync_status?: string;
        };
        Update: {
          error?: string | null;
          id?: string;
          last_synced_at?: string | null;
          local_id?: string;
          local_table?: string;
          qbo_id?: string;
          qbo_type?: string;
          sync_status?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          assignable: boolean;
          bg: string;
          color: string;
          created_at: string;
          description: string | null;
          is_system: boolean;
          key: string;
          label: string;
          sort: number;
        };
        Insert: {
          assignable?: boolean;
          bg?: string;
          color?: string;
          created_at?: string;
          description?: string | null;
          is_system?: boolean;
          key: string;
          label: string;
          sort?: number;
        };
        Update: {
          assignable?: boolean;
          bg?: string;
          color?: string;
          created_at?: string;
          description?: string | null;
          is_system?: boolean;
          key?: string;
          label?: string;
          sort?: number;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          arrived_at: string | null;
          awb: string | null;
          commercial_invoice_document_id: string | null;
          created_at: string;
          customer_id: string | null;
          destination_code: string | null;
          entity: Database['public']['Enums']['operating_entity'];
          eta: string | null;
          id: string;
          notes: string | null;
          origin: string | null;
          packing_list_document_id: string | null;
          routing: Database['public']['Enums']['shipment_routing'];
          status: string;
          vendor_id: string;
        };
        Insert: {
          arrived_at?: string | null;
          awb?: string | null;
          commercial_invoice_document_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          destination_code?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          eta?: string | null;
          id?: string;
          notes?: string | null;
          origin?: string | null;
          packing_list_document_id?: string | null;
          routing?: Database['public']['Enums']['shipment_routing'];
          status?: string;
          vendor_id: string;
        };
        Update: {
          arrived_at?: string | null;
          awb?: string | null;
          commercial_invoice_document_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          destination_code?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          eta?: string | null;
          id?: string;
          notes?: string | null;
          origin?: string | null;
          packing_list_document_id?: string | null;
          routing?: Database['public']['Enums']['shipment_routing'];
          status?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shipments_commercial_invoice_document_id_fkey';
            columns: ['commercial_invoice_document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shipments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shipments_packing_list_document_id_fkey';
            columns: ['packing_list_document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shipments_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      sku_entity_codes: {
        Row: {
          code: string;
          default_selling_price: number | null;
          entity: Database['public']['Enums']['operating_entity'];
          id: string;
          qbo_item_id: string | null;
          sku_code: string;
        };
        Insert: {
          code: string;
          default_selling_price?: number | null;
          entity: Database['public']['Enums']['operating_entity'];
          id?: string;
          qbo_item_id?: string | null;
          sku_code: string;
        };
        Update: {
          code?: string;
          default_selling_price?: number | null;
          entity?: Database['public']['Enums']['operating_entity'];
          id?: string;
          qbo_item_id?: string | null;
          sku_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sku_entity_codes_sku_code_fkey';
            columns: ['sku_code'];
            isOneToOne: false;
            referencedRelation: 'skus';
            referencedColumns: ['code'];
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
      vendor_invoice_line_boxes: {
        Row: {
          box_id: string;
          vendor_invoice_line_id: string;
        };
        Insert: {
          box_id: string;
          vendor_invoice_line_id: string;
        };
        Update: {
          box_id?: string;
          vendor_invoice_line_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_invoice_line_boxes_box_id_fkey';
            columns: ['box_id'];
            isOneToOne: false;
            referencedRelation: 'boxes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vendor_invoice_line_boxes_vendor_invoice_line_id_fkey';
            columns: ['vendor_invoice_line_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_invoice_lines';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_invoice_lines: {
        Row: {
          amount: number | null;
          carton_numbers: number[] | null;
          carton_ref_raw: string | null;
          created_at: string;
          description: string | null;
          grade: string | null;
          id: string;
          line_no: number | null;
          manual_overrides: Json;
          pieces: number | null;
          species: string | null;
          unit_price_lb: number | null;
          vendor_invoice_id: string;
          weight_lb: number | null;
        };
        Insert: {
          amount?: number | null;
          carton_numbers?: number[] | null;
          carton_ref_raw?: string | null;
          created_at?: string;
          description?: string | null;
          grade?: string | null;
          id?: string;
          line_no?: number | null;
          manual_overrides?: Json;
          pieces?: number | null;
          species?: string | null;
          unit_price_lb?: number | null;
          vendor_invoice_id: string;
          weight_lb?: number | null;
        };
        Update: {
          amount?: number | null;
          carton_numbers?: number[] | null;
          carton_ref_raw?: string | null;
          created_at?: string;
          description?: string | null;
          grade?: string | null;
          id?: string;
          line_no?: number | null;
          manual_overrides?: Json;
          pieces?: number | null;
          species?: string | null;
          unit_price_lb?: number | null;
          vendor_invoice_id?: string;
          weight_lb?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_invoice_lines_vendor_invoice_id_fkey';
            columns: ['vendor_invoice_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_invoices: {
        Row: {
          awb: string | null;
          created_at: string;
          currency: string;
          document_id: string | null;
          entity: Database['public']['Enums']['operating_entity'];
          id: string;
          invoice_date: string | null;
          invoice_no: string;
          manual_overrides: Json;
          shipment_from: string | null;
          shipment_id: string | null;
          sold_to: string | null;
          status: Database['public']['Enums']['vendor_invoice_status'];
          subtotal: number | null;
          terms: string | null;
          total: number;
          vendor_id: string;
        };
        Insert: {
          awb?: string | null;
          created_at?: string;
          currency?: string;
          document_id?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          id?: string;
          invoice_date?: string | null;
          invoice_no: string;
          manual_overrides?: Json;
          shipment_from?: string | null;
          shipment_id?: string | null;
          sold_to?: string | null;
          status?: Database['public']['Enums']['vendor_invoice_status'];
          subtotal?: number | null;
          terms?: string | null;
          total?: number;
          vendor_id: string;
        };
        Update: {
          awb?: string | null;
          created_at?: string;
          currency?: string;
          document_id?: string | null;
          entity?: Database['public']['Enums']['operating_entity'];
          id?: string;
          invoice_date?: string | null;
          invoice_no?: string;
          manual_overrides?: Json;
          shipment_from?: string | null;
          shipment_id?: string | null;
          sold_to?: string | null;
          status?: Database['public']['Enums']['vendor_invoice_status'];
          subtotal?: number | null;
          terms?: string | null;
          total?: number;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_invoices_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vendor_invoices_shipment_id_fkey';
            columns: ['shipment_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vendor_invoices_vendor_id_fkey';
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
          box_type_col: string | null;
          created_at: string;
          doc_type: Database['public']['Enums']['document_kind'];
          grade_col: string | null;
          ice_col: string | null;
          id: string;
          net_kg_col: string | null;
          pieces_col: string | null;
          species_col: string;
          uom: string;
          vendor_id: string;
          weight_col: string;
        };
        Insert: {
          box_col: string;
          box_type_col?: string | null;
          created_at?: string;
          doc_type?: Database['public']['Enums']['document_kind'];
          grade_col?: string | null;
          ice_col?: string | null;
          id?: string;
          net_kg_col?: string | null;
          pieces_col?: string | null;
          species_col: string;
          uom?: string;
          vendor_id: string;
          weight_col: string;
        };
        Update: {
          box_col?: string;
          box_type_col?: string | null;
          created_at?: string;
          doc_type?: Database['public']['Enums']['document_kind'];
          grade_col?: string | null;
          ice_col?: string | null;
          id?: string;
          net_kg_col?: string | null;
          pieces_col?: string | null;
          species_col?: string;
          uom?: string;
          vendor_id?: string;
          weight_col?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_mappings_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
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
      ap_aging: {
        Row: {
          current_due: number | null;
          d1_30: number | null;
          d31_60: number | null;
          d61_90: number | null;
          d90_plus: number | null;
          entity: Database['public']['Enums']['operating_entity'] | null;
          total_open: number | null;
          vendor: string | null;
          vendor_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ap_bills_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
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
      add_role: {
        Args: {
          p_bg?: string;
          p_color?: string;
          p_description?: string;
          p_key: string;
          p_label: string;
        };
        Returns: {
          assignable: boolean;
          bg: string;
          color: string;
          created_at: string;
          description: string | null;
          is_system: boolean;
          key: string;
          label: string;
          sort: number;
        };
        SetofOptions: {
          from: '*';
          to: 'roles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      app_customer_id: { Args: never; Returns: string };
      app_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      lock_board: { Args: { p_location: string }; Returns: Json };
      unlock_board: { Args: { p_location: string }; Returns: Json };
    };
    Enums: {
      ap_bill_status: 'draft' | 'pending_sync' | 'synced' | 'partially_paid' | 'paid' | 'void';
      box_part: 'A' | 'B';
      claim_status: 'open' | 'approved' | 'countered' | 'rejected';
      customer_status: 'active' | 'inactive';
      customer_tier: 'T1' | 'T2' | 'T3';
      document_kind:
        | 'commercial_invoice'
        | 'packing_list'
        | 'vendor_statement'
        | 'po_import'
        | 'other';
      downgrade_status: 'pending' | 'applied' | 'disputed';
      freight_mode: 'trucker' | 'air' | 'customer_pickup';
      integration_provider: 'qbo' | 'gmail';
      invoice_status: 'pending' | 'failed' | 'synced';
      lot_status: 'incoming' | 'received' | 'available' | 'allocated' | 'shipped';
      notif_type: 'shortage' | 'sync' | 'approval' | 'credit' | 'receiving' | 'shipment';
      operating_entity: 'MANA' | 'EOF';
      order_status: 'open' | 'allocated' | 'locked' | 'shipped' | 'invoiced';
      parse_status: 'pending' | 'parsed' | 'needs_review' | 'posted';
      po_bill_status: 'not_billed' | 'partially_billed' | 'billed';
      shipment_routing: 'warehouse' | 'direct';
      statement_status: 'draft' | 'sent' | 'countered' | 'settled';
      user_role: 'admin' | 'operations' | 'finance' | 'sales' | 'logistics' | 'viewer' | 'customer';
      user_status: 'active' | 'invited' | 'inactive';
      vendor_invoice_status: 'draft' | 'parsed' | 'needs_review' | 'approved' | 'billed' | 'void';
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
      ap_bill_status: ['draft', 'pending_sync', 'synced', 'partially_paid', 'paid', 'void'],
      box_part: ['A', 'B'],
      claim_status: ['open', 'approved', 'countered', 'rejected'],
      customer_status: ['active', 'inactive'],
      customer_tier: ['T1', 'T2', 'T3'],
      document_kind: [
        'commercial_invoice',
        'packing_list',
        'vendor_statement',
        'po_import',
        'other',
      ],
      downgrade_status: ['pending', 'applied', 'disputed'],
      freight_mode: ['trucker', 'air', 'customer_pickup'],
      integration_provider: ['qbo', 'gmail'],
      invoice_status: ['pending', 'failed', 'synced'],
      lot_status: ['incoming', 'received', 'available', 'allocated', 'shipped'],
      notif_type: ['shortage', 'sync', 'approval', 'credit', 'receiving', 'shipment'],
      operating_entity: ['MANA', 'EOF'],
      order_status: ['open', 'allocated', 'locked', 'shipped', 'invoiced'],
      parse_status: ['pending', 'parsed', 'needs_review', 'posted'],
      po_bill_status: ['not_billed', 'partially_billed', 'billed'],
      shipment_routing: ['warehouse', 'direct'],
      statement_status: ['draft', 'sent', 'countered', 'settled'],
      user_role: ['admin', 'operations', 'finance', 'sales', 'logistics', 'viewer', 'customer'],
      user_status: ['active', 'invited', 'inactive'],
      vendor_invoice_status: ['draft', 'parsed', 'needs_review', 'approved', 'billed', 'void'],
    },
  },
} as const;
