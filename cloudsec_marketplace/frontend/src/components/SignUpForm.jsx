import { useState } from "react";

export default function SignUpForm() {
  function handleSubmit(event) {
    event.preventDefault();
    // Handle form submission logic here
  }
  return (
    <div style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h1>Sign Up</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Username:
            <input
              type="username"
              id="username"
              placeholder="Enter your username"
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Email:
            <input type="email" id="email" placeholder="you@example.com" />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Password:
            <input type="password" id="password" placeholder="********" />
          </label>
        </div>

        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}
