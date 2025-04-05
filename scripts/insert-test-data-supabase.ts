/**
 * Script para inserir dados de teste nas tabelas do Supabase
 * Este script é simplificado e adaptado para o schema real das tabelas
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

async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

async function insertTestData() {
  console.log("🚀 Iniciando inserção de dados de teste no Supabase...");
  
  try {
    // 1. Inserir organização de teste
    console.log("\n📌 Inserindo organização de teste...");
    const orgData = {
      name: "Empresa Teste",
      description: "Organização criada para testes"
    };
    
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();
    
    if (orgError) {
      console.error("❌ Erro ao inserir organização:", orgError);
      return;
    }
    
    console.log("✅ Organização inserida com sucesso, ID:", org.id);
    const organizationId = org.id;
    
    // 2. Inserir usuário de teste (superadmin)
    console.log("\n📌 Inserindo usuário superadmin de teste...");
    const hashedPassword = await hashPassword("Teste@123");
    
    const userData = {
      email: "admin.teste@example.com",
      password: hashedPassword,
      name: "Admin de Teste",
      role: "superadmin",
      "organizationId": organizationId
    };
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (userError) {
      console.error("❌ Erro ao inserir usuário:", userError);
      return;
    }
    
    console.log("✅ Usuário inserido com sucesso, ID:", user.id);
    const userId = user.id;
    
    // 3. Inserir cliente de teste
    console.log("\n📌 Inserindo cliente de teste...");
    const clientData = {
      name: "Cliente de Teste",
      email: "cliente@teste.com",
      phone: "(71) 99999-9999",
      cpf: "123.456.789-00",
      "createdById": userId,
      "organizationId": organizationId
    };
    
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (clientError) {
      console.error("❌ Erro ao inserir cliente:", clientError);
      return;
    }
    
    console.log("✅ Cliente inserido com sucesso, ID:", client.id);
    const clientId = client.id;
    
    // 4. Inserir produto de teste (se não existir)
    console.log("\n📌 Verificando produtos...");
    const { data: existingProducts, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    if (productsError) {
      console.error("❌ Erro ao verificar produtos:", productsError);
      return;
    }
    
    let productId;
    
    if (!existingProducts || existingProducts.length === 0) {
      console.log("Inserindo produtos padrão...");
      const productData = {
        name: "Novo empréstimo",
        description: "Empréstimo para novos clientes",
        "maxValue": 50000
      };
      
      const { data: product, error: productInsertError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (productInsertError) {
        console.error("❌ Erro ao inserir produto:", productInsertError);
        return;
      }
      
      console.log("✅ Produto inserido com sucesso, ID:", product.id);
      productId = product.id;
    } else {
      console.log(`✅ ${existingProducts.length} produtos já existem.`);
      productId = existingProducts[0].id;
    }
    
    // 5. Inserir convênio de teste (se não existir)
    console.log("\n📌 Verificando convênios...");
    const { data: existingConvenios, error: conveniosError } = await supabase
      .from('convenios')
      .select('*');
    
    if (conveniosError) {
      console.error("❌ Erro ao verificar convênios:", conveniosError);
      return;
    }
    
    let convenioId;
    
    if (!existingConvenios || existingConvenios.length === 0) {
      console.log("Inserindo convênios padrão...");
      const convenioData = {
        name: "Beneficiário do INSS",
        description: "Aposentados e pensionistas do INSS"
      };
      
      const { data: convenio, error: convenioInsertError } = await supabase
        .from('convenios')
        .insert(convenioData)
        .select()
        .single();
      
      if (convenioInsertError) {
        console.error("❌ Erro ao inserir convênio:", convenioInsertError);
        return;
      }
      
      console.log("✅ Convênio inserido com sucesso, ID:", convenio.id);
      convenioId = convenio.id;
    } else {
      console.log(`✅ ${existingConvenios.length} convênios já existem.`);
      convenioId = existingConvenios[0].id;
    }
    
    // 6. Inserir banco de teste (se não existir)
    console.log("\n📌 Verificando bancos...");
    const { data: existingBanks, error: banksError } = await supabase
      .from('banks')
      .select('*');
    
    if (banksError) {
      console.error("❌ Erro ao verificar bancos:", banksError);
      return;
    }
    
    let bankId;
    
    if (!existingBanks || existingBanks.length === 0) {
      console.log("Inserindo bancos padrão...");
      const bankData = {
        name: "BANCO TESTE",
        code: "999"
      };
      
      const { data: bank, error: bankInsertError } = await supabase
        .from('banks')
        .insert(bankData)
        .select()
        .single();
      
      if (bankInsertError) {
        console.error("❌ Erro ao inserir banco:", bankInsertError);
        return;
      }
      
      console.log("✅ Banco inserido com sucesso, ID:", bank.id);
      bankId = bank.id;
    } else {
      console.log(`✅ ${existingBanks.length} bancos já existem.`);
      bankId = existingBanks[0].id;
    }
    
    // 7. Inserir proposta de teste
    console.log("\n📌 Inserindo proposta de teste...");
    const proposalData = {
      "clientId": clientId,
      "productId": productId,
      "convenioId": convenioId,
      "bankId": bankId,
      value: 25000,
      installments: 48,
      status: "pending",
      "createdById": userId,
      "organizationId": organizationId
    };
    
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();
    
    if (proposalError) {
      console.error("❌ Erro ao inserir proposta:", proposalError);
      return;
    }
    
    console.log("✅ Proposta inserida com sucesso, ID:", proposal.id);
    
    // 8. Inserir modelo de formulário de teste
    console.log("\n📌 Inserindo modelo de formulário de teste...");
    const formTemplateData = {
      name: "Formulário de Captura de Lead",
      description: "Formulário para capturar informações básicas de leads",
      fields: JSON.stringify([
        { type: "text", name: "name", label: "Nome Completo", required: true },
        { type: "email", name: "email", label: "E-mail", required: true },
        { type: "phone", name: "phone", label: "Telefone", required: true },
        { type: "cpf", name: "cpf", label: "CPF", required: true }
      ]),
      "organizationId": organizationId,
      "createdById": userId,
      active: true
    };
    
    const { data: formTemplate, error: formTemplateError } = await supabase
      .from('form_templates')
      .insert(formTemplateData)
      .select()
      .single();
    
    if (formTemplateError) {
      console.error("❌ Erro ao inserir modelo de formulário:", formTemplateError);
      return;
    }
    
    console.log("✅ Modelo de formulário inserido com sucesso, ID:", formTemplate.id);
    
    // 9. Inserir submissão de formulário de teste
    console.log("\n📌 Inserindo submissão de formulário de teste...");
    const formSubmissionData = {
      "templateId": formTemplate.id,
      data: JSON.stringify({
        name: "Lead de Teste",
        email: "lead@teste.com",
        phone: "(71) 98888-8888",
        cpf: "987.654.321-00"
      }),
      status: "pending",
      "organizationId": organizationId
    };
    
    const { data: formSubmission, error: formSubmissionError } = await supabase
      .from('form_submissions')
      .insert(formSubmissionData)
      .select()
      .single();
    
    if (formSubmissionError) {
      console.error("❌ Erro ao inserir submissão de formulário:", formSubmissionError);
      return;
    }
    
    console.log("✅ Submissão de formulário inserida com sucesso, ID:", formSubmission.id);
    
    // Resumo final
    console.log("\n✅ DADOS DE TESTE INSERIDOS COM SUCESSO!");
    console.log("Organização: ID", organizationId);
    console.log("Usuário Admin: ID", userId, "- Email: admin.teste@example.com - Senha: Teste@123");
    console.log("Cliente: ID", clientId);
    console.log("Proposta: ID", proposal.id);
    console.log("Modelo de Formulário: ID", formTemplate.id);
    console.log("Submissão de Formulário: ID", formSubmission.id);
    
  } catch (error) {
    console.error("❌ Erro fatal ao inserir dados de teste:", error);
  }
}

// Executar a inserção de dados
insertTestData()
  .then(() => {
    console.log("\n🏁 Processo finalizado!");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Erro não tratado:", error);
    process.exit(1);
  });