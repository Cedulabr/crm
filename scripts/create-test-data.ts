import { db } from '../server/db';
import { 
  clients, 
  proposals, 
  products, 
  convenios, 
  banks, 
  formTemplates,
  FormFieldType
} from '../shared/schema';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

async function createTestData() {
  try {
    console.log("Iniciando criação de dados de teste...");
    
    // Buscar usuário administrador e sua organização
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "admin@example.com")
    });
    
    if (!adminUser) {
      throw new Error("Usuário administrador não encontrado. Execute o script create-admin-user.ts primeiro.");
    }
    
    const organizationId = adminUser.organizationId;
    const userId = adminUser.id;
    
    console.log(`Usando organização ID: ${organizationId} e usuário ID: ${userId}`);
    
    // 1. Criar cliente de teste
    console.log("Criando cliente de teste...");
    const [client] = await db
      .insert(clients)
      .values({
        name: "João da Silva",
        cpf: "031.458.655-52",
        email: "joao.silva@email.com",
        phone: "(71)98600-7832",
        createdById: userId,
        organizationId: organizationId
      })
      .returning();
      
    if (!client) {
      throw new Error("Falha ao criar cliente de teste");
    }
    console.log("Cliente criado com sucesso:", client);
    
    // 2. Obter produto para proposta
    const product = await db.query.products.findFirst();
    if (!product) {
      throw new Error("Nenhum produto encontrado no banco de dados");
    }
    
    // 3. Obter convênio - especificamente Beneficiário do INSS
    const convenio = await db.query.convenios.findFirst({
      where: (convenios, { eq }) => eq(convenios.name, "Beneficiário do INSS")
    });
    if (!convenio) {
      throw new Error("Convênio 'Beneficiário do INSS' não encontrado");
    }
    
    // 4. Obter banco
    const bank = await db.query.banks.findFirst();
    if (!bank) {
      throw new Error("Nenhum banco encontrado no banco de dados");
    }
    
    // 5. Criar proposta de teste
    console.log("Criando proposta de teste...");
    const [proposal] = await db
      .insert(proposals)
      .values({
        clientId: client.id,
        productId: product.id,
        convenioId: convenio.id,
        bankId: bank.id,
        value: "5000",
        status: "Em análise",
        createdById: userId,
        organizationId: organizationId,
        comments: "Proposta de teste criada via script"
      })
      .returning();
      
    if (!proposal) {
      throw new Error("Falha ao criar proposta de teste");
    }
    console.log("Proposta criada com sucesso:", proposal);
    
    // 6. Criar formulário de teste
    console.log("Criando formulário de teste...");
    const formFields = [
      {
        id: "field_1",
        name: "name",
        label: "Nome Completo",
        type: FormFieldType.TEXT,
        required: true
      },
      {
        id: "field_2",
        name: "cpf",
        label: "CPF",
        type: FormFieldType.CPF,
        required: true
      },
      {
        id: "field_3",
        name: "phone",
        label: "Telefone",
        type: FormFieldType.PHONE,
        required: true
      },
      {
        id: "field_4",
        name: "convenio",
        label: "Convênio",
        type: FormFieldType.SELECT,
        required: true,
        options: [
          { label: "Beneficiário do INSS", value: "inss" }
        ]
      }
    ];
    
    const [formTemplate] = await db
      .insert(formTemplates)
      .values({
        name: "Formulário de Captação de Leads",
        description: "Formulário para captação de leads para empréstimo consignado",
        fields: formFields,
        active: true,
        createdById: userId,
        organizationId: organizationId
      })
      .returning();
      
    if (!formTemplate) {
      throw new Error("Falha ao criar formulário de teste");
    }
    console.log("Formulário criado com sucesso:", formTemplate);
    
    console.log("\n========================================");
    console.log("✅ Dados de teste criados com sucesso!");
    console.log("Cliente:", client.name);
    console.log("Proposta:", `R$ ${proposal.value}`);
    console.log("Formulário:", formTemplate.name);
    console.log("========================================\n");
    
  } catch (error) {
    console.error("Erro ao criar dados de teste:", error);
  } finally {
    process.exit(0);
  }
}

createTestData();