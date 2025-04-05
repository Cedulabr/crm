import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function updateAdminPassword() {
  try {
    // Encontrar o usuário admin
    const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
    
    if (!adminUser) {
      console.log('Usuário admin não encontrado');
      return;
    }
    
    console.log('Atualizando senha do usuário admin (ID:', adminUser.id, ')');
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    // Atualizar a senha
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, adminUser.id));
    
    console.log('Senha do usuário admin atualizada com sucesso!');
    console.log('\nCredenciais de acesso:');
    console.log('Email: admin@example.com');
    console.log('Senha: Admin@123');
    
  } catch (error) {
    console.error('Erro ao atualizar senha do admin:', error);
  }
}

updateAdminPassword();