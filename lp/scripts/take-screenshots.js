const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// スクリーンショット対象URL
const URLS = {
  dog: 'https://buddies-dogs.elchika.app',
  cat: 'https://buddies-cats.elchika.app',
};

// スマホサイズ（iPhone X/12/13相当）
const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
};

// スクリーンショット設定
const SCREENSHOT_CONFIG = {
  type: 'png',
  fullPage: false,
};

/**
 * スクリーンショットを取得
 */
async function takeScreenshots() {
  console.log('🚀 スクリーンショット取得開始...\n');

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    for (const [petType, url] of Object.entries(URLS)) {
      console.log(`📸 ${petType.toUpperCase()} サイトのスクリーンショット取得中...`);
      console.log(`   URL: ${url}\n`);

      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT,
        deviceScaleFactor: 2, // Retina表示
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        serviceWorkers: 'block', // Service Workerをブロック
      });

      const page = await context.newPage();
      const outputDir = path.join(__dirname, `../public/screenshots/${petType}`);

      // 出力ディレクトリが存在しない場合は作成
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      try {
        // 0. ページアクセス＆初期化
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // PWAインストールプロンプトを完全に無効化
        await page.evaluate(() => {
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            return false;
          });
        });

        await page.waitForTimeout(2000); // アニメーション・画像読み込み待機

        // PWAプロンプトの「閉じる」ボタンをクリック
        try {
          const closeButton = page.getByRole('button', { name: '閉じる' });
          if (await closeButton.count() > 0) {
            await closeButton.click({ timeout: 3000 });
            console.log('   PWAプロンプトを閉じました');
            await page.waitForTimeout(1000);
          }
        } catch (e) {
          console.log('   PWAプロンプトの閉じるボタンが見つかりませんでした');
        }

        // それでも残っている固定モーダルを削除
        await page.evaluate(() => {
          const modals = document.querySelectorAll('.fixed.z-50, [class*="z-50"]');
          modals.forEach(modal => modal.remove());
        });
        await page.waitForTimeout(500);

        // 1. ヒーロー画面
        console.log('   ⏳ 1/4 ヒーロー画面...');
        await page.screenshot({
          ...SCREENSHOT_CONFIG,
          path: path.join(outputDir, 'hero.png'),
        });
        console.log('   ✅ 1/4 完了');

        // 2. ペット詳細モーダル（お気に入り登録前に撮影）
        console.log('   ⏳ 2/4 詳細モーダル...');
        try {
          // 画面中央（カードの位置）を直接クリック
          const centerX = MOBILE_VIEWPORT.width / 2;
          const centerY = MOBILE_VIEWPORT.height / 2;

          console.log(`   画面中央 (${centerX}, ${centerY}) をクリック...`);
          await page.mouse.click(centerX, centerY);
          console.log('   カードをクリックしました');
          await page.waitForTimeout(3000); // モーダルのアニメーション待機

          // PWAプロンプトのDOM要素を強制削除
          await page.evaluate(() => {
            // 「ホーム画面に追加」かつ「閉じる」ボタンを含む要素を検索して削除
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
              const text = el.textContent || '';
              // PWAプロンプトの特徴：「ホーム画面に追加」「共有ボタン」「閉じる」などのテキストを含む
              if (text.includes('ホーム画面に追加') && (text.includes('閉じる') || text.includes('共有ボタン'))) {
                // 親要素を削除（モーダル全体を削除）
                const modal = el.closest('.fixed, [role="dialog"], .modal');
                if (modal) {
                  modal.remove();
                  console.log('PWAプロンプトのDOM要素を削除しました');
                }
              }
            });
          });

          await page.waitForTimeout(500);

          // スクリーンショット取得
          await page.screenshot({
            ...SCREENSHOT_CONFIG,
            path: path.join(outputDir, 'detail.png'),
          });
          console.log('   ✅ 2/4 完了（詳細モーダル表示）');

          // モーダルを閉じる
          for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
          await page.waitForTimeout(500);
        } catch (e) {
          console.log('   ⚠️  詳細モーダル取得失敗:', e.message);
          // フォールバック：ヒーロー画面をコピー
          fs.copyFileSync(
            path.join(outputDir, 'hero.png'),
            path.join(outputDir, 'detail.png')
          );
          console.log('   ✅ 2/4 完了（フォールバック）');
        }

        // 3. お気に入りに複数のペットを登録
        console.log('   ⏳ 3/4 お気に入りに登録中...');
        try {
          // 残っているPWAプロンプトを閉じる
          try {
            const closeButton = page.getByRole('button', { name: '閉じる' });
            if (await closeButton.count() > 0) {
              await closeButton.click({ timeout: 2000 });
              await page.waitForTimeout(500);
            }
          } catch (e) {
            // プロンプトがなければスキップ
          }

          // 「いいね」ボタンを4回クリック
          const likeButton = page.getByRole('button', { name: /いいね/i });
          for (let i = 0; i < 4; i++) {
            if (await likeButton.count() > 0) {
              await likeButton.click({ force: true });
              await page.waitForTimeout(800); // アニメーション待機
            }
          }
          console.log('   ✅ 3/4 完了（4匹をお気に入りに登録）');
        } catch (e) {
          console.log('   ⚠️  お気に入り登録スキップ:', e.message);
        }

        // 4. お気に入り画面
        console.log('   ⏳ 4/4 お気に入り画面...');
        try {
          // 残っているモーダルを強制的に閉じる
          for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          }
          await page.waitForTimeout(500);

          // 残っているPWAプロンプトを閉じる
          try {
            const closeButton = page.getByRole('button', { name: '閉じる' });
            if (await closeButton.count() > 0) {
              await closeButton.click({ timeout: 2000 });
              await page.waitForTimeout(500);
            }
          } catch (e) {
            // プロンプトがなければスキップ
          }

          // お気に入りボタンをクリック
          const favButton = page.getByRole('button', { name: /お気に入り/i });
          if (await favButton.count() > 0) {
            await favButton.click({ force: true });
            console.log('   お気に入りボタンをクリックしました');
            await page.waitForTimeout(3000); // モーダルのアニメーション待機

            // スクリーンショット取得
            await page.screenshot({
              ...SCREENSHOT_CONFIG,
              path: path.join(outputDir, 'favorites.png'),
            });
            console.log('   ✅ 4/4 完了（お気に入り画面表示）');
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
      } catch (error) {
        console.error(`   ❌ エラー: ${error.message}\n`);
      }

      await context.close();
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
