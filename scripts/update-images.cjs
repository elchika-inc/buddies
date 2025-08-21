#!/usr/bin/env node

const { execSync } = require('child_process');

// Unsplashの犬と猫の画像URL
const dogImages = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e',
  'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
  'https://images.unsplash.com/photo-1552053831-71594a27632d',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2',
  'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9',
  'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6',
  'https://images.unsplash.com/photo-1560807707-8cc77767d783'
];

const catImages = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce',
  'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006',
  'https://images.unsplash.com/photo-1519052537078-e6302a4968d4',
  'https://images.unsplash.com/photo-1494256997604-768d1f608cac',
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8',
  'https://images.unsplash.com/photo-1548247416-ec66f4900b2e',
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987'
];

// IDごとに異なる画像を割り当てる
console.log('Updating pet images with Unsplash URLs...\n');

// 犬の画像を更新
console.log('Updating dog images...');
for (let i = 0; i < 60; i++) {
  const imageUrl = dogImages[i % dogImages.length] + '?w=600&h=600&fit=crop';
  const sql = `UPDATE pets SET image_url = '${imageUrl}' WHERE type = 'dog' LIMIT 1 OFFSET ${i}`;
  
  try {
    execSync(`wrangler d1 execute pawmatch-db --local --command "${sql}"`, { 
      stdio: 'pipe',
      cwd: '/Users/nishikawa/projects/elchika/pawmatch/api'
    });
    process.stdout.write('.');
  } catch (error) {
    process.stdout.write('x');
  }
}

console.log('\n\nUpdating cat images...');
// 猫の画像を更新
for (let i = 0; i < 60; i++) {
  const imageUrl = catImages[i % catImages.length] + '?w=600&h=600&fit=crop';
  const sql = `UPDATE pets SET image_url = '${imageUrl}' WHERE type = 'cat' LIMIT 1 OFFSET ${i}`;
  
  try {
    execSync(`wrangler d1 execute pawmatch-db --local --command "${sql}"`, { 
      stdio: 'pipe',
      cwd: '/Users/nishikawa/projects/elchika/pawmatch/api'
    });
    process.stdout.write('.');
  } catch (error) {
    process.stdout.write('x');
  }
}

console.log('\n\n✅ Image URLs updated successfully!');

// 確認
const result = execSync(
  'wrangler d1 execute pawmatch-db --local --command "SELECT id, name, image_url FROM pets LIMIT 3"',
  { encoding: 'utf-8', cwd: '/Users/nishikawa/projects/elchika/pawmatch/api' }
);
console.log('\nSample records:');
console.log(result);