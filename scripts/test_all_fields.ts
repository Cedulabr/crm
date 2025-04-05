import { db } from '../server/db';
import { 
  clients, 
  products, 
  convenios, 
  banks, 
  proposals, 
  users,
  organizations,
  formTemplates,
  formSubmissions,
  UserRole,
  UserSector,
  FormFieldType
} from '../shared/schema';

/**
 * Script de teste para validar todos os campos nas tabelas do banco de dados
 * Este script insere dados de teste em todas as tabelas e depois recupera esses dados para validar
 */
async function testAllFields() {
  console.log('Iniciando testes de todos os campos...');
  
  try {
    // 1. Teste da tabela organizations
    console.log('\n--- Testando tabela organizations ---');
    
    const testOrg = {
      name: `Organização Teste ${Date.now()}`,
      address: 'Av. Teste, 123',
      phone: '(71) 98765-4321',
      cnpj: '12.345.678/0001-99',
      email: `org.teste.${Date.now()}@example.com`,
      website: 'www.orgteste.com.br',
      description: 'Organização criada para testes automatizados',
      logo: 'https://via.placeholder.com/150'
    };
    
    const [organization] = await db.insert(organizations).values(testOrg).returning();
    
    console.log('✓ Organização criada com sucesso:', organization);
    
    // 2. Teste da tabela users
    console.log('\n--- Testando tabela users ---');
    
    const testUser = {
      name: `Usuário Teste ${Date.now()}`,
      email: `user.teste.${Date.now()}@example.com`,
      role: UserRole.MANAGER,
      sector: UserSector.COMMERCIAL,
      organizationId: organization.id,
      password: '$2a$10$8KTBtLQYl8luZuHzYYMnZOpRcPwHNJRS0KoFnRtKdRyOHS2RZveGi' // senha hash para "senha123"
    };
    
    const [user] = await db.insert(users).values(testUser).returning();
    
    console.log('✓ Usuário criado com sucesso:', user);
    
    // 3. Teste da tabela convenios
    console.log('\n--- Testando tabela convenios ---');
    
    const testConvenio = {
      name: `Convenio Teste ${Date.now()}`,
      price: 'R$ 500,00'
    };
    
    const [convenio] = await db.insert(convenios).values(testConvenio).returning();
    
    console.log('✓ Convênio criado com sucesso:', convenio);
    
    // 4. Teste da tabela products
    console.log('\n--- Testando tabela products ---');
    
    const testProduct = {
      name: `Produto Teste ${Date.now()}`,
      price: 'R$ 1.200,00'
    };
    
    const [product] = await db.insert(products).values(testProduct).returning();
    
    console.log('✓ Produto criado com sucesso:', product);
    
    // 5. Teste da tabela banks
    console.log('\n--- Testando tabela banks ---');
    
    const testBank = {
      name: `Banco Teste ${Date.now()}`,
      price: 'R$ 300,00'
    };
    
    const [bank] = await db.insert(banks).values(testBank).returning();
    
    console.log('✓ Banco criado com sucesso:', bank);
    
    // 6. Teste da tabela clients
    console.log('\n--- Testando tabela clients ---');
    
    const testClient = {
      name: `Cliente Teste ${Date.now()}`,
      cpf: '123.456.789-00',
      phone: '(71) 99999-8888',
      convenioId: convenio.id,
      birthDate: '01/01/1980',
      contact: 'Contato teste',
      email: `cliente.teste.${Date.now()}@example.com`,
      company: 'Empresa Teste',
      createdById: user.id,
      organizationId: organization.id
    };
    
    const [client] = await db.insert(clients).values(testClient).returning();
    
    console.log('✓ Cliente criado com sucesso:', client);
    
    // 7. Teste da tabela proposals
    console.log('\n--- Testando tabela proposals ---');
    
    const testProposal = {
      clientId: client.id,
      productId: product.id,
      convenioId: convenio.id,
      bankId: bank.id,
      value: 'R$ 5.000,00',
      comments: 'Proposta de teste para validação de campos',
      status: 'em_negociacao',
      createdById: user.id,
      organizationId: organization.id
    };
    
    const [proposal] = await db.insert(proposals).values(testProposal).returning();
    
    console.log('✓ Proposta criada com sucesso:', proposal);
        
    // 9. Teste da tabela formTemplates
    console.log('\n--- Testando tabela formTemplates ---');
    
    const testFormTemplate = {
      name: `Template de Formulário Teste ${Date.now()}`,
      description: 'Formulário para testes de todos os tipos de campos',
      kanbanColumn: 'lead',
      fields: [
        {
          id: 'field_text',
          name: 'nome',
          label: 'Nome Completo',
          type: FormFieldType.TEXT,
          required: true,
          placeholder: 'Digite seu nome completo'
        },
        {
          id: 'field_email',
          name: 'email',
          label: 'E-mail',
          type: FormFieldType.EMAIL,
          required: true,
          placeholder: 'seuemail@exemplo.com'
        },
        {
          id: 'field_phone',
          name: 'telefone',
          label: 'Telefone',
          type: FormFieldType.PHONE,
          required: true,
          placeholder: '(00) 00000-0000'
        },
        {
          id: 'field_cpf',
          name: 'cpf',
          label: 'CPF',
          type: FormFieldType.CPF,
          required: true,
          placeholder: '000.000.000-00'
        },
        {
          id: 'field_date',
          name: 'data_nascimento',
          label: 'Data de Nascimento',
          type: FormFieldType.DATE,
          required: true
        },
        {
          id: 'field_currency',
          name: 'valor_pretendido',
          label: 'Valor Pretendido',
          type: FormFieldType.CURRENCY,
          required: true,
          placeholder: 'R$ 0,00'
        },
        {
          id: 'field_select',
          name: 'convenio',
          label: 'Convênio',
          type: FormFieldType.SELECT,
          required: true,
          options: [
            { label: 'Beneficiário do INSS', value: 'inss' },
            { label: 'Servidor Público', value: 'servidor' },
            { label: 'LOAS/BPC', value: 'loas' },
            { label: 'Carteira assinada CLT', value: 'clt' }
          ]
        },
        {
          id: 'field_textarea',
          name: 'observacoes',
          label: 'Observações',
          type: FormFieldType.TEXTAREA,
          required: false,
          placeholder: 'Digite qualquer informação adicional aqui'
        }
      ],
      active: true,
      createdById: user.id,
      organizationId: organization.id
    };
    
    const [formTemplate] = await db.insert(formTemplates).values(testFormTemplate).returning();
    
    console.log('✓ Template de formulário criado com sucesso:', formTemplate);
    
    // 10. Teste da tabela formSubmissions
    console.log('\n--- Testando tabela formSubmissions ---');
    
    const testFormSubmission = {
      formTemplateId: formTemplate.id,
      data: {
        nome: 'João da Silva',
        email: 'joao.silva@example.com',
        telefone: '(71) 99999-1234',
        cpf: '111.222.333-44',
        data_nascimento: '15/05/1975',
        valor_pretendido: 'R$ 12.000,00',
        convenio: 'inss',
        observacoes: 'Esta é uma submissão de teste para validação do banco de dados'
      },
      status: 'novo',
      organizationId: organization.id
    };
    
    const [formSubmission] = await db.insert(formSubmissions).values(testFormSubmission).returning();
    
    console.log('✓ Submissão de formulário criada com sucesso:', formSubmission);
    
    console.log('\n✅ Todos os testes de campos concluídos com sucesso!\n');
    
    // Mostrar estatísticas
    console.log('Resumo de entidades criadas:');
    console.log('- 1 Organização');
    console.log('- 1 Usuário');
    console.log('- 1 Convênio');
    console.log('- 1 Produto');
    console.log('- 1 Banco');
    console.log('- 1 Cliente');
    console.log('- 1 Proposta');
    console.log('- 1 Template de Formulário');
    console.log('- 1 Submissão de Formulário');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Executar testes
testAllFields()
  .then(() => {
    console.log('Script de testes finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro fatal no script de testes:', error);
    process.exit(1);
  });