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

async function query(text, params) {
  try {
    console.log("[db] Executando query...");
    const result = await pool.query(text, params);
    console.log("[db] Query executada com sucesso. Linhas retornadas:", result.rows?.length || 0);
    return result;
  } catch (error) {
    console.error("[db] Erro ao executar query:", error.message);
    console.error("[db] Código do erro:", error.code);
    console.error("[db] Detalhes:", error.detail);
    console.error("[db] Constraint:", error.constraint);
    console.error("[db] Schema:", error.schema);
    console.error("[db] Tabela:", error.table);
    throw error;
  }
}

module.exports = { query };
