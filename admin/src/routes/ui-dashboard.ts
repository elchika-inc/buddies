import { Hono } from 'hono'
import type { Env } from '../types/env'

/**
 * ダッシュボードUI
 */
export const dashboardUiRoute = new Hono<{ Bindings: Env }>()

dashboardUiRoute.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ダッシュボード - Buddies Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-[1600px] mx-auto space-y-4">
      <!-- ヘッダー -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center">
          <h1 class="text-xl font-bold text-gray-900 flex items-center">
            <span class="mr-2">📊</span>
            ダッシュボード
          </h1>
          <div class="flex gap-2">
            <button
              id="refreshBtn"
              class="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              更新
            </button>
            <a href="/" class="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              ホーム
            </a>
          </div>
        </div>
      </div>

      <!-- 統計サマリー -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        <div class="bg-white rounded-lg shadow p-3">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-blue-100 rounded-md p-2">
              <span class="text-xl">🐾</span>
            </div>
            <div class="ml-3">
              <p class="text-xs font-medium text-gray-600">総ペット数</p>
              <p id="totalPets" class="text-xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-3">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-green-100 rounded-md p-2">
              <span class="text-xl">✨</span>
            </div>
            <div class="ml-3">
              <p class="text-xs font-medium text-gray-600">今日の新規登録</p>
              <p id="todayPets" class="text-xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-3">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-yellow-100 rounded-md p-2">
              <span class="text-xl">🔄</span>
            </div>
            <div class="ml-3">
              <p class="text-xs font-medium text-gray-600">今日の更新</p>
              <p id="todayUpdates" class="text-xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-3">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-purple-100 rounded-md p-2">
              <span class="text-xl">🔑</span>
            </div>
            <div class="ml-3">
              <p class="text-xs font-medium text-gray-600">アクティブAPIキー</p>
              <p id="activeApiKeys" class="text-xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 実行履歴 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- クローラー実行履歴 -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span class="text-lg mr-2">📜</span>
            クローラー実行履歴
          </h2>
          <div id="crawlerHistory" class="space-y-2 max-h-96 overflow-y-auto">
            <!-- 動的に生成される -->
          </div>
        </div>

        <!-- ワークフロー実行履歴 -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span class="text-lg mr-2">⚙️</span>
            ワークフロー実行履歴
          </h2>
          <div id="workflowHistory" class="space-y-2 max-h-96 overflow-y-auto">
            <!-- 動的に生成される -->
          </div>
        </div>

        <!-- GitHub Actions実行履歴 -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span class="text-lg mr-2">🔄</span>
            GitHub Actions
          </h2>
          <div id="githubActions" class="space-y-2 max-h-96 overflow-y-auto">
            <!-- 動的に生成される -->
          </div>
        </div>
      </div>

      <!-- グラフエリア -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- 日別登録件数グラフ -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3">日別登録件数（30日間）</h2>
          <div style="max-height: 200px;">
            <canvas id="createdChart"></canvas>
          </div>
        </div>

        <!-- タイプ別登録件数グラフ -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3">ペットタイプ別</h2>
          <div style="max-height: 200px;">
            <canvas id="typeChart"></canvas>
          </div>
        </div>

        <!-- 都道府県別統計 -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3">都道府県別（上位10件）</h2>
          <div style="max-height: 200px;">
            <canvas id="prefectureChart"></canvas>
          </div>
        </div>
      </div>

      <!-- クローラー統計と画像統計 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- クローラー統計 -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3">クローラー実行状況</h2>
          <div id="crawlerStats" class="grid grid-cols-1 gap-3">
            <!-- 動的に生成される -->
          </div>
        </div>

        <!-- 画像統計 -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <span class="text-lg mr-2">📸</span>
            画像・R2バケット統計
          </h2>

          <!-- スクリーンショット処理 -->
          <div class="mb-3">
            <h3 class="text-xs font-semibold text-gray-800 mb-2">📷 スクリーンショット処理</h3>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-gray-50 rounded p-2 border border-gray-200">
                <p class="text-xs text-gray-600">未処理</p>
                <p id="screenshotNotStarted" class="text-base font-bold text-gray-700">-</p>
              </div>
              <div class="bg-green-50 rounded p-2 border border-green-200">
                <p class="text-xs text-green-600">成功</p>
                <p id="screenshotSuccess" class="text-base font-bold text-green-700">-</p>
              </div>
              <div class="bg-red-50 rounded p-2 border border-red-200">
                <p class="text-xs text-red-600">失敗</p>
                <p id="screenshotFailed" class="text-base font-bold text-red-700">-</p>
              </div>
            </div>
            <div class="mt-2 bg-gradient-to-r from-blue-50 to-green-50 rounded p-2">
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-gray-700">成功率</span>
                <span id="screenshotSuccessRate" class="text-sm font-bold text-green-700">-</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="screenshotSuccessBar" class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
            </div>
            <button
              id="triggerScreenshotBtn"
              class="mt-2 w-full px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📸 スクリーンショット取得を実行（50件）
            </button>
          </div>

          <!-- 画像変換 -->
          <div class="mb-3">
            <h3 class="text-xs font-semibold text-gray-800 mb-2">🔄 画像変換（WebP）</h3>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-green-50 rounded p-2 border border-green-200">
                <p class="text-xs text-green-600">変換完了</p>
                <p id="conversionCompleted" class="text-base font-bold text-green-700">-</p>
              </div>
              <div class="bg-orange-50 rounded p-2 border border-orange-200">
                <p class="text-xs text-orange-600">変換待ち</p>
                <p id="conversionPending" class="text-base font-bold text-orange-700">-</p>
              </div>
            </div>
            <div class="mt-2 bg-gradient-to-r from-purple-50 to-green-50 rounded p-2">
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-gray-700">変換進捗</span>
                <span id="conversionProgressRate" class="text-sm font-bold text-purple-700">-</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="conversionProgressBar" class="bg-gradient-to-r from-purple-500 to-green-500 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
            </div>
          </div>

          <!-- R2バケット情報 -->
          <div class="bg-gray-50 rounded p-2">
            <h3 class="text-xs font-semibold text-gray-700 mb-2">💾 R2バケット</h3>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <p class="text-xs text-gray-500">オブジェクト</p>
                <p id="r2ObjectCount" class="text-sm font-semibold text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">サイズ</p>
                <p id="r2TotalSize" class="text-sm font-semibold text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">ステータス</p>
                <p id="r2Status" class="text-sm font-semibold text-green-600">-</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let createdChart = null;
    let typeChart = null;
    let prefectureChart = null;

    // データ取得
    async function fetchDashboardData() {
      try {
        // 統計サマリー
        const statsRes = await fetch('/api/dashboard/stats');
        const statsData = await statsRes.json();

        if (statsData.success) {
          document.getElementById('totalPets').textContent = statsData.data.totalPets.toLocaleString();
          document.getElementById('todayPets').textContent = statsData.data.todayPets.toLocaleString();
          document.getElementById('todayUpdates').textContent = statsData.data.todayUpdates.toLocaleString();
          document.getElementById('activeApiKeys').textContent = statsData.data.activeApiKeys.toLocaleString();

          // タイプ別グラフ
          renderTypeChart(statsData.data.petTypeStats);

          // 都道府県別グラフ
          renderPrefectureChart(statsData.data.prefectureStats);
        }

        // タイムラインデータ
        const timelineRes = await fetch('/api/dashboard/pets-timeline?days=30');
        const timelineData = await timelineRes.json();

        if (timelineData.success) {
          renderCreatedChart(timelineData.data.created);
        }

        // クローラー統計
        const crawlerRes = await fetch('/api/dashboard/crawler-stats');
        const crawlerData = await crawlerRes.json();

        if (crawlerData.success) {
          renderCrawlerStats(crawlerData.data);
        }

        // 画像統計
        const imageRes = await fetch('/api/dashboard/image-stats');
        const imageData = await imageRes.json();

        if (imageData.success) {
          renderImageStats(imageData.data);
        }

        // クローラー実行履歴
        const crawlerHistoryRes = await fetch('/api/dashboard/crawler-history?days=30');
        const crawlerHistoryData = await crawlerHistoryRes.json();

        if (crawlerHistoryData.success) {
          renderCrawlerHistory(crawlerHistoryData.data);
        }

        // ワークフロー実行履歴
        const workflowHistoryRes = await fetch('/api/dashboard/workflow-history');
        const workflowHistoryData = await workflowHistoryRes.json();

        if (workflowHistoryData.success) {
          renderWorkflowHistory(workflowHistoryData.data);
        }

        // GitHub Actions実行履歴
        const githubActionsRes = await fetch('/api/dashboard/github-actions');
        const githubActionsData = await githubActionsRes.json();

        if (githubActionsData.success) {
          renderGithubActions(githubActionsData.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        alert('データの取得に失敗しました');
      }
    }

    // 日別登録件数グラフ
    function renderCreatedChart(data) {
      const ctx = document.getElementById('createdChart').getContext('2d');

      if (createdChart) {
        createdChart.destroy();
      }

      const labels = data.map(d => d.date);
      const counts = data.map(d => d.count);

      createdChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: '新規登録数',
            data: counts,
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 10
              }
            }
          }
        }
      });
    }

    // タイプ別グラフ
    function renderTypeChart(data) {
      const ctx = document.getElementById('typeChart').getContext('2d');

      if (typeChart) {
        typeChart.destroy();
      }

      const labels = data.map(d => d.type === 'dog' ? '犬' : d.type === 'cat' ? '猫' : d.type);
      const counts = data.map(d => d.count);

      typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: counts,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(168, 85, 247, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }

    // 都道府県別グラフ
    function renderPrefectureChart(data) {
      const ctx = document.getElementById('prefectureChart').getContext('2d');

      if (prefectureChart) {
        prefectureChart.destroy();
      }

      const labels = data.map(d => d.prefecture);
      const counts = data.map(d => d.count);

      prefectureChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'ペット数',
            data: counts,
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // クローラー統計
    function renderCrawlerStats(data) {
      const container = document.getElementById('crawlerStats');

      if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500">クローラー実行データがありません</p>';
        return;
      }

      container.innerHTML = data.map(stat => {
        const lastCrawl = stat.lastCrawlAt ? new Date(stat.lastCrawlAt).toLocaleString('ja-JP') : '未実行';

        return \`
          <div class="border border-gray-200 rounded p-3">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-sm font-semibold text-gray-900">\${stat.petType === 'dog' ? '🐕 犬' : '🐈 猫'}</h3>
                <p class="text-xs text-gray-500">\${stat.sourceId}</p>
              </div>
              <span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                稼働中
              </span>
            </div>

            <div class="space-y-1 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600">最終実行:</span>
                <span class="font-medium">\${lastCrawl}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">累計:</span>
                <span class="font-medium">\${stat.totalProcessed.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">最新取得:</span>
                <span class="font-medium">\${stat.lastBatch.totalFetched}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">新規/更新:</span>
                <span class="font-medium">
                  <span class="text-green-600">\${stat.lastBatch.newPets}</span> /
                  <span class="text-blue-600">\${stat.lastBatch.updatedPets}</span>
                </span>
              </div>
              \${stat.lastBatch.errors.length > 0 ? \`
                <div class="mt-1 p-1 bg-red-50 rounded text-red-700">
                  エラー: \${stat.lastBatch.errors.length}件
                </div>
              \` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    // 画像統計
    function renderImageStats(data) {
      // スクリーンショット統計
      document.getElementById('screenshotNotStarted').textContent = data.screenshot.notStarted.toLocaleString();
      document.getElementById('screenshotSuccess').textContent = data.screenshot.success.toLocaleString();
      document.getElementById('screenshotFailed').textContent = data.screenshot.failed.toLocaleString();
      document.getElementById('screenshotSuccessRate').textContent = data.screenshot.successRate + '%';

      // 成功率プログレスバー
      const successBar = document.getElementById('screenshotSuccessBar');
      successBar.style.width = data.screenshot.successRate + '%';

      // 画像変換統計
      document.getElementById('conversionCompleted').textContent = data.conversion.completed.toLocaleString();
      document.getElementById('conversionPending').textContent = data.conversion.pending.toLocaleString();
      document.getElementById('conversionProgressRate').textContent = data.conversion.rate + '%';

      // 変換進捗プログレスバー
      const progressBar = document.getElementById('conversionProgressBar');
      progressBar.style.width = data.conversion.rate + '%';

      // R2バケット情報
      document.getElementById('r2ObjectCount').textContent = data.r2.objectCount.toLocaleString();

      // サイズをMBに変換して表示
      const sizeInMB = (data.r2.totalSize / (1024 * 1024)).toFixed(2);
      document.getElementById('r2TotalSize').textContent = sizeInMB + ' MB';

      // ステータス表示
      const statusElement = document.getElementById('r2Status');
      if (data.r2.error) {
        statusElement.textContent = 'エラー';
        statusElement.className = 'text-sm font-semibold text-red-600';
        statusElement.title = data.r2.error;
      } else {
        statusElement.textContent = '正常';
        statusElement.className = 'text-sm font-semibold text-green-600';
      }
    }

    // クローラー実行履歴
    function renderCrawlerHistory(data) {
      const container = document.getElementById('crawlerHistory');

      if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">実行履歴データがありません</p>';
        return;
      }

      // 日付でグループ化
      const groupedByDate = {};
      data.forEach(item => {
        if (!groupedByDate[item.date]) {
          groupedByDate[item.date] = [];
        }
        groupedByDate[item.date].push(item);
      });

      const html = Object.keys(groupedByDate).map(date => {
        const items = groupedByDate[date];
        const totalCount = items.reduce((sum, item) => sum + item.count, 0);

        return \`
          <div class="border border-gray-200 rounded p-2 hover:bg-gray-50 transition-colors">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-semibold text-gray-700">\${date}</span>
              <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                \${totalCount.toLocaleString()} 件
              </span>
            </div>
            <div class="grid grid-cols-1 gap-1">
              \${items.map(item => \`
                <div class="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                  <div class="flex items-center gap-1">
                    <span class="text-sm">\${item.type === 'dog' ? '🐕' : '🐈'}</span>
                    <span class="text-xs text-gray-600">\${item.sourceId}</span>
                  </div>
                  <span class="text-xs font-semibold text-gray-900">\${item.count.toLocaleString()}</span>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }).join('');

      container.innerHTML = html;
    }

    // ワークフロー実行履歴
    function renderWorkflowHistory(data) {
      const container = document.getElementById('workflowHistory');

      if (!data || data.length === 0) {
        container.innerHTML = \`
          <div class="bg-gray-50 rounded-lg p-6 text-center">
            <p class="text-gray-500 mb-2">ワークフロー実行履歴がありません</p>
            <p class="text-xs text-gray-400">sync_statusテーブルにデータが記録されると表示されます</p>
          </div>
        \`;
        return;
      }

      const html = data.map(item => {
        const startedAt = item.startedAt ? new Date(item.startedAt).toLocaleString('ja-JP') : '-';
        const completedAt = item.completedAt ? new Date(item.completedAt).toLocaleString('ja-JP') : '-';
        const createdAt = new Date(item.createdAt).toLocaleString('ja-JP');

        // metadataをパース
        let metadata = null;
        try {
          metadata = item.metadata ? JSON.parse(item.metadata) : null;
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }

        // エラーメッセージをリンク化
        let errorMessageHtml = '';
        if (item.status === 'failed' && metadata?.errorMessage) {
          // URLを検出してリンク化
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const messageWithLinks = metadata.errorMessage.replace(urlRegex, (url) => {
            return \`<a href="\${url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline break-all">\${url}</a>\`;
          });

          errorMessageHtml = \`
            <div class="mt-2 p-2 bg-red-50 rounded border border-red-200">
              <p class="text-xs text-red-700">\${messageWithLinks}</p>
            </div>
          \`;
        }

        // GitHub Run URLを表示
        let githubRunLink = '';
        if (metadata?.githubRunUrl) {
          githubRunLink = \`
            <a href="\${metadata.githubRunUrl}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800 underline">
              GitHub Actions →
            </a>
          \`;
        }

        // ステータスに応じた色とラベル
        let statusBadge = '';
        switch (item.status) {
          case 'completed':
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">完了</span>';
            break;
          case 'running':
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">実行中</span>';
            break;
          case 'failed':
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">失敗</span>';
            break;
          case 'pending':
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">待機中</span>';
            break;
          default:
            statusBadge = \`<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">\${item.status}</span>\`;
        }

        return \`
          <div class="border border-gray-200 rounded p-2 hover:bg-gray-50 transition-colors">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="text-sm font-semibold text-gray-900">\${item.syncType}</h4>
                <p class="text-xs text-gray-500">\${createdAt}</p>
                \${githubRunLink}
              </div>
              \${statusBadge}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <p class="text-xs text-gray-500">総数</p>
                <p class="font-semibold">\${item.totalRecords.toLocaleString()}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">処理済</p>
                <p class="font-semibold text-green-600">\${item.processedRecords.toLocaleString()}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">失敗</p>
                <p class="font-semibold text-red-600">\${item.failedRecords.toLocaleString()}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">進捗</p>
                <p class="font-semibold">\${item.totalRecords > 0 ? Math.round((item.processedRecords / item.totalRecords) * 100) : 0}%</p>
              </div>
            </div>
            \${errorMessageHtml}
            \${item.startedAt ? \`
              <div class="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                \${startedAt} 〜 \${completedAt}
              </div>
            \` : ''}
          </div>
        \`;
      }).join('');

      container.innerHTML = html;
    }

    // GitHub Actions実行履歴
    function renderGithubActions(data) {
      const container = document.getElementById('githubActions');

      if (!data || data.length === 0) {
        container.innerHTML = \`
          <div class="bg-gray-50 rounded-lg p-6 text-center">
            <p class="text-gray-500 mb-2">GitHub Actions履歴がありません</p>
            <p class="text-xs text-gray-400">GITHUB_TOKENが設定されていない可能性があります</p>
          </div>
        \`;
        return;
      }

      const html = data.map(run => {
        const createdAt = new Date(run.createdAt).toLocaleString('ja-JP');

        // ステータスに応じた色とラベル
        let statusBadge = '';
        if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ 成功</span>';
          } else if (run.conclusion === 'failure') {
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">✗ 失敗</span>';
          } else if (run.conclusion === 'cancelled') {
            statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">キャンセル</span>';
          } else {
            statusBadge = \`<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">\${run.conclusion || run.status}</span>\`;
          }
        } else if (run.status === 'in_progress') {
          statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">⏳ 実行中</span>';
        } else if (run.status === 'queued') {
          statusBadge = '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">待機中</span>';
        } else {
          statusBadge = \`<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">\${run.status}</span>\`;
        }

        return \`
          <a href="\${run.url}" target="_blank" class="block border border-gray-200 rounded p-2 hover:bg-gray-50 transition-colors">
            <div class="flex justify-between items-start mb-1">
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-semibold text-gray-900 truncate">\${run.name}</h4>
                <p class="text-xs text-gray-500 truncate">\${run.title}</p>
              </div>
              \${statusBadge}
            </div>
            <div class="flex justify-between items-center text-xs text-gray-600">
              <span>\${run.branch}</span>
              <span>\${createdAt}</span>
            </div>
          </a>
        \`;
      }).join('');

      container.innerHTML = html;
    }

    // リフレッシュボタン
    document.getElementById('refreshBtn').onclick = () => {
      fetchDashboardData();
    };

    // スクリーンショット取得トリガーボタン
    document.getElementById('triggerScreenshotBtn').onclick = async () => {
      const btn = document.getElementById('triggerScreenshotBtn');
      const originalText = btn.textContent;

      // 確認ダイアログを表示
      const confirmed = confirm(
        'スクリーンショット取得を実行しますか？\\n\\n' +
        '対象: 最大50件のペット\\n' +
        '処理: GitHub Actionsワークフローが起動されます\\n\\n' +
        '※ 実行には数分かかる場合があります'
      );

      if (!confirmed) {
        return; // キャンセルされた場合は何もしない
      }

      try {
        // ボタンを無効化
        btn.disabled = true;
        btn.textContent = '📸 実行中...';

        // APIを呼び出し
        const response = await fetch('/api/dashboard/trigger-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ limit: 50 }),
        });

        const result = await response.json();

        if (result.success) {
          // 成功メッセージ
          alert(\`スクリーンショット取得を開始しました\\n\\nBatch ID: \${result.data.batchId || 'N/A'}\\n対象件数: \${result.data.petCount || 0}件\\n戦略: \${result.data.strategy || 'N/A'}\`);

          // ダッシュボードデータを再取得
          await fetchDashboardData();
        } else {
          throw new Error(result.message || 'スクリーンショット取得の開始に失敗しました');
        }
      } catch (error) {
        console.error('Error triggering screenshot:', error);
        alert(\`エラーが発生しました: \${error.message}\`);
      } finally {
        // ボタンを再度有効化
        btn.disabled = false;
        btn.textContent = originalText;
      }
    };

    // 初期化
    fetchDashboardData();
  </script>
</body>
</html>`

  return c.html(html)
})
