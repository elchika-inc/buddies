export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📵</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          オフラインです
        </h1>
        <p className="text-gray-600 mb-6">
          インターネット接続がありません。<br />
          接続を確認してから再度お試しください。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}