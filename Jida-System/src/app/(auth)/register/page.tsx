"use client";
import { AuthRegisterForm } from "@/components/forms/author/auth-register-form";
import { useEffect } from "react";

export default function RegisterRoute() {
  useEffect(() => {
    // Add auth-page class to body when component mounts
    document.body.classList.add('auth-page');
    
    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  return <AuthRegisterForm />;
}
