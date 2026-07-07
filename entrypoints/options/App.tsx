import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../src/browser/runtime';
import {
  parseLanguagesInput,
  parseOptionalNumberInput,
  removeSiteRule,
  upsertDefaultLocaleProfile,
  upsertSiteRule,
} from '../../src/options/settings-editor';
import type { ExtensionSettings, LocaleProfile } from '../../src/shared/types';

type OptionsState =
  | { status: 'loading' }
  | { status: 'ready'; settings: ExtensionSettings; saved: boolean }
  | { status: 'error'; message: string };

export function App() {
  const [state, setState] = useState<OptionsState>({ status: 'loading' });
  const [newRulePattern, setNewRulePattern] = useState('');

  useEffect(() => {
    void sendRuntimeMessage<ExtensionSettings>({ type: 'GET_SETTINGS' }).then((response) => {
      if (response.ok) {
        setState({ status: 'ready', settings: response.data, saved: false });
      } else {
        setState({ status: 'error', message: response.error.message });
      }
    });
  }, []);

  async function save(settings: ExtensionSettings) {
    const response = await sendRuntimeMessage<ExtensionSettings>({
      type: 'SAVE_SETTINGS',
      settings,
    });

    if (response.ok) {
      setState({ status: 'ready', settings: response.data, saved: true });
    } else {
      setState({ status: 'error', message: response.error.message });
    }
  }

  if (state.status === 'loading') {
    return (
      <main className="options">
        <p>Loading settings...</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="options">
        <p className="error">{state.message}</p>
      </main>
    );
  }

  const { settings, saved } = state;
  const defaultLocaleProfile =
    settings.localeProfiles.find((profile) => profile.id === settings.defaultLocaleProfileId) ??
    settings.localeProfiles[0];
  const activeProfile: LocaleProfile = defaultLocaleProfile ?? {
    id: settings.defaultLocaleProfileId || 'default',
    name: 'Custom locale',
    languages: ['en-US'],
    timezone: 'UTC',
  };

  function saveActiveProfile(input: Partial<LocaleProfile>) {
    void save(
      upsertDefaultLocaleProfile(settings, {
        name: input.name ?? activeProfile.name,
        languages: input.languages ?? activeProfile.languages,
        timezone: input.timezone ?? activeProfile.timezone,
        latitude: 'latitude' in input ? input.latitude : activeProfile.latitude,
        longitude: 'longitude' in input ? input.longitude : activeProfile.longitude,
      }),
    );
  }

  function addSiteRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newRulePattern.trim()) {
      return;
    }

    void save(upsertSiteRule(settings, newRulePattern));
    setNewRulePattern('');
  }

  return (
    <main className="options">
      <header>
        <h1>Exit Locale Settings</h1>
        {saved && <span className="saved">Saved</span>}
      </header>

      <section>
        <h2>General</h2>
        <label className="row">
          <span>Extension enabled</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => void save({ ...settings, enabled: event.currentTarget.checked })}
          />
        </label>
      </section>

      <section>
        <h2>Exit IP check</h2>
        <label>
          Provider
          <select
            value={settings.ipCheck.providerId}
            onChange={(event) =>
              void save({
                ...settings,
                ipCheck: {
                  ...settings.ipCheck,
                  providerId: event.currentTarget.value,
                },
              })
            }
          >
            <option value="ipapi">ipapi.co with ipwho.is fallback</option>
            <option value="ipwhois">ipwho.is</option>
          </select>
        </label>

        <label>
          Timeout in milliseconds
          <input
            type="number"
            min={1000}
            step={500}
            value={settings.ipCheck.timeoutMs}
            onChange={(event) =>
              void save({
                ...settings,
                ipCheck: {
                  ...settings.ipCheck,
                  timeoutMs: Number(event.currentTarget.value),
                },
              })
            }
          />
        </label>

        <label>
          Cache TTL in milliseconds
          <input
            type="number"
            min={0}
            step={1000}
            value={settings.ipCheck.cacheTtlMs}
            onChange={(event) =>
              void save({
                ...settings,
                ipCheck: {
                  ...settings.ipCheck,
                  cacheTtlMs: Number(event.currentTarget.value),
                },
              })
            }
          />
        </label>
      </section>

      <section>
        <h2>Active spoofing profile</h2>
        <label>
          Name
          <input
            type="text"
            defaultValue={activeProfile.name}
            onBlur={(event) => saveActiveProfile({ name: event.currentTarget.value })}
          />
        </label>

        <label>
          Languages
          <input
            type="text"
            defaultValue={activeProfile.languages.join(', ')}
            onBlur={(event) => saveActiveProfile({ languages: parseLanguagesInput(event.currentTarget.value) })}
          />
        </label>

        <label>
          Timezone
          <input
            type="text"
            defaultValue={activeProfile.timezone}
            onBlur={(event) => saveActiveProfile({ timezone: event.currentTarget.value })}
          />
        </label>

        <div className="split">
          <label>
            Latitude
            <input
              type="number"
              step="0.0001"
              defaultValue={activeProfile.latitude ?? ''}
              onBlur={(event) =>
                saveActiveProfile({
                  latitude: parseOptionalNumberInput(event.currentTarget.value),
                  longitude: activeProfile.longitude,
                })
              }
            />
          </label>

          <label>
            Longitude
            <input
              type="number"
              step="0.0001"
              defaultValue={activeProfile.longitude ?? ''}
              onBlur={(event) =>
                saveActiveProfile({
                  latitude: activeProfile.latitude,
                  longitude: parseOptionalNumberInput(event.currentTarget.value),
                })
              }
            />
          </label>
        </div>
      </section>

      <section>
        <h2>Site rules</h2>
        <form className="rule-form" onSubmit={addSiteRule}>
          <label>
            Hostname pattern
            <input
              type="text"
              value={newRulePattern}
              placeholder="example.com"
              onChange={(event) => setNewRulePattern(event.currentTarget.value)}
            />
          </label>
          <button type="submit">Add rule</button>
        </form>

        {settings.siteRules.length > 0 ? (
          <div className="rule-list">
            {settings.siteRules.map((rule) => (
              <div className="rule-row" key={rule.id}>
                <label className="row">
                  <span>{rule.hostnamePattern}</span>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) =>
                      void save({
                        ...settings,
                        siteRules: settings.siteRules.map((item) =>
                          item.id === rule.id ? { ...item, enabled: event.currentTarget.checked } : item,
                        ),
                      })
                    }
                  />
                </label>
                <button type="button" onClick={() => void save(removeSiteRule(settings, rule.id))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No site rules configured.</p>
        )}
      </section>
    </main>
  );
}
