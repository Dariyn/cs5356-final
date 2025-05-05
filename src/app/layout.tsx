import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "@/components/auth-provider";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kanban Board",
  description: "A simple kanban board application for task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen h-full`}
        style={{
          background: 'linear-gradient(120deg, #C4E1F6 0%, #FEEE91 100%)',
        }}
      >
        <AuthProvider>
          <ThemeProvider>
            <Header />
            <main className="max-w-7xl mx-auto pb-12 pt-6 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
            <Toaster 
              position="top-right" 
              toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white dark:border-gray-700',
                style: {
                  background: 'var(--card-background)',
                  color: 'var(--foreground)',
                  boxShadow: '0 4px 6px var(--card-shadow)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '0.5rem',
                },
              }}
            />
            <footer className="border-t border-gray-200 dark:border-gray-700 mt-auto">
              <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                Kanban Board &copy; {new Date().getFullYear()} - A task management application
              </div>
            </footer>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
