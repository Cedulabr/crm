import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { User } from '@shared/schema';

// URL e chave do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Criar cliente Supabase no servidor
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Estender o tipo Request para adicionar o usuário
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Middleware para verificar o token JWT do Supabase e extrair o usuário
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obter o token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(); // Continue sem usuário autenticado
    }
    
    const token = authHeader.split(' ')[1]; // Format: 'Bearer TOKEN'
    
    if (!token) {
      return next(); // Continue sem usuário autenticado
    }
    
    // Verificar o token do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Erro ao verificar token:', error);
      return next();
    }
    
    // Adicionar o usuário ao objeto de requisição
    // Fazendo uma conversão segura para o tipo User
    req.user = {
      id: parseInt(user.id) || 0, // Convertendo para número
      email: user.email || '',
      role: user.user_metadata?.role || 'agent',
      name: user.user_metadata?.name || user.email || '',
      sector: null,
      createdAt: null,
      organizationId: user.user_metadata?.organization_id || 1,
      password: null,
      updatedAt: null
    };
    
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