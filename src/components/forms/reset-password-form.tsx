"use client";

export function ResetPasswordForm() {
  return (
    <div>
      <section >
        <form id="reset-password">
          <h1>Reset Password</h1>
          <p color ="white">Enter your email address and we will send you a reset link.</p>
          <div className="inputbox">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>
          <button type="submit">Send Reset Link</button>
        </form>
      </section>
    </div>
  );
}
