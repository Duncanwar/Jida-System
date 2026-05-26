"use client";

export function ChangePasswordForm() {
    return(
        <div>
            <form id="change-password">
                <h2>Change Password</h2>

                <label>Current Password</label>
                <input type="password" name="currentPassword" required/>

                <label>New Password</label>
                <input type="password" name="newPassword" required/>

                <label>Confirm New Password</label>
                <input type="password" name="confirmPassword" required/>

                <button type="submit">Change Password</button>
            </form>

        </div>
    );
}