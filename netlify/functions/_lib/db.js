// netlify/functions/_lib/db.js
const { Pool } = require("pg");

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("[db] DATABASE_URL não configurado");
  throw new Error("DATABASE_URL não configurado");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[db] Erro inesperado no pool de conexões:', err.message);
});

/**
 * Generate a unique tracking ID for each query
 * Using timestamp + random for better uniqueness
 */
function generateTrackingId() {
  const timestamp = Date.now().toString(36).slice(-4);
  const random = Math.random().toString(36).substring(2, 6);
  return timestamp + random;
}

async function query(text, params) {
  const trackingId = generateTrackingId();
  
  try {
    console.log(`[db:${trackingId}] Executando query...`);
    // Log first 200 characters of query for debugging
    const queryPreview = text.length > 200 ? text.substring(0, 200) + '...' : text;
    console.log(`[db:${trackingId}] SQL Preview: ${queryPreview}`);
    
    const result = await pool.query(text, params);
    console.log(`[db:${trackingId}] Query executada com sucesso. Linhas retornadas: ${result.rows?.length || 0}`);
    return result;
  } catch (error) {
    console.error(`[db:${trackingId}] ❌ ERRO AO EXECUTAR QUERY`);
    console.error(`[db:${trackingId}] SQL completo: ${text}`);
    console.error(`[db:${trackingId}] Params: ${JSON.stringify(params)}`); // Note: may contain sensitive data
    console.error(`[db:${trackingId}] Mensagem: ${error.message}`);
    console.error(`[db:${trackingId}] Código: ${error.code}`);
    console.error(`[db:${trackingId}] Detalhes: ${error.detail || 'N/A'}`);
    console.error(`[db:${trackingId}] Constraint: ${error.constraint || 'N/A'}`);
    console.error(`[db:${trackingId}] Schema: ${error.schema || 'N/A'}`);
    console.error(`[db:${trackingId}] Tabela: ${error.table || 'N/A'}`);
    console.error(`[db:${trackingId}] Column: ${error.column || 'N/A'}`);
    console.error(`[db:${trackingId}] Position: ${error.position || 'N/A'}`);
    console.error(`[db:${trackingId}] Stack: ${error.stack}`);
    throw error;
  }
}

module.exports = { query };
