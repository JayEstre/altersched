export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          institution_id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'academic_years_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
        ]
      }
      account_approvals: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          rejection_reason: string | null
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database['public']['Enums']['account_status']
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          rejection_reason?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: Database['public']['Enums']['account_status']
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          rejection_reason?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['account_status']
        }
        Relationships: [
          {
            foreignKeyName: 'account_approvals_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'account_approvals_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
        }
        ComputedFields: never
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_profile_id_fkey'
            columns: ['actor_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      class_offerings: {
        Row: {
          assignment_mode: string | null
          created_at: string
          expected_students: number | null
          faculty_id: string | null
          id: string
          required_weekly_hours: number
          section_id: string
          semester_id: string
          status: string
          subject_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          assignment_mode?: string | null
          created_at?: string
          expected_students?: number | null
          faculty_id?: string | null
          id?: string
          required_weekly_hours: number
          section_id: string
          semester_id: string
          status?: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          assignment_mode?: string | null
          created_at?: string
          expected_students?: number | null
          faculty_id?: string | null
          id?: string
          required_weekly_hours?: number
          section_id?: string
          semester_id?: string
          status?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'class_offerings_faculty_id_fkey'
            columns: ['faculty_id']
            isOneToOne: false
            referencedRelation: 'faculty_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_offerings_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_offerings_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_offerings_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
        ]
      }
      curricula: {
        Row: {
          created_at: string
          effective_from_year: number | null
          effective_to_year: number | null
          id: string
          is_active: boolean
          name: string
          program_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          effective_from_year?: number | null
          effective_to_year?: number | null
          id?: string
          is_active?: boolean
          name: string
          program_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from_year?: number | null
          effective_to_year?: number | null
          id?: string
          is_active?: boolean
          name?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'curricula_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
      }
      curriculum_subjects: {
        Row: {
          created_at: string
          curriculum_id: string
          id: string
          required_room_type_id: string | null
          subject_id: string
          term_order: number
          weekly_hours: number
          year_level_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          curriculum_id: string
          id?: string
          required_room_type_id?: string | null
          subject_id: string
          term_order: number
          weekly_hours: number
          year_level_id: string
        }
        Update: {
          created_at?: string
          curriculum_id?: string
          id?: string
          required_room_type_id?: string | null
          subject_id?: string
          term_order?: number
          weekly_hours?: number
          year_level_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'curriculum_subjects_curriculum_id_fkey'
            columns: ['curriculum_id']
            isOneToOne: false
            referencedRelation: 'curricula'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'curriculum_subjects_required_room_type_id_fkey'
            columns: ['required_room_type_id']
            isOneToOne: false
            referencedRelation: 'room_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'curriculum_subjects_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'curriculum_subjects_year_level_id_fkey'
            columns: ['year_level_id']
            isOneToOne: false
            referencedRelation: 'year_levels'
            referencedColumns: ['id']
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
        ]
      }
      email_notifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          id: string
          last_error: string | null
          message: string
          profile_id: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        ComputedFields: never
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          id?: string
          last_error?: string | null
          message: string
          profile_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          id?: string
          last_error?: string | null
          message?: string
          profile_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_notifications_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      faculty_availability: {
        Row: {
          availability_type: Database['public']['Enums']['availability_type']
          created_at: string
          day_of_week: number
          end_time: string
          faculty_id: string
          id: string
          semester_id: string
          start_time: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          availability_type?: Database['public']['Enums']['availability_type']
          created_at?: string
          day_of_week: number
          end_time: string
          faculty_id: string
          id?: string
          semester_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          availability_type?: Database['public']['Enums']['availability_type']
          created_at?: string
          day_of_week?: number
          end_time?: string
          faculty_id?: string
          id?: string
          semester_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'faculty_availability_faculty_id_fkey'
            columns: ['faculty_id']
            isOneToOne: false
            referencedRelation: 'faculty_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'faculty_availability_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
        ]
      }
      faculty_profiles: {
        Row: {
          created_at: string
          department_id: string
          employee_id: string
          employment_type: string | null
          id: string
          max_teaching_load: number | null
          profile_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          department_id: string
          employee_id: string
          employment_type?: string | null
          id?: string
          max_teaching_load?: number | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          employee_id?: string
          employment_type?: string | null
          id?: string
          max_teaching_load?: number | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'faculty_profiles_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'faculty_profiles_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      faculty_subjects: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          subject_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          subject_id: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'faculty_subjects_faculty_id_fkey'
            columns: ['faculty_id']
            isOneToOne: false
            referencedRelation: 'faculty_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'faculty_subjects_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          short_name: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_acknowledgements: {
        Row: {
          acknowledged_at: string
          id: string
          notification_id: string
          profile_id: string
        }
        ComputedFields: never
        Insert: {
          acknowledged_at?: string
          id?: string
          notification_id: string
          profile_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          notification_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_acknowledgements_notification_id_fkey'
            columns: ['notification_id']
            isOneToOne: false
            referencedRelation: 'notifications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_acknowledgements_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: Database['public']['Enums']['notification_priority']
          profile_id: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: Database['public']['Enums']['notification_priority']
          profile_id: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: Database['public']['Enums']['notification_priority']
          profile_id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profile_change_requests: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          reason: string
          requested_department_id: string | null
          requested_program_id: string | null
          requested_section_id: string | null
          requested_year_level_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database['public']['Enums']['approval_status']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          reason: string
          requested_department_id?: string | null
          requested_program_id?: string | null
          requested_section_id?: string | null
          requested_year_level_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['approval_status']
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string
          requested_department_id?: string | null
          requested_program_id?: string | null
          requested_section_id?: string | null
          requested_year_level_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['approval_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_change_requests_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_change_requests_requested_department_id_fkey'
            columns: ['requested_department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_change_requests_requested_program_id_fkey'
            columns: ['requested_program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_change_requests_requested_section_id_fkey'
            columns: ['requested_section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_change_requests_requested_year_level_id_fkey'
            columns: ['requested_year_level_id']
            isOneToOne: false
            referencedRelation: 'year_levels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_change_requests_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database['public']['Enums']['account_status']
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone_number: string | null
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          account_status?: Database['public']['Enums']['account_status']
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone_number?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          account_status?: Database['public']['Enums']['account_status']
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          department_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          code: string
          created_at?: string
          department_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'programs_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
        ]
      }
      public_schedule_shares: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          generated_by: string
          id: string
          revoked_at: string | null
          schedule_id: string
          schedule_version_id: string
          token_hash: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          generated_by: string
          id?: string
          revoked_at?: string | null
          schedule_id: string
          schedule_version_id: string
          token_hash: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          generated_by?: string
          id?: string
          revoked_at?: string | null
          schedule_id?: string
          schedule_version_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: 'public_schedule_shares_generated_by_fkey'
            columns: ['generated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'public_schedule_shares_schedule_id_fkey'
            columns: ['schedule_id']
            isOneToOne: false
            referencedRelation: 'schedules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'public_schedule_shares_schedule_version_id_fkey'
            columns: ['schedule_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
        ]
      }
      room_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          reason: string | null
          room_id: string
          semester_id: string
          start_time: string
          status: Database['public']['Enums']['room_availability_status']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          reason?: string | null
          room_id: string
          semester_id: string
          start_time: string
          status?: Database['public']['Enums']['room_availability_status']
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          reason?: string | null
          room_id?: string
          semester_id?: string
          start_time?: string
          status?: Database['public']['Enums']['room_availability_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_availability_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_availability_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
        ]
      }
      room_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          building: string | null
          capacity: number
          code: string
          created_at: string
          floor: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
          room_type_id: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          building?: string | null
          capacity: number
          code: string
          created_at?: string
          floor?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          room_type_id?: string | null
          updated_at?: string
        }
        Update: {
          building?: string | null
          capacity?: number
          code?: string
          created_at?: string
          floor?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          room_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rooms_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rooms_room_type_id_fkey'
            columns: ['room_type_id']
            isOneToOne: false
            referencedRelation: 'room_types'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_access_codes: {
        Row: {
          active: boolean
          code_hash: string
          created_at: string
          expires_at: string | null
          generated_by: string
          id: string
          qr_token_hash: string | null
          revoked_at: string | null
          schedule_id: string
          schedule_version_id: string
          section_id: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          code_hash: string
          created_at?: string
          expires_at?: string | null
          generated_by: string
          id?: string
          qr_token_hash?: string | null
          revoked_at?: string | null
          schedule_id: string
          schedule_version_id: string
          section_id: string
        }
        Update: {
          active?: boolean
          code_hash?: string
          created_at?: string
          expires_at?: string | null
          generated_by?: string
          id?: string
          qr_token_hash?: string | null
          revoked_at?: string | null
          schedule_id?: string
          schedule_version_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_access_codes_generated_by_fkey'
            columns: ['generated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_access_codes_schedule_id_fkey'
            columns: ['schedule_id']
            isOneToOne: false
            referencedRelation: 'schedules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_access_codes_schedule_version_id_fkey'
            columns: ['schedule_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_access_codes_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_change_requests: {
        Row: {
          change_type: Database['public']['Enums']['change_type']
          created_at: string
          id: string
          proposed_day: number | null
          proposed_end_time: string | null
          proposed_room_id: string | null
          proposed_start_time: string | null
          reason: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_entry_id: string
          status: Database['public']['Enums']['approval_status']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          change_type?: Database['public']['Enums']['change_type']
          created_at?: string
          id?: string
          proposed_day?: number | null
          proposed_end_time?: string | null
          proposed_room_id?: string | null
          proposed_start_time?: string | null
          reason: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_entry_id: string
          status?: Database['public']['Enums']['approval_status']
          updated_at?: string
        }
        Update: {
          change_type?: Database['public']['Enums']['change_type']
          created_at?: string
          id?: string
          proposed_day?: number | null
          proposed_end_time?: string | null
          proposed_room_id?: string | null
          proposed_start_time?: string | null
          reason?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_entry_id?: string
          status?: Database['public']['Enums']['approval_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_change_requests_proposed_room_id_fkey'
            columns: ['proposed_room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_change_requests_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_change_requests_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_change_requests_schedule_entry_id_fkey'
            columns: ['schedule_entry_id']
            isOneToOne: false
            referencedRelation: 'schedule_entries'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_claim_attempts: {
        Row: {
          created_at: string
          failure_reason: string | null
          id: string
          profile_id: string
          result: Database['public']['Enums']['claim_result']
          schedule_access_code_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          profile_id: string
          result: Database['public']['Enums']['claim_result']
          schedule_access_code_id?: string | null
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          profile_id?: string
          result?: Database['public']['Enums']['claim_result']
          schedule_access_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_claim_attempts_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_claim_attempts_schedule_access_code_id_fkey'
            columns: ['schedule_access_code_id']
            isOneToOne: false
            referencedRelation: 'schedule_access_codes'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_entries: {
        Row: {
          class_offering_id: string
          created_at: string
          day_of_week: number
          delivery_mode: string
          end_time: string
          entry_type: string
          faculty_id: string | null
          id: string
          room_id: string
          schedule_version_id: string
          section_id: string
          session_type: string
          start_time: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          class_offering_id: string
          created_at?: string
          day_of_week: number
          delivery_mode?: string
          end_time: string
          entry_type?: string
          faculty_id?: string | null
          id?: string
          room_id: string
          schedule_version_id: string
          section_id: string
          session_type?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          class_offering_id?: string
          created_at?: string
          day_of_week?: number
          delivery_mode?: string
          end_time?: string
          entry_type?: string
          faculty_id?: string | null
          id?: string
          room_id?: string
          schedule_version_id?: string
          section_id?: string
          session_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_entries_class_offering_id_fkey'
            columns: ['class_offering_id']
            isOneToOne: false
            referencedRelation: 'class_offerings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_faculty_id_fkey'
            columns: ['faculty_id']
            isOneToOne: false
            referencedRelation: 'faculty_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_schedule_version_id_fkey'
            columns: ['schedule_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_memberships: {
        Row: {
          active: boolean
          claimed_at: string
          claimed_via: Database['public']['Enums']['claim_method']
          created_at: string
          id: string
          schedule_id: string
          schedule_version_id: string
          section_id: string
          student_profile_id: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          claimed_at?: string
          claimed_via: Database['public']['Enums']['claim_method']
          created_at?: string
          id?: string
          schedule_id: string
          schedule_version_id: string
          section_id: string
          student_profile_id: string
        }
        Update: {
          active?: boolean
          claimed_at?: string
          claimed_via?: Database['public']['Enums']['claim_method']
          created_at?: string
          id?: string
          schedule_id?: string
          schedule_version_id?: string
          section_id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_memberships_schedule_id_fkey'
            columns: ['schedule_id']
            isOneToOne: false
            referencedRelation: 'schedules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_memberships_schedule_version_id_fkey'
            columns: ['schedule_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_memberships_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_memberships_student_profile_id_fkey'
            columns: ['student_profile_id']
            isOneToOne: false
            referencedRelation: 'student_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_revision_history: {
        Row: {
          after_data: Json | null
          before_data: Json | null
          change_request_id: string | null
          change_type: Database['public']['Enums']['change_type']
          changed_by: string
          created_at: string
          id: string
          new_version_id: string | null
          old_version_id: string | null
          reason: string
          schedule_id: string
        }
        ComputedFields: never
        Insert: {
          after_data?: Json | null
          before_data?: Json | null
          change_request_id?: string | null
          change_type?: Database['public']['Enums']['change_type']
          changed_by: string
          created_at?: string
          id?: string
          new_version_id?: string | null
          old_version_id?: string | null
          reason: string
          schedule_id: string
        }
        Update: {
          after_data?: Json | null
          before_data?: Json | null
          change_request_id?: string | null
          change_type?: Database['public']['Enums']['change_type']
          changed_by?: string
          created_at?: string
          id?: string
          new_version_id?: string | null
          old_version_id?: string | null
          reason?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_revision_history_change_request_id_fkey'
            columns: ['change_request_id']
            isOneToOne: false
            referencedRelation: 'schedule_change_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_revision_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_revision_history_new_version_id_fkey'
            columns: ['new_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_revision_history_old_version_id_fkey'
            columns: ['old_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_revision_history_schedule_id_fkey'
            columns: ['schedule_id']
            isOneToOne: false
            referencedRelation: 'schedules'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_validation_logs: {
        Row: {
          conflict_type: string
          created_at: string
          id: string
          message: string
          related_entry_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          schedule_entry_id: string | null
          schedule_version_id: string
          severity: Database['public']['Enums']['validation_severity']
        }
        ComputedFields: never
        Insert: {
          conflict_type: string
          created_at?: string
          id?: string
          message: string
          related_entry_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          schedule_entry_id?: string | null
          schedule_version_id: string
          severity?: Database['public']['Enums']['validation_severity']
        }
        Update: {
          conflict_type?: string
          created_at?: string
          id?: string
          message?: string
          related_entry_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          schedule_entry_id?: string | null
          schedule_version_id?: string
          severity?: Database['public']['Enums']['validation_severity']
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_validation_logs_related_entry_id_fkey'
            columns: ['related_entry_id']
            isOneToOne: false
            referencedRelation: 'schedule_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_validation_logs_resolved_by_fkey'
            columns: ['resolved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_validation_logs_schedule_entry_id_fkey'
            columns: ['schedule_entry_id']
            isOneToOne: false
            referencedRelation: 'schedule_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_validation_logs_schedule_version_id_fkey'
            columns: ['schedule_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_versions: {
        Row: {
          approved_at: string | null
          change_reason: string | null
          created_at: string
          created_by: string
          id: string
          published_at: string | null
          published_by: string | null
          reviewed_by: string | null
          schedule_id: string
          status: Database['public']['Enums']['schedule_status']
          version_number: number
        }
        ComputedFields: never
        Insert: {
          approved_at?: string | null
          change_reason?: string | null
          created_at?: string
          created_by: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          reviewed_by?: string | null
          schedule_id: string
          status?: Database['public']['Enums']['schedule_status']
          version_number: number
        }
        Update: {
          approved_at?: string | null
          change_reason?: string | null
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          reviewed_by?: string | null
          schedule_id?: string
          status?: Database['public']['Enums']['schedule_status']
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_versions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_versions_published_by_fkey'
            columns: ['published_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_versions_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_versions_schedule_id_fkey'
            columns: ['schedule_id']
            isOneToOne: false
            referencedRelation: 'schedules'
            referencedColumns: ['id']
          },
        ]
      }
      scheduler_departments: {
        Row: {
          active: boolean
          assigned_by: string | null
          created_at: string
          department_id: string
          id: string
          profile_id: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          assigned_by?: string | null
          created_at?: string
          department_id: string
          id?: string
          profile_id: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          created_at?: string
          department_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scheduler_departments_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'scheduler_departments_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'scheduler_departments_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          created_by: string
          current_version_id: string | null
          department_id: string
          id: string
          program_id: string
          published_version_id: string | null
          section_id: string
          semester_id: string
          status: Database['public']['Enums']['schedule_status']
          title: string | null
          updated_at: string
          year_level_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by: string
          current_version_id?: string | null
          department_id: string
          id?: string
          program_id: string
          published_version_id?: string | null
          section_id: string
          semester_id: string
          status?: Database['public']['Enums']['schedule_status']
          title?: string | null
          updated_at?: string
          year_level_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          department_id?: string
          id?: string
          program_id?: string
          published_version_id?: string | null
          section_id?: string
          semester_id?: string
          status?: Database['public']['Enums']['schedule_status']
          title?: string | null
          updated_at?: string
          year_level_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_current_version_id_fkey'
            columns: ['current_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_published_version_id_fkey'
            columns: ['published_version_id']
            isOneToOne: false
            referencedRelation: 'schedule_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_year_level_id_fkey'
            columns: ['year_level_id']
            isOneToOne: false
            referencedRelation: 'year_levels'
            referencedColumns: ['id']
          },
        ]
      }
      scheduling_settings: {
        Row: {
          day_end: string
          day_start: string
          id: boolean
          slot_minutes: number
          teaching_days: number[]
          updated_at: string
          updated_by: string | null
        }
        ComputedFields: never
        Insert: {
          day_end?: string
          day_start?: string
          id?: boolean
          slot_minutes?: number
          teaching_days?: number[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          day_end?: string
          day_start?: string
          id?: boolean
          slot_minutes?: number
          teaching_days?: number[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'scheduling_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sections: {
        Row: {
          capacity: number | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          year_level_id: string
        }
        ComputedFields: never
        Insert: {
          capacity?: number | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          year_level_id: string
        }
        Update: {
          capacity?: number | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          year_level_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sections_year_level_id_fkey'
            columns: ['year_level_id']
            isOneToOne: false
            referencedRelation: 'year_levels'
            referencedColumns: ['id']
          },
        ]
      }
      semesters: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          term_order: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          term_order?: number
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          term_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'semesters_academic_year_id_fkey'
            columns: ['academic_year_id']
            isOneToOne: false
            referencedRelation: 'academic_years'
            referencedColumns: ['id']
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          department_id: string
          id: string
          profile_id: string
          program_id: string
          section_id: string
          student_id: string
          updated_at: string
          year_level_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          profile_id: string
          program_id: string
          section_id: string
          student_id: string
          updated_at?: string
          year_level_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          profile_id?: string
          program_id?: string
          section_id?: string
          student_id?: string
          updated_at?: string
          year_level_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_profiles_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_profiles_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_profiles_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_profiles_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_profiles_year_level_id_fkey'
            columns: ['year_level_id']
            isOneToOne: false
            referencedRelation: 'year_levels'
            referencedColumns: ['id']
          },
        ]
      }
      study_load_imports: {
        Row: {
          created_at: string
          error_summary: NonNullable<Json>
          file_name: string
          id: string
          imported_by: string | null
          imported_rows: number
          program_id: string
          rejected_rows: number
          semester_id: string
          status: string
          total_rows: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          error_summary?: NonNullable<Json>
          file_name: string
          id?: string
          imported_by?: string | null
          imported_rows?: number
          program_id: string
          rejected_rows?: number
          semester_id: string
          status?: string
          total_rows?: number
        }
        Update: {
          created_at?: string
          error_summary?: NonNullable<Json>
          file_name?: string
          id?: string
          imported_by?: string | null
          imported_rows?: number
          program_id?: string
          rejected_rows?: number
          semester_id?: string
          status?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: 'study_load_imports_imported_by_fkey'
            columns: ['imported_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'study_load_imports_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'study_load_imports_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          default_faculty_id: string | null
          default_room_type_id: string | null
          default_year_level: number | null
          department_id: string
          description: string | null
          id: string
          is_active: boolean
          lab_hours: number
          lecture_hours: number
          name: string
          units: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          code: string
          created_at?: string
          default_faculty_id?: string | null
          default_room_type_id?: string | null
          default_year_level?: number | null
          department_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          lab_hours?: number
          lecture_hours?: number
          name: string
          units?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_faculty_id?: string | null
          default_room_type_id?: string | null
          default_year_level?: number | null
          department_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lab_hours?: number
          lecture_hours?: number
          name?: string
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subjects_default_faculty_id_fkey'
            columns: ['default_faculty_id']
            isOneToOne: false
            referencedRelation: 'faculty_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subjects_default_room_type_id_fkey'
            columns: ['default_room_type_id']
            isOneToOne: false
            referencedRelation: 'room_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subjects_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
        ]
      }
      year_levels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level_number: number
          name: string
          program_id: string
          sort_order: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level_number: number
          name: string
          program_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level_number?: number
          name?: string
          program_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'year_levels_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_offering_instructor: {
        Args: { p_faculty_id: string; p_mode?: string; p_offering_id: string }
        Returns: number
      }
      can_manage_department: { Args: { p_department_id: string }; Returns: boolean }
      can_manage_schedule: { Args: { p_schedule_id: string }; Returns: boolean }
      can_manage_schedule_version: { Args: { p_version_id: string }; Returns: boolean }
      can_read_schedule: { Args: { p_schedule_id: string }; Returns: boolean }
      claim_schedule: {
        Args: {
          p_access_code_id: string
          p_claim_method?: Database['public']['Enums']['claim_method']
        }
        Returns: string
      }
      claim_schedule_with_code: {
        Args: { p_claim_method?: Database['public']['Enums']['claim_method']; p_raw_code: string }
        Returns: string
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      get_public_schedule_by_token: { Args: { p_token: string }; Returns: Json }
      get_registration_catalog: { Args: Record<PropertyKey, never>; Returns: Json }
      is_approved_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_department_scheduler: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      save_schedule_draft: { Args: { p_entries: Json }; Returns: number }
    }
    Enums: {
      account_status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive'
      approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled'
      availability_type: 'available' | 'preferred' | 'unavailable'
      change_type: 'normal_request' | 'emergency' | 'administrative'
      claim_method: 'code' | 'qr' | 'admin'
      claim_result: 'success' | 'denied' | 'expired' | 'revoked' | 'invalid'
      notification_priority: 'low' | 'normal' | 'high' | 'critical'
      room_availability_status: 'available' | 'blocked' | 'maintenance'
      schedule_status: 'draft' | 'submitted' | 'approved' | 'published' | 'archived'
      user_role: 'super_admin' | 'department_scheduler' | 'faculty' | 'student'
      validation_severity: 'info' | 'warning' | 'error'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ['pending', 'approved', 'rejected', 'suspended', 'inactive'],
      approval_status: ['pending', 'approved', 'rejected', 'cancelled'],
      availability_type: ['available', 'preferred', 'unavailable'],
      change_type: ['normal_request', 'emergency', 'administrative'],
      claim_method: ['code', 'qr', 'admin'],
      claim_result: ['success', 'denied', 'expired', 'revoked', 'invalid'],
      notification_priority: ['low', 'normal', 'high', 'critical'],
      room_availability_status: ['available', 'blocked', 'maintenance'],
      schedule_status: ['draft', 'submitted', 'approved', 'published', 'archived'],
      user_role: ['super_admin', 'department_scheduler', 'faculty', 'student'],
      validation_severity: ['info', 'warning', 'error'],
    },
  },
} as const
