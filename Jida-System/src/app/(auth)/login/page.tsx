"use client";
import { UnifiedLoginForm } from "@/components/forms/auth/unified-login-form";
import { useEffect } from "react";

export default function LoginRoute() {


  
  useEffect(() => {
    // Add auth-page class to body when component mounts
    document.body.classList.add('auth-page');
    
    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  return <UnifiedLoginForm />;
}
