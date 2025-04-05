import { db } from '../server/db';
import { organizations, users, convenios, products, banks } from '../shared/schema';
import { UserRole, UserSector } from '../shared/schema';
import bcrypt from 'bcrypt';

async function insertTestData() {
  console.log('Inserindo dados de teste no banco de dados...');
  
  try {
    // Verificar se já existem dados
    const existingOrgs = await db.select().from(organizations);
    if (existingOrgs.length > 0) {
      console.log(`Encontradas ${existingOrgs.length} organizações - pulando inserção de dados`);
      return;
    }
    
    // 1. Criar organização padrão
    const [org] = await db.insert(organizations).values({
      name: 'Organização Padrão',
      cnpj: '12.345.678/0001-90',
      address: 'Avenida Presidente Vargas, 1000',
      phone: '(71) 3333-4444',
      email: 'contato@organizacaopadrao.com',
      website: 'www.organizacaopadrao.com',
      logoUrl: 'https://placehold.co/100x100'
    }).returning();
    
    console.log('Organização criada:', org.name, '(ID:', org.id, ')');
    
    // 2. Criar usuário administrador
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const [admin] = await db.insert(users).values({
      name: 'Administrador',
      email: 'admin@example.com',
      password: hashedPassword,
      role: UserRole.SUPERADMIN,
      sector: UserSector.COMMERCIAL,
      organizationId: org.id
    }).returning();
    
    console.log('Usuário admin criado:', admin.email, '(ID:', admin.id, ')');
    
    // 3. Criar convênios de teste
    const convenioData = [
      { name: 'Beneficiário do INSS' },
      { name: 'Servidor Público' },
      { name: 'LOAS/BPC' },
      { name: 'Carteira assinada CLT' }
    ];
    
    const createdConvenios = await db.insert(convenios).values(convenioData).returning();
    console.log(`${createdConvenios.length} convênios criados`);
    
    // 4. Criar produtos de teste
    const productData = [
      { name: 'Novo empréstimo', description: 'Empréstimo para novos clientes', value: 50000 },
      { name: 'Refinanciamento', description: 'Refinanciamento de empréstimo existente', value: 20000 },
      { name: 'Portabilidade', description: 'Portabilidade de empréstimo de outro banco', value: 100000 },
      { name: 'Cartão de Crédito', description: 'Cartão de crédito com limites especiais', value: 10000 },
      { name: 'Saque FGTS', description: 'Antecipação do saque-aniversário do FGTS', value: 5000 }
    ];
    
    const createdProducts = await db.insert(products).values(productData).returning();
    console.log(`${createdProducts.length} produtos criados`);
    
    // 5. Criar bancos de teste
    const bankData = [
      { name: 'BANRISUL' },
      { name: 'BMG' },
      { name: 'C6 BANK' },
      { name: 'CAIXA ECONÔMICA FEDERAL' },
      { name: 'ITAÚ' },
      { name: 'SAFRA' },
      { name: 'SANTANDER' },
      { name: 'BRADESCO' },
      { name: 'BANCO DO BRASIL' },
      { name: 'NUBANK' }
    ];
    
    const createdBanks = await db.insert(banks).values(bankData).returning();
    console.log(`${createdBanks.length} bancos criados`);
    
    console.log('Dados de teste inseridos com sucesso!');
    console.log('\nCredenciais de teste:');
    console.log('Email: admin@example.com');
    console.log('Senha: Admin@123');
    
  } catch (error) {
    console.error('Erro ao inserir dados de teste:', error);
  }
}

insertTestData();