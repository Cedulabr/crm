import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "./use-supabase-auth";
import { UserRole, UserSector } from "@shared/schema";

// Interface para o perfil do usuário
export interface UserProfile {
  id: string;
  name: string;
  role: string; // Como string para compatibilidade com localStorage
  sector: UserSector;
  organization_id: number;
  created_at?: string;
  updated_at?: string;
}

export function useSupabaseProfile() {
  const { user } = useSupabaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  async function fetchProfile() {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        setError(new Error(error.message));
        return null;
      }

      const userProfile = data as UserProfile;
      setProfile(userProfile);
      return userProfile;
    } catch (err: any) {
      console.error('Erro ao buscar perfil:', err);
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  // Criar/atualizar perfil
  async function updateProfile(profileData: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>) {
    if (!user) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar se o perfil já existe
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && !checkError.message.includes('No rows found')) {
        throw new Error(checkError.message);
      }

      // Operação de upsert (inserir ou atualizar)
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...profileData
        });

      if (error) throw new Error(error.message);

      // Atualizar o perfil local
      await fetchProfile();
      
      return data;
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  // Carregar perfil na montagem e quando o usuário mudar
  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile
  };
}