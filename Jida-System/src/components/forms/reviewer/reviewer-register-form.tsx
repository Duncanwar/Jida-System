"use client";

export function ReviewerRegisterForm() {
    return(
        <div>
            <form id="reviewer-register">
                <h2>Reviewer Registration</h2>

                <label>Full Name</label>
                <input type="text" name="fullName" required/>
                
                <label>Email</label>
                <input type="email" name="email" required/>

                <label>Password</label>
                <input type="password" name="password" required/>

                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" required/>

                <label>Area of Expertise</label>
                <input type="text" name="expertise" required/>

                <label>Affiliation</label>
                <input type="text" name="affiliation"/>

                <button type="submit">Register</button>
            </form>
  
        </div>
    );
}