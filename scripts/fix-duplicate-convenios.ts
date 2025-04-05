import { db } from '../server/db';
import { convenios, clients, proposals } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';

async function fixDuplicateConvenios() {
  try {
    console.log('Iniciando correção de convênios duplicados...');
    
    // Mapeamento de convênios duplicados para originais
    const convenioMapping = {
      9: 5,   // Beneficiário do INSS -> ID 5
      10: 6,  // Servidor Público -> ID 6
      11: 7,  // LOAS/BPC -> ID 7
      12: 8,  // Carteira assinada CLT -> ID 8
      13: 5,  // Beneficiário do INSS -> ID 5
      14: 6,  // Servidor Público -> ID 6
      15: 7,  // LOAS/BPC -> ID 7
      16: 8   // Carteira assinada CLT -> ID 8
    };
    
    // Lista de convênios únicos que queremos manter
    const uniqueConvenios = [
      { id: 5, name: 'Beneficiário do INSS', price: 'R$ 3.000,00' },
      { id: 6, name: 'Servidor Público', price: 'R$ 5.000,00' },
      { id: 7, name: 'LOAS/BPC', price: 'R$ 1.500,00' },
      { id: 8, name: 'Carteira assinada CLT', price: 'R$ 4.000,00' }
    ];
    
    // Obter todos os convênios
    const allConvenios = await db.select().from(convenios);
    console.log(`Encontrados ${allConvenios.length} convênios no banco de dados`);
    
    // Atualizar os 4 primeiros convênios para garantir valores corretos
    for (const convenio of uniqueConvenios) {
      await db.update(convenios)
        .set({ name: convenio.name, price: convenio.price })
        .where(eq(convenios.id, convenio.id));
      
      console.log(`Atualizado convênio ID ${convenio.id}: ${convenio.name}, Preço: ${convenio.price}`);
    }
    
    // Lista de IDs duplicados
    const duplicateIds = Object.keys(convenioMapping).map(Number);
    
    // 1. Atualizar os clientes que usam convênios duplicados
    console.log('Verificando clientes que usam convênios duplicados...');
    const clientsWithDuplicateConvenios = await db.select()
      .from(clients)
      .where(inArray(clients.convenioId, duplicateIds));
    
    console.log(`Encontrados ${clientsWithDuplicateConvenios.length} clientes usando convênios duplicados`);
    
    // Atualizar cada cliente para usar o convênio original
    for (const client of clientsWithDuplicateConvenios) {
      const oldConvenioId = client.convenioId;
      if (oldConvenioId !== null && oldConvenioId !== undefined) {
        const newConvenioId = convenioMapping[oldConvenioId as keyof typeof convenioMapping];
        
        if (newConvenioId) {
          await db.update(clients)
            .set({ convenioId: newConvenioId })
            .where(eq(clients.id, client.id));
          
          console.log(`Cliente ID ${client.id}: Convênio atualizado de ${oldConvenioId} para ${newConvenioId}`);
        }
      }
    }
    
    // 2. Atualizar as propostas que usam convênios duplicados
    console.log('Verificando propostas que usam convênios duplicados...');
    const proposalsWithDuplicateConvenios = await db.select()
      .from(proposals)
      .where(inArray(proposals.convenioId, duplicateIds));
    
    console.log(`Encontradas ${proposalsWithDuplicateConvenios.length} propostas usando convênios duplicados`);
    
    // Atualizar cada proposta para usar o convênio original
    for (const proposal of proposalsWithDuplicateConvenios) {
      const oldConvenioId = proposal.convenioId;
      if (oldConvenioId !== null && oldConvenioId !== undefined) {
        const newConvenioId = convenioMapping[oldConvenioId as keyof typeof convenioMapping];
        
        if (newConvenioId) {
          await db.update(proposals)
            .set({ convenioId: newConvenioId })
            .where(eq(proposals.id, proposal.id));
          
          console.log(`Proposta ID ${proposal.id}: Convênio atualizado de ${oldConvenioId} para ${newConvenioId}`);
        }
      }
    }
    
    // Agora podemos remover os convênios duplicados
    console.log('Removendo convênios duplicados...');
    for (const oldId of duplicateIds) {
      try {
        await db.delete(convenios).where(eq(convenios.id, oldId));
        console.log(`Removido convênio ID ${oldId}`);
      } catch (err) {
        console.warn(`Não foi possível remover convênio ID ${oldId}: ${err.message}`);
      }
    }
    
    // Verificar resultado
    const remainingConvenios = await db.select().from(convenios);
    console.log('Convênios restantes após a limpeza:');
    console.log(remainingConvenios);
    console.log('Correção de convênios duplicados concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir convênios duplicados:', error);
  }
}

fixDuplicateConvenios();