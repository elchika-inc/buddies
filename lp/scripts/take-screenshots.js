const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

// スクリーンショット対象URL
const USE_LOCAL = process.env.USE_LOCAL === 'true';
const URLS = USE_LOCAL
  ? { dog: 'http://localhost:3004', cat: 'http://localhost:3004' }
  : { dog: 'https://buddies-dogs.elchika.app', cat: 'https://buddies-cats.elchika.app' };

// スマホサイズ（iPhone X/12/13相当）
const MOBILE_VIEWPORT = { width: 375, height: 812 };

// サーバー起動待機時間（ミリ秒）
const SERVER_STARTUP_WAIT = 15000;

/**
 * PWAインストールプロンプトを閉じる
 */
async function closePWAPrompt(page) {
  try {
    const closeButton = page.getByRole('button', { name: '閉じる' });
    if (await closeButton.count() > 0) {
      await closeButton.click({ timeout: 2000 });
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // プロンプトがなければスキップ
  }
}

/**
 * 固定モーダルやPWAプロンプトをDOMから削除
 */
async function removeModals(page) {
  await page.evaluate(() => {
    // z-50のモーダルを削除
    const modals = document.querySelectorAll('.fixed.z-50, [class*="z-50"]');
    modals.forEach(modal => modal.remove());

    // PWAプロンプトのDOM要素を削除
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('ホーム画面に追加') && (text.includes('閉じる') || text.includes('共有ボタン'))) {
        const modal = el.closest('.fixed, [role="dialog"], .modal');
        if (modal) modal.remove();
      }
    });
  });
  await page.waitForTimeout(500);
}

/**
 * 1. ヒーロー画面のスクリーンショット取得
 */
async function captureHeroScreen(page, outputDir) {
  console.log('   ⏳ 1/4 ヒーロー画面...');
  await page.screenshot({
    type: 'png',
    fullPage: false,
    path: path.join(outputDir, 'hero.png'),
  });
  console.log('   ✅ 1/4 完了');
}

/**
 * 2. ペット詳細モーダルのスクリーンショット取得
 */
async function captureDetailModal(page, outputDir) {
  console.log('   ⏳ 2/4 詳細モーダル...');
  try {
    // 画面中央（カードの位置）をクリック
    const centerX = MOBILE_VIEWPORT.width / 2;
    const centerY = MOBILE_VIEWPORT.height / 2;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(3000);

    await removeModals(page);
    await page.screenshot({
      type: 'png',
      fullPage: false,
      path: path.join(outputDir, 'detail.png'),
    });
    console.log('   ✅ 2/4 完了');

    // モーダルを閉じる
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.log('   ⚠️  詳細モーダル取得失敗:', e.message);
    // フォールバック：ヒーロー画面をコピー
    fs.copyFileSync(
      path.join(outputDir, 'hero.png'),
      path.join(outputDir, 'detail.png')
    );
    console.log('   ✅ 2/4 完了（フォールバック）');
  }
}

/**
 * 3. お気に入り画面のスクリーンショット取得
 */
async function captureFavorites(page, outputDir) {
  console.log('   ⏳ 3/4 お気に入りに登録中...');
  try {
    await closePWAPrompt(page);

    // 「いいね」ボタンを4回クリック
    const likeButton = page.getByRole('button', { name: /いいね/i });
    for (let i = 0; i < 4; i++) {
      if (await likeButton.count() > 0) {
        await likeButton.click({ force: true });
        await page.waitForTimeout(800);
      }
    }
    console.log('   ✅ 3/4 完了（4匹をお気に入りに登録）');
  } catch (e) {
    console.log('   ⚠️  お気に入り登録スキップ:', e.message);
  }

  console.log('   ⏳ 4/4 お気に入り画面...');
  try {
    // モーダルを強制的に閉じる
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    await closePWAPrompt(page);

    // お気に入りボタンをクリック
    const favButton = page.getByRole('button', { name: /お気に入り/i });
    if (await favButton.count() > 0) {
      await favButton.click({ force: true });
      await page.waitForTimeout(3000);

      await page.screenshot({
        type: 'png',
        fullPage: false,
        path: path.join(outputDir, 'favorites.png'),
      });
      console.log('   ✅ 4/4 完了');
    } else {
      throw new Error('お気に入りボタンが見つかりません');
    }
  } catch (e) {
    console.log('   ⚠️  お気に入り画面取得失敗:', e.message);
    // フォールバック：ヒーロー画面をコピー
    fs.copyFileSync(
      path.join(outputDir, 'hero.png'),
      path.join(outputDir, 'favorites.png')
    );
    console.log('   ✅ 4/4 完了（フォールバック）');
  }
}

/**
 * ポート3004のプロセスを停止
 */
function killPort3004() {
  try {
    console.log('   🔌 ポート3004のプロセスを停止中...');
    execSync('lsof -ti:3004 | xargs kill -9 2>/dev/null || true', { stdio: 'ignore' });
    // プロセス終了を確実にするため少し待機
    execSync('sleep 2');
    console.log('   ✅ ポート3004を解放しました\n');
  } catch (e) {
    // ポートが使われていなければスキップ
    console.log('   ℹ️  ポート3004は使用されていませんでした\n');
  }
}

/**
 * フロントエンドサーバーを起動
 */
async function startFrontendServer(petType) {
  return new Promise((resolve, reject) => {
    console.log(`   🚀 ${petType.toUpperCase()} 用サーバーを起動中...`);

    const frontendDir = path.join(__dirname, '../../frontend');
    const env = {
      ...process.env,
      NEXT_PUBLIC_PET_TYPE: petType
    };

    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      env,
      detached: false,
      stdio: 'ignore'
    });

    serverProcess.on('error', (error) => {
      console.error(`   ❌ サーバー起動エラー: ${error.message}`);
      reject(error);
    });

    // サーバー起動を待機
    console.log(`   ⏳ サーバー起動を待機中（${SERVER_STARTUP_WAIT / 1000}秒）...`);
    setTimeout(() => {
      console.log(`   ✅ ${petType.toUpperCase()} 用サーバー起動完了\n`);
      resolve(serverProcess);
    }, SERVER_STARTUP_WAIT);
  });
}

/**
 * ペットタイプ（犬/猫）のスクリーンショットを取得
 */
async function captureForPetType(browser, petType, url) {
  console.log(`📸 ${petType.toUpperCase()} サイトのスクリーンショット取得中...`);
  console.log(`   URL: ${url}\n`);

  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    serviceWorkers: 'block',
  });

  const page = await context.newPage();
  const outputDir = path.join(__dirname, `../public/screenshots/${petType}`);

  // 出力ディレクトリ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // ページアクセス＆初期化
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // PWAプロンプトを無効化
    await page.evaluate(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        return false;
      });
    });

    // ペットカードが表示されるまで待機（最大30秒）
    console.log('   ⏳ ペットデータの読み込みを待機中...');
    try {
      await page.waitForSelector('button[name*="いいね"], button:has-text("いいね")', {
        timeout: 30000,
        state: 'visible'
      });
      console.log('   ✅ ペットデータ読み込み完了');
    } catch (e) {
      console.log('   ⚠️  タイムアウト: ペットデータの読み込みに時間がかかっています');
    }

    // データが読み込まれるまでさらに待機
    await page.waitForTimeout(3000);
    await closePWAPrompt(page);
    await removeModals(page);

    // スクリーンショット取得
    await captureHeroScreen(page, outputDir);
    await captureDetailModal(page, outputDir);
    await captureFavorites(page, outputDir);
  } catch (error) {
    console.error(`   ❌ エラー: ${error.message}\n`);
  }

  await context.close();
}

/**
 * ローカル環境でのスクリーンショット取得（サーバー起動・停止を含む）
 */
async function takeLocalScreenshots(browser) {
  const petTypes = ['dog', 'cat'];

  for (const petType of petTypes) {
    let serverProcess = null;

    try {
      // 既存のサーバーを停止
      killPort3004();

      // ペットタイプに応じたサーバーを起動
      serverProcess = await startFrontendServer(petType);

      // スクリーンショット取得
      await captureForPetType(browser, petType, URLS[petType]);

    } finally {
      // サーバーを停止
      if (serverProcess) {
        console.log(`   🛑 ${petType.toUpperCase()} 用サーバーを停止中...`);
        serverProcess.kill('SIGTERM');
        // 確実に停止するため、少し待機してから強制終了
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          serverProcess.kill('SIGKILL');
        } catch (e) {
          // 既に停止している場合はスキップ
        }
        console.log(`   ✅ ${petType.toUpperCase()} 用サーバー停止完了\n`);
      }
      killPort3004();
    }
  }
}

/**
 * リモート環境でのスクリーンショット取得
 */
async function takeRemoteScreenshots(browser) {
  for (const [petType, url] of Object.entries(URLS)) {
    await captureForPetType(browser, petType, url);
  }
}

/**
 * メイン処理
 */
async function takeScreenshots() {
  console.log('🚀 スクリーンショット取得開始...\n');

  if (USE_LOCAL) {
    console.log('📍 ローカル環境モード: サーバーを自動起動・停止します\n');
  } else {
    console.log('📍 リモート環境モード: 本番サイトからスクリーンショットを取得します\n');
  }

  const browser = await chromium.launch({ headless: true });

  try {
    if (USE_LOCAL) {
      await takeLocalScreenshots(browser);
    } else {
      await takeRemoteScreenshots(browser);
    }
  } finally {
    await browser.close();
  }

  console.log('✨ すべてのスクリーンショット取得完了！\n');
  console.log('📁 保存先: lp/public/screenshots/\n');
}

// 実行
takeScreenshots().catch((error) => {
  console.error('❌ スクリプトエラー:', error);
  process.exit(1);
});
