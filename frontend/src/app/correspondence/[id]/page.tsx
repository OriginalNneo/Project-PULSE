export default function CorrespondenceDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <nav aria-label="Breadcrumb">
        <a href="/correspondence">Back to Correspondence</a>
      </nav>

      <article aria-labelledby="correspondence-title">
        <h1 id="correspondence-title">Loading...</h1>
        <p>Correspondence ID: {params.id}</p>

        <section aria-label="Correspondence content">
          <p>Content will be displayed here.</p>
        </section>

        <section aria-label="Actions">
          <button type="button">Listen to this letter</button>
          <button type="button">Ask PULSE about this</button>
          <button type="button">Mark as read</button>
        </section>
      </article>
    </div>
  );
}
