"use client";

export function ReviewerLoginForm() {
    return(
        <div>
            <form id="reviewer-login">
                <h2>Reviewer Login</h2>

                <label>Email</label>
                <input type="email" name="email" required/>
                
                <label>Password</label>
                <input type="password" name="password" required/>

                <button type="submit">Login</button>
            </form>
            
        </div>
    );
}