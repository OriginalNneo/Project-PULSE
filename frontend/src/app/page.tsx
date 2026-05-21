export default function HomePage() {
  return (
    <div>
      <h1>Welcome to PULSE</h1>
      <p>People-centric Framework for Correspondence</p>
      <p>Helping Singapore citizens access and understand government correspondence with dignity and independence.</p>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions">Quick Actions</h2>
        <ul>
          <li><a href="/correspondence">View My Correspondence</a></li>
          <li><a href="/chat">Ask PULSE a Question</a></li>
          <li><a href="/proxy">Help a Family Member</a></li>
        </ul>
      </section>

      <section aria-labelledby="about">
        <h2 id="about">About PULSE</h2>
        <p>
          PULSE adapts government correspondence to your needs — larger text, simpler language,
          voice readout, and support in your preferred language or dialect.
        </p>
      </section>
    </div>
  );
}
