import "./globals.css";
import ThemeToggleFloating from "@/components/ThemeToggleFloating";

import Script from "next/script";

export const metadata = {
  title: "le-Shortcut",
  description: "Personal analytics & shortcut dashboard",
};

export default function RootLayout({ children }) {
  const themeScript = `
    (function() {
      try {
        var t = localStorage.getItem('theme');
        if (t === 'light') document.documentElement.classList.add('light');
      } catch(e){}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body>
        <main className="main-container">
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <ThemeToggleFloating />
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
