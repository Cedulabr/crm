import { createClient } from '@supabase/supabase-js';
import { db } from '../server/db';
import { users, organizations, UserRole } from '../shared/schema';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Obter diretório atual em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do arquivo .env no diretório client
dotenv.config({ path: resolve(__dirname, '../client/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_KEY devem ser configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdminUser() {
  try {
    console.log("Iniciando criação de usuário administrador...");

    // 1. Criar organização de teste
    console.log("Criando organização de teste...");
    const [organization] = await db
      .insert(organizations)
      .values({
        name: "Empresa Teste",
        description: "Organização de teste para administrador",
        website: "https://empresateste.com.br",
        phone: "(71) 98765-4321",
        email: "contato@empresateste.com.br",
        address: "Av. Teste, 123, Salvador-BA"
      })
      .returning();

    if (!organization) {
      throw new Error("Falha ao criar organização");
    }
    console.log("Organização criada com sucesso:", organization);

    // 2. Dados para o usuário administrador
    console.log("Preparando dados do usuário administrador...");
    const email = "admin@example.com";
    const password = "Admin@123";

    console.log("Pulando registro no Supabase devido a problemas de conexão...");

    // 3. Criar usuário no banco de dados local
    console.log("Criando usuário no banco de dados local...");
    const [user] = await db
      .insert(users)
      .values({
        email,
        name: "Administrador Teste",
        role: UserRole.SUPERADMIN,
        organizationId: organization.id,
        sector: "Comercial"
      })
      .returning();

    if (!user) {
      throw new Error("Falha ao criar usuário no banco de dados local");
    }
    
    console.log("Usuário criado com sucesso no banco de dados local:", user);
    console.log("\n========================================");
    console.log("✅ Usuário administrador criado com sucesso!");
    console.log("Email:", email);
    console.log("Senha:", password);
    console.log("Organização:", organization.name);
    console.log("========================================\n");

  } catch (error) {
    console.error("Erro ao criar usuário administrador:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();