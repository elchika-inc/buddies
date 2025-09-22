import React from 'react'
import { renderToString } from 'react-dom/server'

/**
 * ReactコンポーネントをHTMLにレンダリング
 */
export function renderReactComponent(
  Component: React.FC<any>,
  props: any,
  title: string = 'PawMatch Admin'
): string {
  const componentHTML = renderToString(<Component {...props} />)

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="root">${componentHTML}</div>
  <script>
    // Hydrate React component on client side
    const tableName = '${props.tableName || ''}';
    const adminSecret = localStorage.getItem('adminSecret') || '';

    if (!adminSecret && window.location.pathname !== '/') {
      const input = prompt('管理者パスワードを入力してください:');
      if (input) {
        localStorage.setItem('adminSecret', input);
        location.reload();
      } else {
        window.location.href = '/';
      }
    }
  </script>
</body>
</html>`
}