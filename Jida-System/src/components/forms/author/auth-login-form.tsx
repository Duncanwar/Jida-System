"use client";
import {Mail,Lock,Eye,EyeOff} from "lucide-react";
import React, {useState,useEffect} from "react";
import { useRouter } from "next/navigation";
import { loginAuthor } from "@/lib/api";

export function AuthLoginForm() {
    const [showPassword,setShowPassword]=useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const togglePasswordVisibility = () => setShowPassword(prev => !prev);

    const router = useRouter();
    const handleRegisterNavigation = () => {
        router.push("/register");
    }

    const sectionRef = React.useRef<HTMLElement>(null);
    
    useEffect(() => {
        const loginForm = sectionRef.current;

        if (loginForm) {
            loginForm.style.opacity = "0";

            setTimeout(function(){
                loginForm.style.transition = 'opacity 1s ease-in-out';
                loginForm.style.opacity = "1";
            }, 500);
        }
    });

    const forgotPasswordHandler = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push("/reset-password");
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const data = await loginAuthor(email, password);
            localStorage.setItem("token", data.token);
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return(
        <div>
            <section ref={sectionRef}>
            <form id="author-login" onSubmit={handleSubmit}>
                <h1>Author Login</h1>
                {error && <p className="error-message">{error}</p>}
                <div className="inputbox">
                    <Mail className="input-icon"/>
                    <label>Email</label>
                    <input type="email" name="email" required/>
                </div>
                


                <div className="inputbox">
                    <div className="input-icon" onClick={togglePasswordVisibility}>
                        {showPassword ? <EyeOff /> : <Eye />}
                         </div>
                    <label>Password</label>
                        <input type={showPassword ? "text" : "password"} name="password" required/>                </div>

                <div className="remember-forgot">
                    <label><input type="checkbox" name="rememberMe" />Remember Me</label>
                    <a href="/reset-password" onClick={forgotPasswordHandler} >Forgot Password?</a>
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                </button>
                
                <div className="register" >
                    <p>Don't have an account? <a onClick={handleRegisterNavigation}>Register here</a></p>
                </div>
            </form>
            </section>
        </div>
    );
}