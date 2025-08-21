#!/usr/bin/env node

const { execSync } = require('child_process');

// 不正なJSONフィールドを修正
function fixJsonFields() {
  console.log('🔧 Fixing JSON fields in database...\n');
  
  try {
    // personalityフィールドを修正
    console.log('Fixing personality fields...');
    execSync(`cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "UPDATE pets SET personality = '[\\"人懐っこい\\",\\"元気\\",\\"甘えん坊\\"]' WHERE personality LIKE '[人%'"`, { stdio: 'pipe' });
    
    // care_requirementsフィールドを修正
    console.log('Fixing care_requirements fields...');
    execSync(`cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "UPDATE pets SET care_requirements = '[\\"室内飼い希望\\",\\"定期健診必要\\",\\"愛情必須\\"]' WHERE care_requirements LIKE '[室%'"`, { stdio: 'pipe' });
    
    // metadataフィールドを修正（空の場合）
    console.log('Fixing metadata fields...');
    execSync(`cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "UPDATE pets SET metadata = '{}' WHERE metadata = '' OR metadata IS NULL"`, { stdio: 'pipe' });
    
    console.log('✅ JSON fields fixed successfully!');
    
    // 確認
    const result = execSync(
      'cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "SELECT id, personality, care_requirements FROM pets LIMIT 2"',
      { encoding: 'utf-8' }
    );
    console.log('\nSample records after fix:');
    console.log(result);
    
  } catch (error) {
    console.error('Error fixing JSON fields:', error);
  }
}

// 実行
fixJsonFields();