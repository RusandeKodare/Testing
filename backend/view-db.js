const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function viewDatabase() {
  const dbPath = path.join(__dirname, 'database', 'auth.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found. Start the backend server first.');
    return;
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('\n📊 DATABASE CONTENTS\n');
  console.log('📁 Location:', dbPath);
  console.log('\n👥 USERS TABLE:\n');

  const result = db.exec('SELECT id, username, created_at FROM users');
  
  if (result.length > 0 && result[0].values.length > 0) {
    console.log('┌─────┬──────────────────────┬─────────────────────┐');
    console.log('│ ID  │ Username             │ Created At          │');
    console.log('├─────┼──────────────────────┼─────────────────────┤');
    
    result[0].values.forEach(row => {
      const id = String(row[0]).padEnd(3);
      const username = String(row[1]).padEnd(20);
      const createdAt = String(row[2]).padEnd(19);
      console.log(`│ ${id} │ ${username} │ ${createdAt} │`);
    });
    
    console.log('└─────┴──────────────────────┴─────────────────────┘');
    console.log(`\n✅ Total users: ${result[0].values.length}\n`);
  } else {
    console.log('No users found in database.\n');
  }

  db.close();
}

viewDatabase().catch(err => {
  console.error('❌ Error:', err.message);
});
