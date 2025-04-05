/**
 * Script para testar todas as tabelas do Supabase
 * Este script insere dados de teste em todas as tabelas e depois verifica se eles foram inseridos corretamente
 */

import { createClient } from '@supabase/supabase-js';
import { hash } from 'bcrypt';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se as variáveis de ambiente foram carregadas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ Erro: SUPABASE_URL e SUPABASE_KEY são necessários no arquivo .env");
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

interface TestResult {
  table: string;
  success: boolean;
  message: string;
  error?: any;
  data?: any;
}

async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

async function testSupabaseTables() {
  console.log("🔍 Iniciando testes das tabelas no Supabase...");
  
  const results: TestResult[] = [];
  
  try {
    // 1. Testar tabela organizations
    console.log("\n📋 Testando tabela organizations...");
    
    const orgData = {
      name: "Empresa Teste",
      description: "Organização criada para testes",
      address: "Rua de Teste, 123",
      phone: "(71) 9999-9999",
      email: "teste@empresa.com",
      website: "https://empresa-teste.com"
    };
    
    try {
      const { data: org, error } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log("✅ Organization criada com sucesso:", org.id);
      results.push({
        table: 'organizations',
        success: true,
        message: `Organization criada com ID ${org.id}`,
        data: org
      });
      
      // Guardar o ID da organização para usar em outras tabelas
      const organizationId = org.id;
      
      // 2. Testar tabela users
      console.log("\n📋 Testando tabela users...");
      
      const hashedPassword = await hashPassword("Teste@123");
      
      const userData = {
        email: "usuario.teste@example.com",
        password: hashedPassword,
        name: "Usuário de Teste",
        phone: "(71) 98888-8888",
        role: "superadmin",
        sector: "Comercial",
        active: true,
        organizationId: organizationId
      };
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (userError) throw userError;
      
      console.log("✅ User criado com sucesso:", user.id);
      results.push({
        table: 'users',
        success: true,
        message: `User criado com ID ${user.id}`,
        data: user
      });
      
      // Guardar o ID do usuário para usar em outras tabelas
      const userId = user.id;
      
      // 3. Testar tabela clients
      console.log("\n📋 Testando tabela clients...");
      
      const clientData = {
        name: "Cliente de Teste",
        email: "cliente.teste@example.com",
        phone: "(71) 97777-7777",
        cpf: "123.456.789-00",
        birthDate: "1980-01-01",
        contact: "Contato Principal",
        company: "Empresa do Cliente",
        createdById: userId,
        organizationId: organizationId
      };
      
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();
      
      if (clientError) throw clientError;
      
      console.log("✅ Client criado com sucesso:", client.id);
      results.push({
        table: 'clients',
        success: true,
        message: `Client criado com ID ${client.id}`,
        data: client
      });
      
      // Guardar o ID do cliente para usar em outras tabelas
      const clientId = client.id;
      
      // 4. Testar tabela products (que já deve ter sido populada com os dados padrão)
      console.log("\n📋 Testando tabela products...");
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');
      
      if (productsError) throw productsError;
      
      console.log(`✅ Products recuperados com sucesso: ${products.length} produtos`);
      results.push({
        table: 'products',
        success: true,
        message: `${products.length} produtos encontrados`,
        data: products
      });
      
      // Guardar o ID do primeiro produto para usar em outras tabelas
      const productId = products[0]?.id || 1;
      
      // 5. Testar tabela convenios (que já deve ter sido populada com os dados padrão)
      console.log("\n📋 Testando tabela convenios...");
      
      const { data: convenios, error: conveniosError } = await supabase
        .from('convenios')
        .select('*');
      
      if (conveniosError) throw conveniosError;
      
      console.log(`✅ Convenios recuperados com sucesso: ${convenios.length} convênios`);
      results.push({
        table: 'convenios',
        success: true,
        message: `${convenios.length} convênios encontrados`,
        data: convenios
      });
      
      // Guardar o ID do primeiro convênio para usar em outras tabelas
      const convenioId = convenios[0]?.id || 1;
      
      // 6. Testar tabela banks (que já deve ter sido populada com os dados padrão)
      console.log("\n📋 Testando tabela banks...");
      
      const { data: banks, error: banksError } = await supabase
        .from('banks')
        .select('*');
      
      if (banksError) throw banksError;
      
      console.log(`✅ Banks recuperados com sucesso: ${banks.length} bancos`);
      results.push({
        table: 'banks',
        success: true,
        message: `${banks.length} bancos encontrados`,
        data: banks
      });
      
      // Guardar o ID do primeiro banco para usar em outras tabelas
      const bankId = banks[0]?.id || 1;
      
      // 7. Testar tabela proposals
      console.log("\n📋 Testando tabela proposals...");
      
      const proposalData = {
        clientId: clientId,
        productId: productId,
        convenioId: convenioId,
        bankId: bankId,
        value: 15000.00,
        installments: 36,
        status: "pending",
        createdById: userId,
        organizationId: organizationId
      };
      
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert(proposalData)
        .select()
        .single();
      
      if (proposalError) throw proposalError;
      
      console.log("✅ Proposal criada com sucesso:", proposal.id);
      results.push({
        table: 'proposals',
        success: true,
        message: `Proposal criada com ID ${proposal.id}`,
        data: proposal
      });
      
      // 8. Testar tabela form_templates
      console.log("\n📋 Testando tabela form_templates...");
      
      const formTemplateData = {
        name: "Formulário de Teste",
        description: "Template para testes de formulário",
        fields: JSON.stringify([
          {
            type: "text",
            label: "Nome Completo",
            required: true,
            name: "fullName"
          },
          {
            type: "email",
            label: "E-mail",
            required: true,
            name: "email"
          },
          {
            type: "phone",
            label: "Telefone",
            required: true,
            name: "phone"
          }
        ]),
        organizationId: organizationId,
        createdById: userId,
        active: true
      };
      
      const { data: formTemplate, error: formTemplateError } = await supabase
        .from('form_templates')
        .insert(formTemplateData)
        .select()
        .single();
      
      if (formTemplateError) throw formTemplateError;
      
      console.log("✅ Form Template criado com sucesso:", formTemplate.id);
      results.push({
        table: 'form_templates',
        success: true,
        message: `Form Template criado com ID ${formTemplate.id}`,
        data: formTemplate
      });
      
      // Guardar o ID do template para usar em outras tabelas
      const templateId = formTemplate.id;
      
      // 9. Testar tabela form_submissions
      console.log("\n📋 Testando tabela form_submissions...");
      
      const formSubmissionData = {
        templateId: templateId,
        data: JSON.stringify({
          fullName: "Pessoa Teste da Submissão",
          email: "pessoa.teste@example.com",
          phone: "(71) 96666-6666"
        }),
        status: "pending",
        organizationId: organizationId
      };
      
      const { data: formSubmission, error: formSubmissionError } = await supabase
        .from('form_submissions')
        .insert(formSubmissionData)
        .select()
        .single();
      
      if (formSubmissionError) throw formSubmissionError;
      
      console.log("✅ Form Submission criada com sucesso:", formSubmission.id);
      results.push({
        table: 'form_submissions',
        success: true,
        message: `Form Submission criada com ID ${formSubmission.id}`,
        data: formSubmission
      });
      
    } catch (error: any) {
      console.error("❌ Erro ao testar tabela organizations:", error);
      results.push({
        table: 'organizations',
        success: false,
        message: `Erro: ${error.message || error}`,
        error
      });
    }
    
  } catch (error: any) {
    console.error("❌ Erro ao executar testes:", error);
  }
  
  // Exibir resultado final
  console.log("\n\n📊 RESULTADO FINAL DOS TESTES:");
  console.log("===============================");
  
  let allSuccess = true;
  
  for (const result of results) {
    const status = result.success ? "✅ SUCESSO" : "❌ FALHA";
    console.log(`[${status}] Tabela ${result.table}: ${result.message}`);
    
    if (!result.success) {
      allSuccess = false;
      console.log(`  Erro: ${result.error?.message || result.error || "Desconhecido"}`);
    }
  }
  
  console.log("===============================");
  console.log(allSuccess ? "✅ TODOS OS TESTES PASSARAM!" : "❌ ALGUNS TESTES FALHARAM!");
  
  return results;
}

// Executar os testes
testSupabaseTables()
  .then(() => {
    console.log("\n🏁 Testes finalizados!");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
  });