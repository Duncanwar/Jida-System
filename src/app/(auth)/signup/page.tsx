"use client";
import { AuthRegisterForm } from "@/components/forms/author/auth-register-form";
import { AppHeader } from "@/features/jida/components";
import { useEffect } from "react";

export default function SignupRoute() {
  useEffect(() => {
    // Add auth-page class to body when component mounts
    document.body.classList.add('auth-page');

    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  return (
    <>
      <AppHeader />
      <AuthRegisterForm />
    </>
  );
}
