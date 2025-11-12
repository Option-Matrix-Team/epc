import { User as SupabaseUser, Session } from '@supabase/supabase-js'

export type UserRole = 'Admin' | 'Patient' | 'Provider' | 'Nurse' | 'Technician'

export interface Profile {
    id: string
    user_type: UserRole
    is_active: boolean
    is_deleted: boolean
    created_at: string
    created_by: string | null
    modified_by: string | null
    modified_at: string | null
}

export interface AuthUser extends SupabaseUser {
    profile?: Profile
}

export interface AuthSession extends Session {
    user: AuthUser
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface AuthError {
    message: string
    status?: number
}
