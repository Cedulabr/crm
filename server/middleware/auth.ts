import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { User } from '@shared/schema';

// URL e chave do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Criar cliente Supabase no servidor
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
      // Melhorar a verificação do token do Supabase
      // Usar getSession com o token para obter os dados do usuário
      // Em vez de getUser que pode ter problemas com o token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.error('Erro ao verificar sessão:', sessionError);
        return next();
      }
      
      // Obter o usuário da sessão
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        console.error('Erro ao verificar token:', error);
        return next();
      }
      
      const user = data.user;
      
      // Buscar dados do usuário na tabela users
      console.log(`Buscando informações completas do usuário ${user.id}`);
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
          createdAt: null, // Sem converter para Date
          organizationId: parseInt(user.user_metadata?.organization_id) || 1,
          password: null,
          updatedAt: null // Sem converter para Date
        };
      } else {
        console.log('Perfil de usuário encontrado:', userProfile);
        
        // Adicionar o usuário completo ao objeto de requisição
        req.user = {
          id: userProfile.id,
          email: userProfile.email || '',
          role: userProfile.role || 'agent',
          name: userProfile.name || '',
          sector: userProfile.sector || null,
          createdAt: null, // Sem converter para Date
          organizationId: userProfile.organization_id || 1,
          password: null, // Nunca incluir senha
          updatedAt: null // Sem converter para Date
        };
      }
      
      if (req.user) {
        console.log('Usuário autenticado:', req.user.name, req.user.role);
      }
      
    } catch (profileError) {
      console.error('Erro ao processar perfil do usuário:', profileError);
    }
    
    next();
    
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