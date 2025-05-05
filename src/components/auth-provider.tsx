"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Log when the auth provider mounts to help debug session issues
  useEffect(() => {
    console.log("AuthProvider: Component mounted");
    
    // Check for session token in cookies to help debug
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const hasSessionToken = Object.keys(cookies).some(key => 
      key.includes('next-auth.session-token'));
    
    console.log("AuthProvider: Session token in cookies:", hasSessionToken);
    
    return () => {
      console.log("AuthProvider: Component unmounted");
    };
  }, []);
  
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  );
}