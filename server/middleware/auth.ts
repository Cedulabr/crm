import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';
import supabase, { isSupabaseConfigured } from '../supabaseClient';

// Definir um tipo mais flexível para compatibilidade 
// entre o sistema e o perfil do usuário no Supabase
interface SupabaseUser extends Omit<User, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// Estender o tipo Request para adicionar o usuário
declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
    }
  }
}

// Middleware para verificar o token JWT do Supabase e extrair o usuário
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar se o Supabase está configurado
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ AVISO: Supabase não está configurado. Autenticação desativada.');
      return next(); // Continue sem autenticação
    }

    // Obter o token do cabeçalho Authorization ou do cookie
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(); // Continue sem usuário autenticado
    }
    
    const token = authHeader.split(' ')[1]; // Format: 'Bearer TOKEN'
    
    if (!token) {
      return next(); // Continue sem usuário autenticado
    }
    
    try {
      // Verificar o token diretamente usando a API de autenticação do Supabase
      // Usar getUser com o token JWT para obter os dados do usuário
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        console.error('Erro ao verificar token:', error);
        return next();
      }
      
      const user = data.user;
      
      // Buscar dados do usuário na tabela users usando o cliente administrativo
      console.log(`Buscando informações do usuário ${user.id}`);
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError || !userProfile) {
        console.log('Perfil não encontrado, usando informações básicas do usuário');
        
        // Adicionar o usuário ao objeto de requisição usando apenas os dados da autenticação
        req.user = {
          id: user.id, // UUID como string
          email: user.email || '',
          role: user.user_metadata?.role || 'agent',
          name: user.user_metadata?.name || user.email || '',
          sector: user.user_metadata?.sector || null,
          createdAt: null, 
          organizationId: parseInt(user.user_metadata?.organization_id) || 1,
          password: null,
          updatedAt: null
        };
      } else {
        console.log('Perfil de usuário encontrado:', userProfile.id, userProfile.email);
        
        // Adicionar o usuário completo ao objeto de requisição
        req.user = {
          id: userProfile.id,
          email: userProfile.email || '',
          role: userProfile.role || 'agent',
          name: userProfile.name || '',
          sector: userProfile.sector || null,
          createdAt: userProfile.created_at, 
          organizationId: userProfile.organization_id || 1,
          password: null, // Nunca incluir senha
          updatedAt: userProfile.updated_at
        };
      }
      
      if (req.user) {
        console.log('Usuário autenticado:', req.user.name, '(', req.user.role, ')');
      }
      
      // Continuar para a próxima rota com o usuário autenticado
      next();
    } catch (profileError) {
      console.error('Erro ao processar perfil do usuário:', profileError);
      next(); // Continue sem usuário autenticado
    }
  } catch (error) {
    console.error('Erro de autenticação:', error);
    next(); // Continue sem usuário autenticado
  }
};

// Middleware para exigir autenticação
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware para verificar permissões de acordo com o papel do usuário
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    next();
  };
};