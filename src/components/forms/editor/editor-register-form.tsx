"use client";

export function EditorRegisterForm() {
    return (
        <div>
            <form id="editor-register">
                <h2>Editor Registration</h2>

                <label>Full Name</label>
                <input type="text" name="fullName" required />

                <label>Email</label>
                <input type="email" name="email" required />

                <label>Password</label>
                <input type="password" name="password" required />

                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" required />

                <label>Position</label>
                <input type="text" name="position" required />

                <button type="submit">Register</button>
            </form>

        </div>
    );
}