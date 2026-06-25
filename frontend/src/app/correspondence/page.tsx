export default function CorrespondenceListPage() {
  return (
    <div>
      <h1>My Correspondence</h1>

      <form role="search" aria-label="Search correspondence">
        <label htmlFor="search">Search</label>
        <input type="search" id="search" placeholder="Search by title or category..." />
        <button type="submit">Search</button>
      </form>

      <nav aria-label="Filter correspondence">
        <ul>
          <li><a href="/correspondence?filter=all">All</a></li>
          <li><a href="/correspondence?filter=tax">Tax</a></li>
          <li><a href="/correspondence?filter=health">Healthcare</a></li>
          <li><a href="/correspondence?filter=housing">Housing</a></li>
          <li><a href="/correspondence?filter=employment">Employment</a></li>
          <li><a href="/correspondence?filter=legal">Legal</a></li>
        </ul>
      </nav>

      <section aria-label="Correspondence list">
        <p>No correspondence found.</p>
      </section>
    </div>
  );
}
