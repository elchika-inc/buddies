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
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- ヘッダー -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <span class="mr-3">📊</span>
            ダッシュボード
          </h1>
          <div class="flex gap-2">
            <button
              id="refreshBtn"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              更新
            </button>
            <a href="/" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              ホーム
            </a>
          </div>
        </div>
      </div>

      <!-- 統計サマリー -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <span class="text-2xl">🐾</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">総ペット数</p>
              <p id="totalPets" class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
              <span class="text-2xl">✨</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">今日の新規登録</p>
              <p id="todayPets" class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <span class="text-2xl">🔄</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">今日の更新</p>
              <p id="todayUpdates" class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <span class="text-2xl">🔑</span>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">アクティブAPIキー</p>
              <p id="activeApiKeys" class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- グラフエリア -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 日別登録件数グラフ -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">日別登録件数（30日間）</h2>
          <canvas id="createdChart"></canvas>
        </div>

        <!-- タイプ別登録件数グラフ -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">ペットタイプ別</h2>
          <canvas id="typeChart"></canvas>
        </div>
      </div>

      <!-- クローラー統計 -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">クローラー実行状況</h2>
        <div id="crawlerStats" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 動的に生成される -->
        </div>
      </div>

      <!-- 都道府県別統計 -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">都道府県別ペット数（上位10件）</h2>
        <canvas id="prefectureChart"></canvas>
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
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top'
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
          maintainAspectRatio: true,
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
          maintainAspectRatio: true,
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
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-semibold text-gray-900">\${stat.petType === 'dog' ? '🐕 犬' : '🐈 猫'}</h3>
                <p class="text-xs text-gray-500">ソース: \${stat.sourceId}</p>
              </div>
              <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                アクティブ
              </span>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">最終実行:</span>
                <span class="font-medium">\${lastCrawl}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">累計処理数:</span>
                <span class="font-medium">\${stat.totalProcessed.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">最新バッチ取得:</span>
                <span class="font-medium">\${stat.lastBatch.totalFetched}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">新規:</span>
                <span class="font-medium text-green-600">\${stat.lastBatch.newPets}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">更新:</span>
                <span class="font-medium text-blue-600">\${stat.lastBatch.updatedPets}</span>
              </div>
              \${stat.lastBatch.errors.length > 0 ? \`
                <div class="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                  エラー: \${stat.lastBatch.errors.length}件
                </div>
              \` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    // リフレッシュボタン
    document.getElementById('refreshBtn').onclick = () => {
      fetchDashboardData();
    };

    // 初期化
    fetchDashboardData();
  </script>
</body>
</html>`

  return c.html(html)
})
