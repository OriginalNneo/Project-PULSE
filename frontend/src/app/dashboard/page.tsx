export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      <section aria-labelledby="unread">
        <h2 id="unread">Unread Correspondence</h2>
        <p aria-live="polite">No unread correspondence.</p>
      </section>

      <section aria-labelledby="pending">
        <h2 id="pending">Pending Actions</h2>
        <p>No pending actions.</p>
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent">Recent Activity</h2>
        <p>No recent activity.</p>
      </section>
    </div>
  );
}
