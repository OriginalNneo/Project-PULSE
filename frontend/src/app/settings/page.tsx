export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>

      <section aria-labelledby="language-settings">
        <h2 id="language-settings">Language & Communication</h2>
        <form aria-label="Language preferences">
          <div>
            <label htmlFor="preferred-language">Preferred Language</label>
            <select id="preferred-language">
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="ms">Bahasa Melayu (Malay)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
          <div>
            <label htmlFor="preferred-dialect">Preferred Dialect (optional)</label>
            <select id="preferred-dialect">
              <option value="">None</option>
              <optgroup label="Chinese Dialects">
                <option value="zh-hok">福建话 (Hokkien)</option>
                <option value="zh-can">广东话 (Cantonese)</option>
                <option value="zh-teo">潮州话 (Teochew)</option>
                <option value="zh-hak">客家话 (Hakka)</option>
                <option value="zh-hai">海南话 (Hainanese)</option>
              </optgroup>
              <optgroup label="Malay Varieties">
                <option value="ms-bms">Bazaar Melayu</option>
                <option value="ms-jav">Javanese</option>
              </optgroup>
              <optgroup label="Tamil & Indian Varieties">
                <option value="ta-sin">Singapore Tamil</option>
                <option value="ta-spo">Spoken Tamil</option>
                <option value="ml">Malayalam</option>
                <option value="pa">Punjabi</option>
                <option value="hi">Hindi</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label htmlFor="preferred-channel">Preferred Channel</label>
            <select id="preferred-channel">
              <option value="in-app">In-App</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="physical">Physical Mail</option>
              <option value="voice">Phone Call</option>
            </select>
          </div>
          <button type="submit">Save Preferences</button>
        </form>
      </section>

      <section aria-labelledby="accessibility-settings">
        <h2 id="accessibility-settings">Accessibility</h2>
        <form aria-label="Accessibility settings">
          <div>
            <label htmlFor="font-size">Text Size</label>
            <select id="font-size">
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
          <div>
            <label htmlFor="high-contrast">
              <input type="checkbox" id="high-contrast" />
              High Contrast Mode
            </label>
          </div>
          <div>
            <label htmlFor="voice-assist">
              <input type="checkbox" id="voice-assist" />
              Enable Voice Assist
            </label>
          </div>
          <button type="submit">Save Accessibility Settings</button>
        </form>
      </section>

      <section aria-labelledby="notification-settings">
        <h2 id="notification-settings">Notifications</h2>
        <form aria-label="Notification settings">
          <label htmlFor="notify-sms">
            <input type="checkbox" id="notify-sms" />
            SMS Notifications
          </label>
          <label htmlFor="notify-email">
            <input type="checkbox" id="notify-email" />
            Email Notifications
          </label>
          <label htmlFor="notify-push">
            <input type="checkbox" id="notify-push" />
            Push Notifications
          </label>
          <button type="submit">Save Notification Settings</button>
        </form>
      </section>
    </div>
  );
}
