"use client";

export function AuthProfileUpdateForm() {
    return(
        <div>
            <form id="author-profile">
                <h2>Update Profile</h2>

                <label>Full Name</label>
                <input type="text" name="fullName" required/>   
                 
                <label>Email</label>
                <input type="email" name="email" required/>

                <label>Institution</label>
                <input type="text" name="institution"/>

                <label>Profile Picture</label>
                <input type="file" name="profilePic" accept="image/*"/>

                <button type="submit">Update</button>
            </form>
  
        </div>
    );
}