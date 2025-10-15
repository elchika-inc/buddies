import { Hono } from 'hono'
import type { Env } from '../types/env'

/**
 * APIキー管理UI
 */
export const apiKeysUiRoute = new Hono<{ Bindings: Env }>()

// APIキー管理ページ
apiKeysUiRoute.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIキー管理 - Buddies Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- ヘッダー -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center">
              <span class="mr-3">🔑</span>
              APIキー管理
            </h1>
            <p id="keyCount" class="text-gray-600 mt-1">読み込み中...</p>
          </div>
          <div class="flex gap-2">
            <button
              id="addKeyBtn"
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
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">権限</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">レート制限</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有効期限</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody id="tableBody" class="bg-white divide-y divide-gray-200">
                <!-- レコードが動的に生成される -->
              </tbody>
            </table>
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

  <!-- 新規作成モーダル -->
  <div id="createModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">新規APIキー作成</h2>
          <button id="closeCreateModalBtn" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form id="createForm">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
              <input
                type="text"
                name="name"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: My API Key"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タイプ *</label>
              <select
                name="type"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">public - 公開API用</option>
                <option value="internal">internal - 内部サービス用</option>
                <option value="service">service - サービス間通信用</option>
                <option value="admin">admin - 管理者用</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">権限 *</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="checkbox" name="permissions" value="read:pets" class="mr-2">
                  <span class="text-sm">read:pets - ペット情報の読み取り</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="permissions" value="write:pets" class="mr-2">
                  <span class="text-sm">write:pets - ペット情報の書き込み</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="permissions" value="read:api_keys" class="mr-2">
                  <span class="text-sm">read:api_keys - APIキーの読み取り</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="permissions" value="write:api_keys" class="mr-2">
                  <span class="text-sm">write:api_keys - APIキーの書き込み</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="permissions" value="*" class="mr-2">
                  <span class="text-sm">* - 全ての権限（管理者用）</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">レート制限（リクエスト/時間）</label>
              <input
                type="number"
                name="rate_limit"
                value="1000"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">有効期限（日数、空欄で無期限）</label>
              <input
                type="number"
                name="expires_in_days"
                min="1"
                placeholder="例: 365"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button type="button" id="cancelCreateBtn" class="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- キー表示モーダル -->
  <div id="keyDisplayModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg max-w-2xl w-full">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-green-600">✓ APIキーが作成されました</h2>
          <button id="closeKeyDisplayModalBtn" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p class="text-sm text-yellow-800 font-semibold mb-2">⚠️ 重要な注意事項</p>
          <p class="text-sm text-yellow-700">
            このAPIキーは一度しか表示されません。必ずコピーして安全な場所に保存してください。
            このウィンドウを閉じると、再度表示することはできません。
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">APIキー</label>
            <div class="flex gap-2">
              <input
                type="text"
                id="newApiKey"
                readonly
                class="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50 font-mono text-sm"
              >
              <button
                id="copyKeyBtn"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                コピー
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">キー名</label>
            <input
              type="text"
              id="newKeyName"
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
            >
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <button id="closeKeyDisplayBtn" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let allKeys = [];

    // DOM要素
    const loadingDiv = document.getElementById('loadingDiv');
    const tableContainer = document.getElementById('tableContainer');
    const errorDiv = document.getElementById('errorDiv');
    const createModal = document.getElementById('createModal');
    const keyDisplayModal = document.getElementById('keyDisplayModal');
    const createForm = document.getElementById('createForm');

    // データ取得
    async function fetchKeys() {
      showLoading();
      try {
        const response = await fetch('/api/keys');
        if (!response.ok) throw new Error('データの取得に失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'データの取得に失敗しました');

        allKeys = data.keys || [];
        renderTable();
      } catch (error) {
        showError(error.message);
      }
    }

    // テーブル描画
    function renderTable() {
      if (allKeys.length === 0) {
        tableContainer.innerHTML = '<div class="text-center py-12 text-gray-500">APIキーがありません</div>';
        tableContainer.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        return;
      }

      const tableBody = document.getElementById('tableBody');
      tableBody.innerHTML = allKeys.map(key => {
        const expiresAt = key.expiresAt || key.expires_at;
        const expiresAtStr = expiresAt ? new Date(expiresAt).toLocaleDateString('ja-JP') : '無期限';
        const isExpired = expiresAt && new Date(expiresAt) < new Date();
        const isActive = key.isActive !== false;

        // permissions が文字列の場合はパース
        let permissions = key.permissions;
        if (typeof permissions === 'string') {
          try {
            permissions = JSON.parse(permissions);
          } catch (e) {
            permissions = [permissions];
          }
        }
        if (!Array.isArray(permissions)) {
          permissions = [permissions];
        }

        const statusBadge = !isActive ?
          '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">無効</span>' :
          isExpired ?
          '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">期限切れ</span>' :
          '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">有効</span>';

        const typeBadge = {
          'public': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">公開</span>',
          'internal': '<span class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">内部</span>',
          'service': '<span class="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">サービス</span>',
          'admin': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">管理者</span>'
        }[key.type] || key.type;

        return \`
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">\${escapeHtml(key.name)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">\${typeBadge}</td>
            <td class="px-6 py-4 text-sm text-gray-900">
              <div class="max-w-xs truncate" title="\${permissions.join(', ')}">\${permissions.join(', ')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">\${key.rateLimit || key.rate_limit || 1000}/時間</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">\${expiresAtStr}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">\${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
              <button onclick="rotateKey('\${key.id}')" class="bg-yellow-500 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs">
                ローテーション
              </button>
              <button onclick="deleteKey('\${key.id}', '\${escapeHtml(key.name)}')" class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">
                削除
              </button>
            </td>
          </tr>
        \`;
      }).join('');

      document.getElementById('keyCount').textContent = \`\${allKeys.length}個のAPIキー\`;

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

    // APIキー作成
    async function handleCreate(e) {
      e.preventDefault();
      const formData = new FormData(createForm);

      // 権限チェックボックスの値を配列で取得
      const permissions = Array.from(formData.getAll('permissions'));
      if (permissions.length === 0) {
        alert('少なくとも1つの権限を選択してください');
        return;
      }

      const data = {
        name: formData.get('name'),
        type: formData.get('type'),
        permissions: permissions,
        rate_limit: parseInt(formData.get('rate_limit') || '1000'),
      };

      const expiresInDays = formData.get('expires_in_days');
      if (expiresInDays && expiresInDays.trim() !== '') {
        data.expires_in_days = parseInt(expiresInDays);
      }

      try {
        const response = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('作成に失敗しました');

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // 作成成功 - キー表示モーダルを表示
        document.getElementById('newApiKey').value = result.api_key.key;
        document.getElementById('newKeyName').value = result.api_key.name;

        closeCreateModal();
        showKeyDisplayModal();

        // データを更新
        fetchKeys();
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    // APIキー削除
    async function deleteKey(id, name) {
      if (!confirm(\`APIキー「\${name}」を削除（無効化）しますか？\\nこの操作は元に戻せません。\`)) return;

      try {
        const response = await fetch(\`/api/keys/\${id}\`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('削除に失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        alert('削除しました');
        fetchKeys();
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    // APIキーローテーション
    async function rotateKey(id) {
      if (!confirm('APIキーをローテーションしますか？\\n新しいキーが生成され、古いキーは無効になります。')) return;

      try {
        const response = await fetch(\`/api/keys/\${id}/rotate\`, {
          method: 'POST'
        });
        if (!response.ok) throw new Error('ローテーションに失敗しました');

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        // 新しいキーを表示
        document.getElementById('newApiKey').value = data.new_key;
        document.getElementById('newKeyName').value = '（ローテーション後）';
        showKeyDisplayModal();

        fetchKeys();
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    // モーダル表示/非表示
    function showCreateModal() {
      createModal.classList.remove('hidden');
      createForm.reset();
    }

    function closeCreateModal() {
      createModal.classList.add('hidden');
    }

    function showKeyDisplayModal() {
      keyDisplayModal.classList.remove('hidden');
    }

    function closeKeyDisplayModal() {
      keyDisplayModal.classList.add('hidden');
    }

    // キーをクリップボードにコピー
    function copyKey() {
      const keyInput = document.getElementById('newApiKey');
      keyInput.select();
      document.execCommand('copy');

      const copyBtn = document.getElementById('copyKeyBtn');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'コピーしました！';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }

    // イベントリスナー
    document.getElementById('addKeyBtn').onclick = showCreateModal;
    document.getElementById('refreshBtn').onclick = fetchKeys;
    document.getElementById('closeCreateModalBtn').onclick = closeCreateModal;
    document.getElementById('cancelCreateBtn').onclick = closeCreateModal;
    document.getElementById('closeKeyDisplayModalBtn').onclick = closeKeyDisplayModal;
    document.getElementById('closeKeyDisplayBtn').onclick = closeKeyDisplayModal;
    document.getElementById('copyKeyBtn').onclick = copyKey;
    createForm.onsubmit = handleCreate;

    // モーダル外クリックで閉じる
    createModal.onclick = (e) => {
      if (e.target === createModal) closeCreateModal();
    };
    keyDisplayModal.onclick = (e) => {
      if (e.target === keyDisplayModal) closeKeyDisplayModal();
    };

    // グローバルスコープに関数を登録
    window.deleteKey = deleteKey;
    window.rotateKey = rotateKey;

    // 初期化
    fetchKeys();
  </script>
</body>
</html>`

  return c.html(html)
})
