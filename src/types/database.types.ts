export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'executive' | 'head_okr' | 'teacher' | 'staff'

export type OKRStatus = 'Draft' | 'In Progress' | 'Completed' | 'On Hold'

export type ProjectStatus = 'Draft' | 'In Progress' | 'Delayed' | 'Completed' | 'On Hold'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string
          username?: string | null
          name?: string | null
          email: string
          password?: string
          first_name: string
          last_name: string
          position: string | null
          department: string
          role: UserRole
          admin_type: string | null
          executive_level: string | null
          employment_status: string | null
          management_order: number
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string
          username?: string | null
          name?: string | null
          email: string
          password?: string
          first_name: string
          last_name: string
          position?: string | null
          department: string
          role?: UserRole
          admin_type?: string | null
          executive_level?: string | null
          employment_status?: string | null
          management_order?: number
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          username?: string | null
          name?: string | null
          email?: string
          password?: string
          first_name?: string
          last_name?: string
          position?: string | null
          department?: string
          role?: UserRole
          admin_type?: string | null
          executive_level?: string | null
          employment_status?: string | null
          management_order?: number
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assignment_id: string
          project_id: string
          user_id: string
          role_type: 'Head' | 'Member'
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          assignment_id?: string
          project_id: string
          user_id: string
          role_type: 'Head' | 'Member'
          assigned_by?: string | null
          created_at?: string
        }
        Update: {
          assignment_id?: string
          project_id?: string
          user_id?: string
          role_type?: 'Head' | 'Member'
          assigned_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      evidence_submissions: {
        Row: {
          evidence_id: string
          project_id: string
          sender_id: string | null
          file_name: string
          file_path: string
          file_type: string
          submitted_at: string
        }
        Insert: {
          evidence_id?: string
          project_id: string
          sender_id?: string | null
          file_name: string
          file_path: string
          file_type: string
          submitted_at?: string
        }
        Update: {
          evidence_id?: string
          project_id?: string
          sender_id?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "evidence_submissions_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      evaluations: {
        Row: {
          eval_id: string
          report_id: string | null
          dashboard_id: string | null
          evaluator_id: string | null
          head_score: number
          team_score: number | null
          created_at: string
        }
        Insert: {
          eval_id?: string
          report_id?: string | null
          dashboard_id?: string | null
          evaluator_id?: string | null
          head_score: number
          team_score?: number | null
          created_at?: string
        }
        Update: {
          eval_id?: string
          report_id?: string | null
          dashboard_id?: string | null
          evaluator_id?: string | null
          head_score?: number
          team_score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "normal_reports"
            referencedColumns: ["report_id"]
          }
        ]
      }
      dashboard: {
        Row: {
          dashboard_id: string
          overall_okr_info: string
          okr_head_evaluation_score: number
          head_id: string | null
          head_name: string | null
          academic_year: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          dashboard_id?: string
          overall_okr_info: string
          okr_head_evaluation_score?: number
          head_id?: string | null
          head_name?: string | null
          academic_year?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          dashboard_id?: string
          overall_okr_info?: string
          okr_head_evaluation_score?: number
          head_id?: string | null
          head_name?: string | null
          academic_year?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      normal_reports: {
        Row: {
          report_id: string
          project_id: string | null
          project_name: string
          project_details: string | null
          responsible_person_name: string | null
          head_name: string | null
          project_outcome: string | null
          initial_expected_outcome: string | null
          head_evaluation_score: number
          team_evaluation_score: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          report_id?: string
          project_id?: string | null
          project_name: string
          project_details?: string | null
          responsible_person_name?: string | null
          head_name?: string | null
          project_outcome?: string | null
          initial_expected_outcome?: string | null
          head_evaluation_score?: number
          team_evaluation_score?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          report_id?: string
          project_id?: string | null
          project_name?: string
          project_details?: string | null
          responsible_person_name?: string | null
          head_name?: string | null
          project_outcome?: string | null
          initial_expected_outcome?: string | null
          head_evaluation_score?: number
          team_evaluation_score?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      okrs: {
        Row: {
          okr_id: string
          okr_title: string
          okr_type: string
          year: number
          quarter: string | null
          status: OKRStatus
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          okr_id?: string
          okr_title: string
          okr_type: string
          year: number
          quarter?: string | null
          status?: OKRStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          okr_id?: string
          okr_title?: string
          okr_type?: string
          year?: number
          quarter?: string | null
          status?: OKRStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okrs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      projects: {
        Row: {
          project_id: string
          okr_id: string
          project_name: string
          project_type: string
          description: string | null
          main_objective: string | null
          sub_objective: string | null
          department: string
          start_date: string | null
          end_date: string | null
          head_of_project: string | null
          progress_percentage: number
          budget: number
          spent_amount: number
          status: ProjectStatus
          bottleneck: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          project_id?: string
          okr_id: string
          project_name: string
          project_type: string
          description?: string | null
          main_objective?: string | null
          sub_objective?: string | null
          department: string
          start_date?: string | null
          end_date?: string | null
          head_of_project?: string | null
          progress_percentage?: number
          budget?: number
          spent_amount?: number
          status?: ProjectStatus
          bottleneck?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: string
          okr_id?: string
          project_name?: string
          project_type?: string
          description?: string | null
          main_objective?: string | null
          sub_objective?: string | null
          department?: string
          start_date?: string | null
          end_date?: string | null
          head_of_project?: string | null
          progress_percentage?: number
          budget?: number
          spent_amount?: number
          status?: ProjectStatus
          bottleneck?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["okr_id"]
          },
          {
            foreignKeyName: "projects_head_of_project_fkey"
            columns: ["head_of_project"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      project_assignees: {
        Row: {
          project_id: string
          user_id: string
          assigned_role: string | null
          assigned_date: string
        }
        Insert: {
          project_id: string
          user_id: string
          assigned_role?: string | null
          assigned_date?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          assigned_role?: string | null
          assigned_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      evidences: {
        Row: {
          evidence_id: string
          project_id: string
          uploaded_by: string | null
          file_name: string
          file_path: string
          file_size: number | null
          description: string | null
          upload_date: string
        }
        Insert: {
          evidence_id?: string
          project_id: string
          uploaded_by?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          description?: string | null
          upload_date?: string
        }
        Update: {
          evidence_id?: string
          project_id?: string
          uploaded_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          description?: string | null
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "evidences_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      reports: {
        Row: {
          report_id: string
          report_type: string
          title: string
          year: number
          quarter: string | null
          department: string | null
          generated_for: string
          report_data: Json | null
          generated_at: string
        }
        Insert: {
          report_id?: string
          report_type: string
          title: string
          year: number
          quarter?: string | null
          department?: string | null
          generated_for: string
          report_data?: Json | null
          generated_at?: string
        }
        Update: {
          report_id?: string
          report_type?: string
          title?: string
          year?: number
          quarter?: string | null
          department?: string | null
          generated_for?: string
          report_data?: Json | null
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_for_fkey"
            columns: ["generated_for"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          log_id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          log_id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          log_id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
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
      user_role: UserRole
      okr_status: OKRStatus
      project_status: ProjectStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type UserProfile = Tables<'users'>
export type ProjectAssignment = Tables<'project_assignments'>
export type EvidenceSubmission = Tables<'evidence_submissions'>
export type Evaluation = Tables<'evaluations'>
export type DashboardReport = Tables<'dashboard'>
export type NormalReport = Tables<'normal_reports'>
export type OKR = Tables<'okrs'>
export type Project = Tables<'projects'>
export type ProjectAssignee = Tables<'project_assignees'>
export type Evidence = Tables<'evidences'>
export type Report = Tables<'reports'>
export type AuditLog = Tables<'audit_logs'>

export interface ProjectWithHeadAndAssignees extends Project {
  head?: UserProfile | null
  assignees?: (ProjectAssignee & { user?: UserProfile })[]
  evidences?: Evidence[]
}
