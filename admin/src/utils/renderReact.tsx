import React from 'react'
import { renderToString } from 'react-dom/server'

/**
 * ReactコンポーネントをHTMLにレンダリング
 */
export function renderReactComponent<T extends Record<string, unknown>>(
  Component: React.FC<T>,
  props: T,
  title: string = 'Buddies Admin'
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
</body>
</html>`
}