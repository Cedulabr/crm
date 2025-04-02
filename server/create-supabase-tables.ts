import { supabase } from './supabase';

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

// Executar a inserção de dados de teste
inserirDadosDeTeste()
  .then(resultado => {
    if (resultado) {
      console.log('Processo de inserção de dados de teste concluído com sucesso!');
    } else {
      console.error('Houve erros no processo de inserção de dados de teste.');
    }
  })
  .catch(error => {
    console.error('Erro durante o processo de inserção de dados de teste:', error);
  });