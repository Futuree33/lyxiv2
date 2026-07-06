import { useEffect, useState } from 'react';
import { api, ApiError, type Setting } from '../lib/api';

const LABELS: Record<string, string> = {
  base_system_prompt: 'Base system prompt',
};

export function AdminPage() {
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminListSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load settings'));
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 md:px-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
      <p className="mt-1 mb-8 text-sm text-muted">Adjust app-wide settings.</p>

      {error && (
        <div className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {settings === null ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-hairline bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {settings.map((setting) => (
            <SettingEditor key={setting.key} setting={setting} />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingEditor({ setting }: { setting: Setting }) {
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.adminUpdateSetting(setting.key, value);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const dirty = value !== setting.value;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{LABELS[setting.key] ?? setting.key}</label>
        {setting.updatedAt && (
          <span className="text-xs text-faint">Updated {new Date(setting.updatedAt).toLocaleString()}</span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={10}
        className="w-full resize-y rounded-md border border-hairline bg-void px-3 py-2 font-mono text-xs text-ink outline-none focus:border-accent"
      />

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && !dirty && <span className="text-xs text-presence">Saved</span>}
      </div>
    </div>
  );
}
