
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/vendedor.db');

console.log(`🔌 Conectando ao banco em: ${dbPath}`);
const db = new Database(dbPath);

try {
    console.log('🔄 Verificando esquema...');

    // Verifica se a columa já existe
    const tableInfo = db.pragma('table_info(messages)');
    const hasThought = tableInfo.some(col => col.name === 'thought');

    if (!hasThought) {
        console.log('📝 Adicionando coluna "thought" na tabela messages...');
        db.prepare('ALTER TABLE messages ADD COLUMN thought TEXT').run();
        console.log('✅ Migração concluída com sucesso!');
    } else {
        console.log('✅ Coluna "thought" já existe. Nenhuma alteração necessária.');
    }

} catch (error) {
    console.error('❌ Erro durante migração:', error.message);
} finally {
    db.close();
}
