// Minimal Database type — we only type the textos_* tables we own.
// Generated-style shape so supabase-js can carry through typing on selects.

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Semaphore = "green" | "amber" | "red";

// Supabase-js v2.103 expects each Tables entry to expose `Relationships`.
// Rather than repeat `Relationships: []` on every table we map them once.
type WithRelationships<T> = { [K in keyof T]: T[K] & { Relationships: [] } };

type _Tables = {
      textos_orgs: {
        Row: {
          id: string;
          owner_user_id: string | null;
          name: string;
          logo_url: string | null;
          industry: string | null;
          owner_display_name: string | null;
          tagline: string | null;
          tone: string;
          timezone: string;
          languages: string[];
          never_promise: string[];
          must_escalate: string[];
          business_hours: Json;
          threshold_auto: number;
          threshold_suggest: number;
          shadow_mode: boolean;
          demo: boolean;
          onboarding_completed: boolean;
          onboarding_data: Json;
          coverage_estimate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_orgs"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["textos_orgs"]["Row"]>;
      };
      textos_contacts: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          channel: string | null;
          stage: string;
          tags: string[];
          value: number;
          source: string | null;
          owner_user_id: string | null;
          last_interaction_at: string | null;
          notes: string | null;
          custom: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_contacts"]["Row"]> & { org_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["textos_contacts"]["Row"]>;
      };
      textos_conversations: {
        Row: {
          id: string;
          org_id: string;
          contact_id: string;
          channel: string | null;
          last_message: string | null;
          last_message_at: string | null;
          unread_count: number;
          semaphore: Semaphore;
          ai_mode: "auto" | "suggest" | "off";
          assigned_to: string | null;
          status: "open" | "closed" | "snoozed";
          snooze_until: string | null;
          current_flow_node: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_conversations"]["Row"]> & { org_id: string; contact_id: string };
        Update: Partial<Database["public"]["Tables"]["textos_conversations"]["Row"]>;
      };
      textos_messages: {
        Row: {
          id: string;
          conversation_id: string;
          org_id: string;
          direction: "in" | "out";
          author: "contact" | "human" | "ai" | "system";
          body: string;
          attachments: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_messages"]["Row"]> & { conversation_id: string; org_id: string; direction: "in" | "out"; body: string };
        Update: Partial<Database["public"]["Tables"]["textos_messages"]["Row"]>;
      };
      textos_suggestions: {
        Row: {
          id: string;
          org_id: string;
          conversation_id: string;
          message_id: string | null;
          proposed_text: string | null;
          confidence: number;
          semaphore: Semaphore;
          reason: string | null;
          status: "pending" | "sent" | "auto_sent" | "dismissed" | "escalated" | "snoozed" | "scope_gap_learned";
          resolved_at: string | null;
          snooze_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_suggestions"]["Row"]> & { org_id: string; conversation_id: string };
        Update: Partial<Database["public"]["Tables"]["textos_suggestions"]["Row"]>;
      };
      textos_knowledge_cards: {
        Row: {
          id: string;
          org_id: string;
          topic: string;
          question: string;
          variants: string[];
          answer: string;
          confidence: number;
          origin: "onboarding" | "learned" | "manual";
          usage_count: number;
          needs_review: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_knowledge_cards"]["Row"]> & { org_id: string; topic: string; question: string; answer: string };
        Update: Partial<Database["public"]["Tables"]["textos_knowledge_cards"]["Row"]>;
      };
      textos_scope_gaps: {
        Row: {
          id: string;
          org_id: string;
          topic: string;
          sample_question: string | null;
          count: number;
          last_seen: string;
          resolved_card_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_scope_gaps"]["Row"]> & { org_id: string; topic: string };
        Update: Partial<Database["public"]["Tables"]["textos_scope_gaps"]["Row"]>;
      };
      textos_flows: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          active: boolean;
          nodes: Json;
          edges: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_flows"]["Row"]> & { org_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["textos_flows"]["Row"]>;
      };
      textos_campaigns: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          status: "draft" | "scheduled" | "sending" | "completed" | "paused";
          audience: Json;
          message: string | null;
          scheduled_at: string | null;
          recurrence: string | null;
          stats: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_campaigns"]["Row"]> & { org_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["textos_campaigns"]["Row"]>;
      };
      textos_alerts: {
        Row: {
          id: string;
          org_id: string;
          name: string | null;
          condition: Json;
          notify: Json;
          enabled: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_alerts"]["Row"]> & { org_id: string };
        Update: Partial<Database["public"]["Tables"]["textos_alerts"]["Row"]>;
      };
      textos_quick_replies: {
        Row: {
          id: string;
          org_id: string;
          shortcut: string | null;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_quick_replies"]["Row"]> & { org_id: string; body: string };
        Update: Partial<Database["public"]["Tables"]["textos_quick_replies"]["Row"]>;
      };
      textos_channels: {
        Row: {
          id: string;
          org_id: string;
          type: "whatsapp" | "instagram" | "messenger" | "email" | "webchat";
          status: "connected" | "pending" | "disconnected";
          label: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_channels"]["Row"]> & { org_id: string; type: "whatsapp" | "instagram" | "messenger" | "email" | "webchat" };
        Update: Partial<Database["public"]["Tables"]["textos_channels"]["Row"]>;
      };
      textos_stages: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          color: string;
          position: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_stages"]["Row"]> & { org_id: string; name: string; position: number };
        Update: Partial<Database["public"]["Tables"]["textos_stages"]["Row"]>;
      };
      textos_tag_catalog: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_tag_catalog"]["Row"]> & { org_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["textos_tag_catalog"]["Row"]>;
      };
      textos_autosend_feedback: {
        Row: {
          id: string;
          org_id: string;
          suggestion_id: string | null;
          feedback: "bad" | "good";
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["textos_autosend_feedback"]["Row"]> & { org_id: string };
        Update: Partial<Database["public"]["Tables"]["textos_autosend_feedback"]["Row"]>;
      };
      textos_org_members: {
        Row: { org_id: string; user_id: string; role: "admin" | "agent" | "readonly"; created_at: string };
        Insert: { org_id: string; user_id: string; role?: "admin" | "agent" | "readonly" };
        Update: Partial<{ role: "admin" | "agent" | "readonly" }>;
      };
      textos_notes: {
        Row: { id: string; org_id: string; contact_id: string; author_id: string | null; body: string; created_at: string };
        Insert: { id?: string; org_id: string; contact_id: string; body: string; author_id?: string | null };
        Update: Partial<{ body: string }>;
      };
      textos_org_invites: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: "admin" | "agent" | "readonly";
          token: string;
          invited_by: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          org_id: string;
          email: string;
          role?: "admin" | "agent" | "readonly";
          invited_by?: string | null;
        };
        Update: Partial<{ role: "admin" | "agent" | "readonly"; accepted_at: string | null }>;
      };
};

export type Database = {
  public: {
    Tables: WithRelationships<_Tables>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
