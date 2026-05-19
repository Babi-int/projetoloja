/**
 * Migração única: hasheia senhas em texto puro no Firestore.
 * Executa apenas em documentos cujo campo password NÃO começa com $2b$ (bcrypt).
 * Seguro para rodar mais de uma vez.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { db } = require("../src/database/firebase");

async function run() {
  console.log("Buscando usuarios no Firestore...");
  const snapshot = await db.collection("users").get();

  if (snapshot.empty) {
    console.log("Nenhum usuario encontrado.");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { email, password } = data;

    const alreadyHashed = typeof password === "string" && password.startsWith("$2b$");

    if (alreadyHashed) {
      console.log(`  [ok]     ${email} — ja possui hash bcrypt`);
      skipped++;
      continue;
    }

    if (!password) {
      console.log(`  [aviso]  ${email} — sem senha, pulando`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.collection("users").doc(doc.id).update({
      password: hashed,
      updatedAt: new Date().toISOString()
    });

    console.log(`  [hash]   ${email} — senha migrada`);
    migrated++;
  }

  console.log(`\nConcluido: ${migrated} migrado(s), ${skipped} ignorado(s).`);
}

run().catch((err) => {
  console.error("Erro na migracao:", err.message);
  process.exit(1);
});
