import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="CRONOS — Maintainer dead-man's-switch registry on GenLayer. Protect critical open-source packages from abandonment and supply-chain hijacking." />
        <meta property="og:title" content="CRONOS — Maintainer Dead-Man's-Switch Registry" />
        <meta property="og:description" content="Register a heartbeat for your repository. GenLayer AI verifies your GitHub activity and authorizes a successor if you go silent." />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
