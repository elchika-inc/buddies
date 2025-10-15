const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// スクリーンショット対象URL
const USE_LOCAL = process.env.USE_LOCAL === 'true';
const URLS = USE_LOCAL
  ? { dog: 'http://localhost:3004', cat: 'http://localhost:3004' }
  : { dog: 'https://buddies-dogs.elchika.app', cat: 'https://buddies-cats.elchika.app' };

// スマホサイズ（iPhone X/12/13相当）
const MOBILE_VIEWPORT = { width: 375, height: 812 };

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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // PWAプロンプトを無効化
    await page.evaluate(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        return false;
      });
    });

    await page.waitForTimeout(2000);
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
 * メイン処理
 */
async function takeScreenshots() {
  console.log('🚀 スクリーンショット取得開始...\n');

  const browser = await chromium.launch({ headless: true });

  try {
    for (const [petType, url] of Object.entries(URLS)) {
      await captureForPetType(browser, petType, url);
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
