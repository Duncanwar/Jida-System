"use client";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";




export function AuthRegisterForm() {
    const sectionRef = React.useRef<HTMLElement>(null);
    const router = useRouter();
    const handlerLoginNavigation = () => {
        router.push("/login");
    }

    useEffect(() => {
       
    const registerForm = sectionRef.current;
    
    if (registerForm) {
        registerForm.style.opacity = "0";

        setTimeout(function(){
            registerForm.style.transition = 'opacity 1s ease-in-out';
            registerForm.style.opacity = "1";
        }, 500);
    }

    }, []);



    const [showPassword,setShowPassword]=useState(false);
    const[showConfirmPassword,setShowConfirmPassword]=useState(false);
    const togglePasswordVisibility = () => setShowPassword(prev => !prev);
    const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(prev => !prev);

    return (
        <div>
            
                <section ref={sectionRef}>
                    <form id="author-register-form">
                        <h1>Author Registration</h1>
                            <div className="inputbox">
                                <User className="input-icon"/>
                                <label>Full Name</label>
                                <input type="text" name="fullName" required/>
                            </div>
                            <div className="inputbox">
                                <Mail className="input-icon"/>
                                <label>Email</label>
                                <input type="email" name="email" required/>
                            </div>
                            <div className="inputbox">
                                <div className="input-icon"
                                onClick={togglePasswordVisibility}
                                > {showPassword ? <EyeOff /> : <Eye />}</div>
                                <label>Password</label>
                                <input type={showPassword ? "text" : "password"} name="password" required/>
                                

                            </div>
                            <div className="inputbox">
                                <div className="input-icon" onClick={toggleConfirmPasswordVisibility}>
                                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                                </div>
                                <label>Confirm Password</label>
                                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required/>
                                
                            </div>
                            <div className="inputbox">
                                <User className="input-icon"/>
                                <label>Institution </label>
                                <input type="text" name="institution"/>
                            </div>
                                        
                        <button type="submit" onClick={handlerLoginNavigation}>Register</button>
                        <div className="register">
                            <p>Already have an account? <a onClick={handlerLoginNavigation}>Login here</a></p>
                        </div>
                    </form>

                </section>
            
        </div>
    );
}