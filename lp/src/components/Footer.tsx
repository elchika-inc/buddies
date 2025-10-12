export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* ロゴ */}
          <h3 className="text-2xl font-bold text-white mb-4">Buddies</h3>

          {/* 説明 */}
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            保護犬・保護猫との新しい出会い方
          </p>

          {/* リンク */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
            <a
              href="https://buddies-dogs.elchika.app"
              className="hover:text-white transition-colors"
            >
              保護犬を探す
            </a>
            <a
              href="https://buddies-cats.elchika.app"
              className="hover:text-white transition-colors"
            >
              保護猫を探す
            </a>
            <a href="#" className="hover:text-white transition-colors">
              利用規約
            </a>
            <a href="#" className="hover:text-white transition-colors">
              プライバシーポリシー
            </a>
            <a href="#" className="hover:text-white transition-colors">
              お問い合わせ
            </a>
          </div>

          {/* コピーライト */}
          <div className="border-t border-gray-800 pt-8">
            <p className="text-sm text-gray-500">
              © {currentYear} Buddies. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
