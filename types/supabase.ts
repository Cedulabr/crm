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
          cpf: string | null
          phone: string | null
          convenio_id: number | null
          birth_date: string | null
          contact: string | null
          email: string | null
          company: string | null
          created_by_id: number | null
          organization_id: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          cpf?: string | null
          phone?: string | null
          convenio_id?: number | null
          birth_date?: string | null
          contact?: string | null
          email?: string | null
          company?: string | null
          created_by_id?: number | null
          organization_id?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          cpf?: string | null
          phone?: string | null
          convenio_id?: number | null
          birth_date?: string | null
          contact?: string | null
          email?: string | null
          company?: string | null
          created_by_id?: number | null
          organization_id?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_convenio_id_fkey"
            columns: ["convenio_id"]
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_id_fkey"
            columns: ["created_by_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
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
      organizations: {
        Row: {
          id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: []
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
          client_id: number | null
          product_id: number | null
          convenio_id: number | null
          bank_id: number | null
          value: string | null
          comments: string | null
          status: string
          created_by_id: number | null
          organization_id: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          client_id?: number | null
          product_id?: number | null
          convenio_id?: number | null
          bank_id?: number | null
          value?: string | null
          comments?: string | null
          status: string
          created_by_id?: number | null
          organization_id?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          client_id?: number | null
          product_id?: number | null
          convenio_id?: number | null
          bank_id?: number | null
          value?: string | null
          comments?: string | null
          status?: string
          created_by_id?: number | null
          organization_id?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_bank_id_fkey"
            columns: ["bank_id"]
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_convenio_id_fkey"
            columns: ["convenio_id"]
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_id_fkey"
            columns: ["created_by_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: number
          name: string
          email: string
          role: string
          organization_id: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          email: string
          role: string
          organization_id?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          email?: string
          role?: string
          organization_id?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}