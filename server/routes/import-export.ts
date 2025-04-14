import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Rota para importar clientes
router.post('/clients/import', authenticateUser, async (req: Request, res: Response) => {
  try {
    const clients = req.body;
    
    if (!Array.isArray(clients)) {
      return res.status(400).json({ message: 'O corpo da requisição deve ser um array de clientes' });
    }

    // Atualiza cada cliente com o ID do criador
    const enrichedClients = clients.map(client => ({
      ...client,
      creator_id: req.user?.id || 'system',
      organization_id: req.user?.organization_id || 1
    }));

    // Lista para armazenar clientes importados
    const importedClients = [];

    // Processa cada cliente
    for (const clientData of enrichedClients) {
      try {
        const client = await storage.createClient(clientData);
        importedClients.push(client);
      } catch (error) {
        console.error('Erro ao importar cliente:', error);
        // Continua mesmo se houver erro em um cliente
      }
    }

    res.status(201).json(importedClients);
  } catch (error) {
    console.error('Erro ao processar importação de clientes:', error);
    res.status(500).json({ message: 'Erro ao processar importação de clientes' });
  }
});

// Rota para importar propostas
router.post('/proposals/import', authenticateUser, async (req: Request, res: Response) => {
  try {
    const proposals = req.body;
    
    if (!Array.isArray(proposals)) {
      return res.status(400).json({ message: 'O corpo da requisição deve ser um array de propostas' });
    }

    // Atualiza cada proposta com o ID do criador
    const enrichedProposals = proposals.map(proposal => ({
      ...proposal,
      creator_id: req.user?.id || 'system',
      organization_id: req.user?.organization_id || 1
    }));

    // Lista para armazenar propostas importadas
    const importedProposals = [];

    // Processa cada proposta
    for (const proposalData of enrichedProposals) {
      try {
        const proposal = await storage.createProposal(proposalData);
        importedProposals.push(proposal);
      } catch (error) {
        console.error('Erro ao importar proposta:', error);
        // Continua mesmo se houver erro em uma proposta
      }
    }

    res.status(201).json(importedProposals);
  } catch (error) {
    console.error('Erro ao processar importação de propostas:', error);
    res.status(500).json({ message: 'Erro ao processar importação de propostas' });
  }
});

export default router;