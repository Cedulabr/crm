import { db } from '../server/db';
import { clients, proposals, kanban, products, convenios, banks, organizations, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function insertTestData() {
  try {
    console.log('Iniciando inserção de dados de teste com Drizzle...');

    // Verificar se já existem dados
    const existingUsers = await db.select().from(users);
    console.log('Usuários existentes:', existingUsers.length);

    const existingOrgs = await db.select().from(organizations);
    console.log('Organizações existentes:', existingOrgs.length);

    const existingProducts = await db.select().from(products);
    console.log('Produtos existentes:', existingProducts.length);

    const existingConvenios = await db.select().from(convenios);
    console.log('Convênios existentes:', existingConvenios.length);

    const existingBanks = await db.select().from(banks);
    console.log('Bancos existentes:', existingBanks.length);

    const existingClients = await db.select().from(clients);
    console.log('Clientes existentes:', existingClients.length);

    // Criar cliente de teste se não existir
    if (existingClients.length === 0 && existingUsers.length > 0) {
      console.log('Criando cliente de teste...');
      
      // Usar o primeiro usuário e primeira organização encontrados
      const user = existingUsers[0];
      const organization = existingOrgs[0];
      const convenio = existingConvenios[0];
      
      // Inserir cliente
      const [newClient] = await db.insert(clients).values({
        name: 'Cliente Drizzle Teste',
        cpf: '111.222.333-44',
        phone: '(71)91234-5678',
        birthDate: '1985-06-20',
        contact: 'Contato do cliente drizzle',
        email: 'drizzle@teste.com',
        company: 'Empresa do Cliente Drizzle',
        organizationId: organization.id,
        createdById: user.id,
        convenioId: convenio?.id
      }).returning();

      console.log('Cliente criado com sucesso:', newClient);

      // Inserir proposta
      if (newClient && existingProducts.length > 0 && existingBanks.length > 0) {
        const product = existingProducts[0];
        const bank = existingBanks[0];
        
        console.log('Criando proposta de teste...');
        const [newProposal] = await db.insert(proposals).values({
          clientId: newClient.id,
          productId: product.id,
          convenioId: convenio?.id,
          bankId: bank.id,
          value: 'R$ 25.000,00',
          comments: 'Proposta de teste com Drizzle',
          status: 'Em análise',
          createdById: user.id,
          organizationId: organization.id
        }).returning();

        console.log('Proposta criada com sucesso:', newProposal);

        // Inserir entrada kanban
        console.log('Criando entrada kanban...');
        const [newKanban] = await db.insert(kanban).values({
          clientId: newClient.id,
          column: 'Prospecção',
          position: 1
        }).returning();

        console.log('Entrada kanban criada com sucesso:', newKanban);
      } else {
        console.log('Não foi possível criar proposta, dados necessários não encontrados');
      }
    } else {
      console.log('Já existem clientes no sistema ou não há usuários para criar clientes');
    }

    console.log('Processo concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao inserir dados de teste:', error);
  }
}

// Executar função
insertTestData().catch(console.error);