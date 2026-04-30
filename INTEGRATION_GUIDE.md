# Analytica SDK Integration Guide

This guide provides the quick-start script snippets for integrating Analytica into different website environments.

---

## 1. Standard HTML / PHP / Static Sites
Place this script tag inside your `<head>` section.

```html
<!-- Analytica SDK -->
<script 
  src="https://your-backend-domain.com/sdk/analytica.js" 
  data-endpoint="https://your-backend-domain.com"
></script>
```

---

## 2. Next.js (App Router)
Include the script in your root `layout.tsx`. Use the `beforeInteractive` strategy to ensure the SDK captures the initial page load event correctly.

```tsx
// src/app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="https://your-backend-domain.com/sdk/analytica.js"
          data-endpoint="https://your-backend-domain.com"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 3. React / Vite / Vue (SPA)
For Single Page Applications, add the script to your main `index.html`. The SDK automatically detects internal route changes using the browser History API.

```html
<!-- public/index.html -->
<head>
  <script 
    src="https://your-backend-domain.com/sdk/analytica.js" 
    data-endpoint="https://your-backend-domain.com"
  ></script>
</head>
```

---

## 4. Next.js (Pages Router)
If you are using the older Pages Router, add the script to your `_document.tsx` or `_app.tsx`.

```tsx
// _document.tsx
import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default function Document() {
  return (
    <Html>
      <Head>
        <Script
          src="https://your-backend-domain.com/sdk/analytica.js"
          data-endpoint="https://your-backend-domain.com"
          strategy="beforeInteractive"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```
