export default function ProxyPage() {
  return (
    <div>
      <h1>Proxy Access</h1>
      <p>Manage delegated access for caregivers and family members.</p>

      <section aria-labelledby="active-proxies">
        <h2 id="active-proxies">Active Proxy Relationships</h2>
        <p>No active proxy relationships.</p>
      </section>

      <section aria-labelledby="grant-access">
        <h2 id="grant-access">Grant Access to a Caregiver</h2>
        <form aria-label="Grant proxy access">
          <div>
            <label htmlFor="proxy-name">Caregiver Name</label>
            <input type="text" id="proxy-name" />
          </div>
          <div>
            <label htmlFor="proxy-relationship">Relationship</label>
            <select id="proxy-relationship">
              <option value="family">Family Member</option>
              <option value="caregiver">Caregiver</option>
              <option value="coordinator">Community Coordinator</option>
            </select>
          </div>
          <div>
            <label htmlFor="proxy-permissions">Permissions</label>
            <fieldset>
              <legend className="sr-only">Select permissions</legend>
              <label><input type="checkbox" /> View correspondence</label>
              <label><input type="checkbox" /> Take actions on my behalf</label>
              <label><input type="checkbox" /> Receive notifications</label>
            </fieldset>
          </div>
          <button type="submit">Grant Access</button>
        </form>
      </section>
    </div>
  );
}
