export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      banks: {
        Row: {
          id: number
          name: string
          price: string | null
        }
        Insert: {
          id?: number
          name: string
          price?: string | null
        }
        Update: {
          id?: number
          name?: string
          price?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: number
          name: string
          contact: string | null
          email: string | null
          phone: string | null
          company: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      convenios: {
        Row: {
          id: number
          name: string
          price: string | null
        }
        Insert: {
          id?: number
          name: string
          price?: string | null
        }
        Update: {
          id?: number
          name?: string
          price?: string | null
        }
        Relationships: []
      }
      kanban: {
        Row: {
          id: number
          client_id: number | null
          column: string
          position: number
        }
        Insert: {
          id?: number
          client_id?: number | null
          column: string
          position: number
        }
        Update: {
          id?: number
          client_id?: number | null
          column?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "kanban_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: number
          name: string
          price: string | null
        }
        Insert: {
          id?: number
          name: string
          price?: string | null
        }
        Update: {
          id?: number
          name?: string
          price?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: number
          value: string | null
          client_id: number | null
          created_at: string | null
          status: string
          product_id: number | null
          convenio_id: number | null
          bank_id: number | null
        }
        Insert: {
          id?: number
          value?: string | null
          client_id?: number | null
          created_at?: string | null
          status: string
          product_id?: number | null
          convenio_id?: number | null
          bank_id?: number | null
        }
        Update: {
          id?: number
          value?: string | null
          client_id?: number | null
          created_at?: string | null
          status?: string
          product_id?: number | null
          convenio_id?: number | null
          bank_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_convenio_id_fkey"
            columns: ["convenio_id"]
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_bank_id_fkey"
            columns: ["bank_id"]
            referencedRelation: "banks"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}