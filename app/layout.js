import "./globals.css";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import ThemeToggleFloating from "@/components/ThemeToggleFloating";

export const metadata = {
  title: "le-Shortcut",
  description: "Personal analytics & shortcut dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeBootstrap />
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
