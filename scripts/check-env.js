#!/usr/bin/env node
require('dotenv').config();

console.log('Verificando variáveis de ambiente:');
console.log('===================================');

// Verificar variáveis do Supabase
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('VITE_SUPABASE_KEY:', process.env.VITE_SUPABASE_KEY ? '✅ Configurado' : '❌ NÃO CONFIGURADO');

// Mostrar valores parciais para diagnóstico (sem comprometer segurança)
if (process.env.SUPABASE_URL) {
  console.log('SUPABASE_URL começa com:', process.env.SUPABASE_URL.substring(0, 10) + '...');
}
if (process.env.SUPABASE_KEY) {
  console.log('SUPABASE_KEY começa com:', process.env.SUPABASE_KEY.substring(0, 5) + '...');
}

// Verificar a localização do arquivo .env
const fs = require('fs');
const path = require('path');

const envPaths = [
  '.env',
  '../.env',
  '../../.env',
  path.resolve(process.cwd(), '.env')
];

console.log('\nProcurando arquivo .env:');
envPaths.forEach(envPath => {
  try {
    const stat = fs.statSync(envPath);
    console.log(`✅ Arquivo encontrado em: ${envPath} (${stat.size} bytes)`);
  } catch (e) {
    console.log(`❌ Não encontrado em: ${envPath}`);
  }
});

// Verificar NODE_ENV
console.log('\nAmbiente:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'não definido');
console.log('Diretório atual:', process.cwd());