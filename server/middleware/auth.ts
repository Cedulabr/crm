import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

// Estender o tipo Request para adicionar o usuário
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Segredo usado para verificar os tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_seguro';

// Middleware para verificar o token JWT e extrair o usuário
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
    
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    
    // Adicionar o usuário decodificado ao objeto de requisição
    req.user = decoded;
    
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