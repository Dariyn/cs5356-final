import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "@/components/auth-provider";
import Header from "@/components/header";

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
          background: '#ffffff',
        }}
      >
        <AuthProvider>
          <Header />
          <main className="max-w-7xl mx-auto pb-12 pt-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
          {/* Use a simpler Toaster configuration to avoid type errors */}
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: '#FFFFFF',
                color: '#374151',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB',
                borderRadius: '0.5rem',
              },
              className: 'custom-toast',
            }}
          />
          <footer className="border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
              Kanban Board &copy; {new Date().getFullYear()} - A task management application
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
