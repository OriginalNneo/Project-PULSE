export default function ChatPage() {
  return (
    <div>
      <h1>Ask PULSE</h1>
      <p>Ask a question about your government correspondence in any language or dialect.</p>

      <div role="log" aria-label="Conversation" aria-live="polite" aria-atomic="false">
        <div role="article" aria-label="PULSE greeting">
          <p>Hello! I&apos;m PULSE. How can I help you today? You can ask me about tax letters, healthcare appointments, housing matters, or any government correspondence.</p>
        </div>
      </div>

      <form aria-label="Send a message">
        <label htmlFor="chat-input" className="sr-only">Type your question</label>
        <textarea
          id="chat-input"
          placeholder="Type your question in any language..."
          rows={3}
        />
        <button type="submit">Send</button>
      </form>

      <nav aria-label="Language selection">
        <p>Prefer another language?</p>
        <ul>
          <li><button type="button">English</button></li>
          <li><button type="button">中文</button></li>
          <li><button type="button">Bahasa Melayu</button></li>
          <li><button type="button">தமிழ்</button></li>
        </ul>
        <details>
          <summary>Dialects</summary>
          <ul>
            <li><button type="button">福建话 (Hokkien)</button></li>
            <li><button type="button">广东话 (Cantonese)</button></li>
            <li><button type="button">潮州话 (Teochew)</button></li>
            <li><button type="button">客家话 (Hakka)</button></li>
            <li><button type="button">海南话 (Hainanese)</button></li>
            <li><button type="button">Bazaar Melayu</button></li>
            <li><button type="button">Singapore Tamil</button></li>
          </ul>
        </details>
      </nav>
    </div>
  );
}
