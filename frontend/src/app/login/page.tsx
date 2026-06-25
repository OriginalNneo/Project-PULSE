export default function LoginPage() {
  return (
    <div>
      <h1>Sign In to PULSE</h1>
      <p>Use your Singpass to access your correspondence securely.</p>

      <form aria-label="Sign in">
        <button type="submit" aria-label="Sign in with Singpass">
          Sign in with Singpass
        </button>
      </form>

      <section aria-labelledby="help">
        <h2 id="help">Need Help?</h2>
        <p>Call our hotline at <strong>6327 0000</strong> for assistance.</p>
        <p>We can help you in English, Mandarin, Malay, Tamil, and several dialects.</p>
      </section>
    </div>
  );
}
