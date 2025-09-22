import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ipRestriction } from './middleware/ipRestriction'
import { auth } from './middleware/auth'
import { tablesRoute } from './routes/tables'
import { recordsRoute } from './routes/records'
import { apiKeysRoute } from './routes/apiKeys'
import { renderReactComponent } from './utils/renderReact'
import { Dashboard } from './components/Dashboard'
import { TableDetail } from './components/TableDetail'
import type { Env } from './types/env'

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
}))

// IP制限ミドルウェア
app.use('*', ipRestriction)

// 認証ミドルウェア
app.use('/api/*', auth)

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// APIルート
app.route('/api/tables', tablesRoute)
app.route('/api/records', recordsRoute)
app.route('/api/keys', apiKeysRoute)

// テーブル詳細ページ（React版）
app.get('/table/:tableName', (c) => {
  const tableName = c.req.param('tableName')
  const html = renderReactComponent(
    TableDetail,
    { tableName, adminSecret: '' },
    `${tableName} - PawMatch Admin`
  )
  return c.html(html)
})

// 古いテーブル詳細ページ (削除予定)
app.get('/table-old/:tableName', (c) => {
  const tableName = c.req.param('tableName')
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${tableName} - PawMatch Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          max-width: 100%;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        h1 {
          color: #333;
          font-size: 2em;
        }
        .back-button {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .back-button:hover {
          background: #5a67d8;
        }
        .table-container {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background: #f7fafc;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #2d3748;
          border-bottom: 2px solid #e2e8f0;
          position: sticky;
          top: 0;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          color: #4a5568;
        }
        tr:hover {
          background: #f7fafc;
        }
        .json-cell {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: #718096;
        }
        .error {
          color: #e53e3e;
          padding: 20px;
          text-align: center;
        }
        .pagination {
          margin-top: 20px;
          display: flex;
          justify-content: center;
          gap: 10px;
        }
        .page-button {
          padding: 8px 16px;
          background: #edf2f7;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .page-button:hover {
          background: #e2e8f0;
        }
        .page-button.active {
          background: #667eea;
          color: white;
        }
        .stats {
          margin: 20px 0;
          padding: 15px;
          background: #f7fafc;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 ${tableName}</h1>
          <a href="/" class="back-button">← ダッシュボードに戻る</a>
        </div>
        <div class="stats" id="stats"></div>
        <div class="table-container" id="tableContainer">
          <div class="loading">データを読み込んでいます...</div>
        </div>
        <div class="pagination" id="pagination"></div>
      </div>

      <script>
        const tableName = '${tableName}';
        const adminSecret = localStorage.getItem('adminSecret') || '';
        let currentPage = 1;
        let totalPages = 1;

        async function loadTableData(page = 1) {
          const container = document.getElementById('tableContainer');
          const statsEl = document.getElementById('stats');
          const paginationEl = document.getElementById('pagination');

          if (!adminSecret) {
            container.innerHTML = '<div class="error">認証が必要です。<a href="/">ログインページに戻る</a></div>';
            return;
          }

          try {
            container.innerHTML = '<div class="loading">データを読み込んでいます...</div>';

            const response = await fetch(\`/api/records/\${tableName}?page=\${page}&limit=20\`, {
              headers: {
                'X-Admin-Secret': adminSecret
              }
            });

            if (!response.ok) {
              if (response.status === 401) {
                localStorage.removeItem('adminSecret');
                window.location.href = '/';
                return;
              }
              throw new Error('データの取得に失敗しました');
            }

            const data = await response.json();
            const records = data.data?.records || data.records || [];
            const total = data.data?.pagination?.totalCount || data.total || 0;
            totalPages = Math.ceil(total / 20);
            currentPage = page;

            // 統計情報を表示
            statsEl.innerHTML = \`
              <strong>総レコード数:</strong> \${total} 件 |
              <strong>表示中:</strong> \${(page - 1) * 20 + 1}-\${Math.min(page * 20, total)} 件
            \`;

            if (records.length === 0) {
              container.innerHTML = '<div class="error">データがありません</div>';
              return;
            }

            // テーブルヘッダーを作成
            const columns = Object.keys(records[0]);
            let tableHTML = '<table><thead><tr>';
            columns.forEach(col => {
              tableHTML += \`<th>\${col}</th>\`;
            });
            tableHTML += '</tr></thead><tbody>';

            // テーブル行を作成
            records.forEach(record => {
              tableHTML += '<tr>';
              columns.forEach(col => {
                let value = record[col];
                if (value === null) {
                  value = '<span style="color: #cbd5e0;">NULL</span>';
                } else if (typeof value === 'object') {
                  value = \`<span class="json-cell" title="\${JSON.stringify(value).replace(/"/g, '&quot;')}">\${JSON.stringify(value)}</span>\`;
                } else if (typeof value === 'boolean') {
                  value = value ? '✅' : '❌';
                }
                tableHTML += \`<td>\${value}</td>\`;
              });
              tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table>';
            container.innerHTML = tableHTML;

            // ページネーションを作成
            let paginationHTML = '';
            if (currentPage > 1) {
              paginationHTML += \`<button class="page-button" onclick="loadTableData(\${currentPage - 1})">← 前へ</button>\`;
            }
            for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
              paginationHTML += \`<button class="page-button \${i === currentPage ? 'active' : ''}" onclick="loadTableData(\${i})">\${i}</button>\`;
            }
            if (currentPage < totalPages) {
              paginationHTML += \`<button class="page-button" onclick="loadTableData(\${currentPage + 1})">次へ →</button>\`;
            }
            paginationEl.innerHTML = paginationHTML;

          } catch (error) {
            console.error('Error loading table data:', error);
            container.innerHTML = \`<div class="error">エラー: \${error.message}</div>\`;
          }
        }

        // ページ読み込み時にデータを取得
        loadTableData();
      </script>
    </body>
    </html>
  `)
})

// 管理画面UI（React版ダッシュボード）
app.get('/', (c) => {
  const html = renderReactComponent(
    Dashboard,
    {},
    'PawMatch Admin Dashboard'
  )
  return c.html(html)
})

// 旧版ダッシュボード（削除予定）
app.get('/old-dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PawMatch Admin Dashboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          width: 90%;
          max-width: 1200px;
        }
        h1 {
          color: #333;
          margin-bottom: 30px;
          font-size: 2.5em;
        }
        .auth-form {
          margin-bottom: 30px;
        }
        input {
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          width: 300px;
          margin-right: 10px;
        }
        button {
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        button:hover {
          background: #5a67d8;
        }
        #content {
          display: none;
        }
        #content.authenticated {
          display: block;
        }
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .table-card {
          background: #f7fafc;
          padding: 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .table-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .table-name {
          font-size: 1.2em;
          font-weight: bold;
          color: #2d3748;
          margin-bottom: 8px;
        }
        .table-count {
          color: #718096;
        }
        .error {
          color: #e53e3e;
          margin-top: 10px;
        }
        .success {
          color: #38a169;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🐾 PawMatch Admin Dashboard</h1>

        <div class="auth-form">
          <input type="password" id="secretInput" placeholder="管理者シークレットを入力">
          <button onclick="authenticate()">認証</button>
          <div id="authMessage"></div>
        </div>

        <div id="content">
          <h2>データベーステーブル</h2>
          <div id="tablesList" class="tables-grid"></div>
        </div>
      </div>

      <script>
        let adminSecret = localStorage.getItem('adminSecret') || '';

        // 既に認証済みの場合は自動的にテーブルを表示
        if (adminSecret) {
          document.getElementById('content').classList.add('authenticated');
          loadTables();
        }

        async function authenticate() {
          const secret = document.getElementById('secretInput').value;
          const messageEl = document.getElementById('authMessage');

          try {
            const response = await fetch('/api/tables', {
              headers: {
                'X-Admin-Secret': secret
              }
            });

            if (response.ok) {
              adminSecret = secret;
              localStorage.setItem('adminSecret', secret); // ローカルストレージに保存
              messageEl.className = 'success';
              messageEl.textContent = '認証成功！';
              document.getElementById('content').classList.add('authenticated');
              loadTables();
            } else {
              messageEl.className = 'error';
              messageEl.textContent = '認証失敗：シークレットが正しくありません';
            }
          } catch (error) {
            messageEl.className = 'error';
            messageEl.textContent = 'エラーが発生しました：' + error.message;
          }
        }

        async function loadTables() {
          try {
            const response = await fetch('/api/tables', {
              headers: {
                'X-Admin-Secret': adminSecret
              }
            });

            if (!response.ok) {
              throw new Error('テーブル情報の取得に失敗しました');
            }

            const data = await response.json();
            const tablesList = document.getElementById('tablesList');

            tablesList.innerHTML = data.tables.map(table => \`
              <div class="table-card" onclick="viewTable('\${table.name}')">
                <div class="table-name">\${table.name}</div>
                <div class="table-count">\${table.count} レコード</div>
              </div>
            \`).join('');
          } catch (error) {
            console.error('Error loading tables:', error);
            alert('テーブルの読み込みに失敗しました');
          }
        }

        function viewTable(tableName) {
          window.location.href = \`/table/\${tableName}\`;
        }

        // Enterキーで認証
        document.getElementById('secretInput').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') authenticate();
        });
      </script>
    </body>
    </html>
  `)
})

export default app