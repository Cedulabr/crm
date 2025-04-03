import { supabase } from './supabase';

/**
 * Função para criar tabelas no Supabase
 */
async function criarTabelas() {
  console.log('Verificando e criando tabelas no Supabase...');

  try {
    // Verificar e criar a tabela form_templates se não existir
    const { error: checkFormTemplatesError } = await supabase
      .from('form_templates')
      .select('id')
      .limit(1);

    if (checkFormTemplatesError && checkFormTemplatesError.code === '42P01') { // tabela não existe
      console.log('Criando tabela form_templates...');
      
      const { error: createFormTemplatesError } = await supabase.rpc('create_form_templates_table');
      
      if (createFormTemplatesError) {
        console.error('Erro ao criar tabela form_templates:', createFormTemplatesError);
        
        // Criar manualmente via SQL pelo RPC
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS form_templates (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              kanban_column TEXT DEFAULT 'lead',
              fields JSONB DEFAULT '[]'::jsonb,
              active BOOLEAN DEFAULT true,
              created_by_id INTEGER REFERENCES users(id),
              organization_id INTEGER REFERENCES organizations(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        if (sqlError) {
          console.error('Erro ao criar tabela form_templates via SQL:', sqlError);
          return false;
        }
      }
      
      console.log('Tabela form_templates criada com sucesso!');
    } else {
      console.log('Tabela form_templates já existe.');
    }
    
    // Verificar e criar a tabela form_submissions se não existir
    const { error: checkFormSubmissionsError } = await supabase
      .from('form_submissions')
      .select('id')
      .limit(1);

    if (checkFormSubmissionsError && checkFormSubmissionsError.code === '42P01') { // tabela não existe
      console.log('Criando tabela form_submissions...');
      
      const { error: createFormSubmissionsError } = await supabase.rpc('create_form_submissions_table');
      
      if (createFormSubmissionsError) {
        console.error('Erro ao criar tabela form_submissions:', createFormSubmissionsError);
        
        // Criar manualmente via SQL pelo RPC
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS form_submissions (
              id SERIAL PRIMARY KEY,
              form_template_id INTEGER REFERENCES form_templates(id),
              data JSONB DEFAULT '{}'::jsonb,
              client_id INTEGER REFERENCES clients(id),
              status TEXT DEFAULT 'novo',
              processed_by_id INTEGER REFERENCES users(id),
              organization_id INTEGER REFERENCES organizations(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        if (sqlError) {
          console.error('Erro ao criar tabela form_submissions via SQL:', sqlError);
          return false;
        }
      }
      
      console.log('Tabela form_submissions criada com sucesso!');
    } else {
      console.log('Tabela form_submissions já existe.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    return false;
  }
}

/**
 * Função para inserir dados de teste diretamente no Supabase
 * Com os dados básicos para o funcionamento do sistema (empresa, usuário admin e tabelas de referência)
 */
async function inserirDadosDeTeste() {
  console.log('Iniciando inserção de dados de teste no Supabase...');
  
  try {
    console.log('Inserindo organização de teste...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Empresa Teste',
        address: 'Av. Principal, 1000',
        phone: '(71)99999-9999',
        cnpj: '12.345.678/0001-90',
        email: 'contato@empresa.com',
        website: 'www.empresa.com',
        description: 'Empresa de testes do sistema'
      })
      .select()
      .single();
    
    if (orgError) {
      console.error('Erro ao inserir organização de teste:', orgError);
      return false;
    }
    
    console.log('Organização criada com sucesso:', orgData);
    
    // Inserir usuário admin
    console.log('Inserindo usuário admin...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Administrador',
        email: 'admin@empresa.com',
        role: 'superadmin',
        organization_id: orgData.id,
        password: 'senha123', // Na produção usar senha criptografada
        sector: 'Administração'
      })
      .select()
      .single();
    
    if (userError) {
      console.error('Erro ao inserir usuário admin:', userError);
      return false;
    }
    
    console.log('Usuário admin criado com sucesso:', userData);
    
    // Inserir produtos
    console.log('Inserindo produtos...');
    const { error: productsError } = await supabase
      .from('products')
      .insert([
        { name: 'Novo empréstimo', price: 'R$ 1.000,00' },
        { name: 'Refinanciamento', price: 'R$ 5.000,00' },
        { name: 'Portabilidade', price: 'R$ 2.000,00' },
        { name: 'Cartão de Crédito', price: 'R$ 500,00' },
        { name: 'Saque FGTS', price: 'R$ 1.200,00' }
      ]);
    
    if (productsError) {
      console.error('Erro ao inserir produtos:', productsError);
      return false;
    }
    
    console.log('Produtos inseridos com sucesso');
    
    // Inserir convênios
    console.log('Inserindo convênios...');
    const { error: conveniosError } = await supabase
      .from('convenios')
      .insert([
        { name: 'Beneficiário do INSS', price: 'R$ 3.000,00' },
        { name: 'Servidor Público', price: 'R$ 5.000,00' },
        { name: 'LOAS/BPC', price: 'R$ 1.500,00' },
        { name: 'Carteira assinada CLT', price: 'R$ 4.000,00' }
      ]);
    
    if (conveniosError) {
      console.error('Erro ao inserir convênios:', conveniosError);
      return false;
    }
    
    console.log('Convênios inseridos com sucesso');
    
    // Inserir bancos
    console.log('Inserindo bancos...');
    const { error: banksError } = await supabase
      .from('banks')
      .insert([
        { name: 'BANRISUL', price: 'R$ 2.500,00' },
        { name: 'BMG', price: 'R$ 3.000,00' },
        { name: 'C6 BANK', price: 'R$ 1.800,00' },
        { name: 'DAYCOVAL', price: 'R$ 2.200,00' },
        { name: 'ITAÚ', price: 'R$ 4.500,00' },
        { name: 'SAFRA', price: 'R$ 2.800,00' }
      ]);
    
    if (banksError) {
      console.error('Erro ao inserir bancos:', banksError);
      return false;
    }
    
    console.log('Bancos inseridos com sucesso');
    
    // Inserir cliente de teste
    console.log('Inserindo cliente de teste...');
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: 'Cliente Teste',
        cpf: '123.456.789-00',
        phone: '(71)98765-4321',
        birth_date: '1980-01-01',
        contact: 'Contato do cliente',
        email: 'cliente@teste.com',
        company: 'Empresa do cliente',
        organization_id: orgData.id,
        created_by_id: userData.id,
        convenio_id: 1
      })
      .select()
      .single();
    
    if (clientError) {
      console.error('Erro ao inserir cliente de teste:', clientError);
      return false;
    }
    
    console.log('Cliente inserido com sucesso:', clientData);
    
    // Inserir proposta de teste
    console.log('Inserindo proposta de teste...');
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        client_id: clientData.id,
        product_id: 1,
        convenio_id: 1,
        bank_id: 2,
        value: 'R$ 10.000,00',
        comments: 'Proposta de teste',
        status: 'Em análise',
        created_by_id: userData.id,
        organization_id: orgData.id
      })
      .select()
      .single();
    
    if (proposalError) {
      console.error('Erro ao inserir proposta de teste:', proposalError);
      return false;
    }
    
    console.log('Proposta inserida com sucesso:', proposalData);
    
    // Inserir entrada de kanban para o cliente
    console.log('Inserindo entrada de kanban para o cliente...');
    const { data: kanbanData, error: kanbanError } = await supabase
      .from('kanban')
      .insert({
        client_id: clientData.id,
        column: 'Prospecção',
        position: 1
      })
      .select()
      .single();
    
    if (kanbanError) {
      console.error('Erro ao inserir entrada de kanban:', kanbanError);
      return false;
    }
    
    console.log('Entrada de kanban inserida com sucesso:', kanbanData);
    
    console.log('Todos os dados de teste foram inseridos com sucesso!');
    return true;
    
  } catch (error) {
    console.error('Erro ao inserir dados de teste:', error);
    return false;
  }
}

// Função para inserir dados de teste de formulários
async function inserirDadosFormularios(userId: number, orgId: number) {
  console.log('Inserindo dados de formulários de teste...');
  
  try {
    // Criar um modelo de formulário de teste
    console.log('Criando modelo de formulário de teste...');
    const { data: formTemplateData, error: formTemplateError } = await supabase
      .from('form_templates')
      .insert({
        name: 'Formulário de Lead',
        description: 'Formulário para captura de leads no site',
        kanban_column: 'lead',
        fields: JSON.stringify([
          {
            id: 'name',
            label: 'Nome Completo',
            type: 'text',
            required: true,
            placeholder: 'Digite seu nome completo'
          },
          {
            id: 'email',
            label: 'E-mail',
            type: 'email',
            required: true,
            placeholder: 'Digite seu e-mail'
          },
          {
            id: 'phone',
            label: 'Telefone',
            type: 'tel',
            required: true,
            placeholder: '(00) 00000-0000'
          },
          {
            id: 'cpf',
            label: 'CPF',
            type: 'text',
            required: false,
            placeholder: '000.000.000-00'
          },
          {
            id: 'convenio',
            label: 'Convênio',
            type: 'select',
            required: false,
            options: [
              { label: 'Beneficiário do INSS', value: '1' },
              { label: 'Servidor Público', value: '2' },
              { label: 'LOAS/BPC', value: '3' },
              { label: 'Carteira assinada CLT', value: '4' }
            ]
          },
          {
            id: 'message',
            label: 'Mensagem',
            type: 'textarea',
            required: false,
            placeholder: 'Digite sua mensagem'
          }
        ]),
        active: true,
        created_by_id: userId,
        organization_id: orgId
      })
      .select()
      .single();
    
    if (formTemplateError) {
      console.error('Erro ao criar modelo de formulário de teste:', formTemplateError);
      return false;
    }
    
    console.log('Modelo de formulário criado com sucesso:', formTemplateData);
    
    // Criar uma submissão de formulário de teste
    console.log('Criando submissão de formulário de teste...');
    const { data: formSubmissionData, error: formSubmissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_template_id: formTemplateData.id,
        data: JSON.stringify({
          name: 'João da Silva',
          email: 'joao.silva@email.com',
          phone: '(71) 98888-7777',
          cpf: '987.654.321-00',
          convenio: '1',
          message: 'Olá, gostaria de mais informações sobre empréstimos.'
        }),
        status: 'novo',
        organization_id: orgId
      })
      .select()
      .single();
    
    if (formSubmissionError) {
      console.error('Erro ao criar submissão de formulário de teste:', formSubmissionError);
      return false;
    }
    
    console.log('Submissão de formulário criada com sucesso:', formSubmissionData);
    
    return true;
  } catch (error) {
    console.error('Erro ao inserir dados de formulários:', error);
    return false;
  }
}

// Executar a criação de tabelas e inserção de dados de teste
async function inicializarSistema() {
  console.log('Inicializando sistema...');
  
  try {
    // Primeiro criar as tabelas (se necessário)
    const tabelasCriadas = await criarTabelas();
    if (!tabelasCriadas) {
      console.error('Houve erros na criação das tabelas.');
      return;
    }
    
    // Depois inserir os dados básicos
    const dadosInseridos = await inserirDadosDeTeste();
    if (!dadosInseridos) {
      console.error('Houve erros na inserção dos dados de teste básicos.');
      return;
    }
    
    // Obter IDs necessários para dados de formulários
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', 'admin@empresa.com')
      .single();
    
    if (userData) {
      // Inserir dados de formulários
      const formulariosInseridos = await inserirDadosFormularios(userData.id, userData.organization_id);
      if (!formulariosInseridos) {
        console.error('Houve erros na inserção dos dados de formulários.');
      }
    }
    
    console.log('Sistema inicializado com sucesso!');
  } catch (error) {
    console.error('Erro durante a inicialização do sistema:', error);
  }
}

// Executar inicialização do sistema
inicializarSistema()
  .catch(error => {
    console.error('Erro inesperado durante a inicialização do sistema:', error);
  });