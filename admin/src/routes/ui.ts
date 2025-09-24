import { Hono } from 'hono'
import type { Env } from '../types/env'

/**
 * UIルート
 */
export const uiRoute = new Hono<{ Bindings: Env }>()

// ダッシュボード - シンプルなHTML版
uiRoute.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PawMatch Admin Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
    <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center">
          <span class="mr-3">🐾</span>
          PawMatch Admin Dashboard
        </h1>
        <div class="flex gap-2">
          <button
            id="refreshBtn"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200"
          >
            データ更新
          </button>
          <button
            id="logoutBtn"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div>
        <h2 class="text-xl font-semibold text-gray-800 mb-6">データベーステーブル</h2>
        <div id="loadingDiv" class="text-center py-12">
          <div class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            読み込み中...
          </div>
        </div>
        <div id="tablesDiv" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- テーブル一覧がここに表示される -->
        </div>
        <div id="errorDiv" class="hidden text-center py-12">
          <div class="text-red-600">
            <p class="text-lg font-semibold mb-2">エラーが発生しました</p>
            <p id="errorMessage" class="text-sm"></p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // データ取得関数
    async function fetchTables() {
      const loadingDiv = document.getElementById('loadingDiv');
      const tablesDiv = document.getElementById('tablesDiv');
      const errorDiv = document.getElementById('errorDiv');
      const refreshBtn = document.getElementById('refreshBtn');

      // ローディング表示
      loadingDiv.classList.remove('hidden');
      tablesDiv.classList.add('hidden');
      errorDiv.classList.add('hidden');
      refreshBtn.textContent = '更新中...';
      refreshBtn.disabled = true;

      try {
        const response = await fetch('/api/tables');
        if (!response.ok) {
          throw new Error('テーブル情報の取得に失敗しました');
        }

        const data = await response.json();
        const tables = data.tables || [];

        // テーブル一覧を表示
        tablesDiv.innerHTML = '';
        if (tables.length === 0) {
          tablesDiv.innerHTML = '<div class="col-span-full text-center text-gray-500">テーブルが見つかりません</div>';
        } else {
          tables.forEach(table => {
            const card = document.createElement('div');
            card.className = 'bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition duration-200 cursor-pointer';
            card.innerHTML = \`
              <h3 class="font-semibold text-gray-900 mb-2">\${table.name}</h3>
              <p class="text-sm text-gray-600">\${table.count}件のレコード</p>
            \`;
            card.onclick = () => window.location.href = \`/table/\${table.name}\`;
            tablesDiv.appendChild(card);
          });
        }

        loadingDiv.classList.add('hidden');
        tablesDiv.classList.remove('hidden');

      } catch (error) {
        console.error('Error:', error);
        document.getElementById('errorMessage').textContent = error.message;
        loadingDiv.classList.add('hidden');
        errorDiv.classList.remove('hidden');
      } finally {
        refreshBtn.textContent = 'データ更新';
        refreshBtn.disabled = false;
      }
    }

    // 初回データ読み込み
    fetchTables();

    // リフレッシュボタン
    document.getElementById('refreshBtn').onclick = fetchTables;

    // ログアウトボタン
    document.getElementById('logoutBtn').onclick = () => {
      alert('ログアウトするにはブラウザを閉じてください');
    };
  </script>
</body>
</html>`

  return c.html(html)
})

// テーブル詳細ページ
uiRoute.get('/table/:tableName', (c) => {
  const tableName = c.req.param('tableName')
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tableName} - PawMatch Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- ヘッダー -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">テーブル: ${tableName}</h1>
            <p id="recordCount" class="text-gray-600 mt-1">読み込み中...</p>
          </div>
          <div class="flex gap-2">
            <button
              id="addRecordBtn"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              新規作成
            </button>
            <button
              id="refreshBtn"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              更新
            </button>
            <a href="/" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              ダッシュボード
            </a>
          </div>
        </div>
      </div>

      <!-- データテーブル -->
      <div class="bg-white rounded-lg shadow">
        <div id="loadingDiv" class="text-center py-12">
          <div class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            データを読み込み中...
          </div>
        </div>

        <div id="tableContainer" class="hidden">
          <div class="overflow-x-auto">
            <table id="dataTable" class="min-w-full divide-y divide-gray-200">
              <thead id="tableHead" class="bg-gray-50">
                <!-- カラムヘッダーが動的に生成される -->
              </thead>
              <tbody id="tableBody" class="bg-white divide-y divide-gray-200">
                <!-- レコードが動的に生成される -->
              </tbody>
            </table>
          </div>

          <!-- ページネーション -->
          <div id="paginationDiv" class="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-700">
                <span id="paginationInfo">-</span>
              </div>
              <div class="flex space-x-2">
                <button id="prevPageBtn" class="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50" disabled>
                  前へ
                </button>
                <button id="nextPageBtn" class="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50" disabled>
                  次へ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="errorDiv" class="hidden text-center py-12">
          <div class="text-red-600">
            <p class="text-lg font-semibold mb-2">エラーが発生しました</p>
            <p id="errorMessage" class="text-sm"></p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- モーダル -->
  <div id="modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 id="modalTitle" class="text-xl font-bold">レコード編集</h2>
          <button id="closeModalBtn" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form id="recordForm">
          <div id="formFields" class="space-y-4">
            <!-- フォームフィールドが動的に生成される -->
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button type="button" id="cancelBtn" class="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" id="saveBtn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
    const tableName = '${tableName}';
    let currentPage = 1;
    let currentRecord = null;
    let tableSchema = null;

    // DOM要素
    const loadingDiv = document.getElementById('loadingDiv');
    const tableContainer = document.getElementById('tableContainer');
    const errorDiv = document.getElementById('errorDiv');
    const modal = document.getElementById('modal');
    const recordForm = document.getElementById('recordForm');

    // データ取得
    async function fetchRecords(page = 1) {
      showLoading();
      try {
        const response = await fetch(\`/api/records/\${tableName}?page=\${page}&limit=50\`);
        if (!response.ok) throw new Error('データの取得に失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'データの取得に失敗しました');

        renderTable(data.data);
        currentPage = page;
      } catch (error) {
        showError(error.message);
      }
    }

    // スキーマ取得
    async function fetchSchema() {
      try {
        const response = await fetch(\`/api/records/\${tableName}/schema\`);
        if (!response.ok) throw new Error('スキーマの取得に失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'スキーマの取得に失敗しました');

        tableSchema = data.data.fields;
      } catch (error) {
        console.error('Schema fetch error:', error);
      }
    }

    // テーブル描画
    function renderTable(data) {
      const { records, pagination } = data;

      if (records.length === 0) {
        tableContainer.innerHTML = '<div class="text-center py-12 text-gray-500">データがありません</div>';
        tableContainer.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        return;
      }

      // ヘッダー作成
      const columns = Object.keys(records[0]);
      const tableHead = document.getElementById('tableHead');
      tableHead.innerHTML = \`
        <tr>
          \${columns.map(col => \`<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">\${col}</th>\`).join('')}
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
        </tr>
      \`;

      // レコード作成
      const tableBody = document.getElementById('tableBody');
      tableBody.innerHTML = records.map(record => \`
        <tr class="hover:bg-gray-50">
          \${columns.map(col => {
            const value = record[col];
            const displayValue = value === null ? '<span class="text-gray-400">NULL</span>' :
                                value === undefined ? '<span class="text-gray-400">-</span>' :
                                typeof value === 'string' && value.length > 50 ?
                                  \`<span title="\${escapeHtml(value)}">\${escapeHtml(value.substring(0, 50))}...</span>\` :
                                  escapeHtml(String(value));
            return \`<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">\${displayValue}</td>\`;
          }).join('')}
          <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
            <button onclick="editRecord(\${record.id})" class="text-blue-600 hover:text-blue-900">編集</button>
            <button onclick="deleteRecord(\${record.id})" class="text-red-600 hover:text-red-900">削除</button>
          </td>
        </tr>
      \`).join('');

      // ページネーション
      document.getElementById('recordCount').textContent = \`\${pagination.totalCount}件のレコード\`;
      document.getElementById('paginationInfo').textContent =
        \`\${((pagination.page - 1) * pagination.limit) + 1}-\${Math.min(pagination.page * pagination.limit, pagination.totalCount)} / \${pagination.totalCount}件\`;

      document.getElementById('prevPageBtn').disabled = !pagination.hasPrev;
      document.getElementById('nextPageBtn').disabled = !pagination.hasNext;

      tableContainer.classList.remove('hidden');
      loadingDiv.classList.add('hidden');
      errorDiv.classList.add('hidden');
    }

    // HTMLエスケープ
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ローディング表示
    function showLoading() {
      loadingDiv.classList.remove('hidden');
      tableContainer.classList.add('hidden');
      errorDiv.classList.add('hidden');
    }

    // エラー表示
    function showError(message) {
      document.getElementById('errorMessage').textContent = message;
      errorDiv.classList.remove('hidden');
      loadingDiv.classList.add('hidden');
      tableContainer.classList.add('hidden');
    }

    // レコード編集
    async function editRecord(id) {
      try {
        const response = await fetch(\`/api/records/\${tableName}/\${id}\`);
        if (!response.ok) throw new Error('レコードの取得に失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        currentRecord = data.data;
        showModal('編集', currentRecord);
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    // レコード削除
    async function deleteRecord(id) {
      if (!confirm('このレコードを削除しますか？')) return;

      try {
        const response = await fetch(\`/api/records/\${tableName}/\${id}\`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('削除に失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        alert('削除しました');
        fetchRecords(currentPage);
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    // モーダル表示
    function showModal(title, record = null) {
      document.getElementById('modalTitle').textContent = \`レコード\${title}\`;
      currentRecord = record;

      const formFields = document.getElementById('formFields');
      if (record) {
        // 編集モード
        const fields = Object.keys(record).filter(key => key !== 'id');
        formFields.innerHTML = fields.map(field => \`
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">\${field}</label>
            <input
              type="text"
              name="\${field}"
              value="\${record[field] || ''}"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
        \`).join('');
      } else {
        // 新規作成モード
        if (tableSchema) {
          formFields.innerHTML = Object.keys(tableSchema).filter(key => key !== 'id').map(field => \`
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">\${field}</label>
              <input
                type="text"
                name="\${field}"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                \${tableSchema[field].required ? 'required' : ''}
              >
            </div>
          \`).join('');
        }
      }

      modal.classList.remove('hidden');
    }

    // モーダル閉じる
    function closeModal() {
      modal.classList.add('hidden');
      currentRecord = null;
    }

    // フォーム送信
    async function handleSubmit(e) {
      e.preventDefault();
      const formData = new FormData(recordForm);
      const data = Object.fromEntries(formData.entries());

      try {
        let response;
        if (currentRecord) {
          // 更新
          response = await fetch(\`/api/records/\${tableName}/\${currentRecord.id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } else {
          // 新規作成
          response = await fetch(\`/api/records/\${tableName}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        }

        if (!response.ok) throw new Error('保存に失敗しました');

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        alert('保存しました');
        closeModal();
        fetchRecords(currentPage);
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    // イベントリスナー
    document.getElementById('addRecordBtn').onclick = () => showModal('新規作成');
    document.getElementById('refreshBtn').onclick = () => fetchRecords(currentPage);
    document.getElementById('closeModalBtn').onclick = closeModal;
    document.getElementById('cancelBtn').onclick = closeModal;
    document.getElementById('prevPageBtn').onclick = () => fetchRecords(currentPage - 1);
    document.getElementById('nextPageBtn').onclick = () => fetchRecords(currentPage + 1);
    recordForm.onsubmit = handleSubmit;

    // モーダル外クリックで閉じる
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    // 初期化
    Promise.all([fetchSchema(), fetchRecords()]);
  </script>
</body>
</html>`

  return c.html(html)
})