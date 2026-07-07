import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../src/browser/runtime';
import type { ExtensionSettings } from '../../src/shared/types';

type OptionsState =
  | { status: 'loading' }
  | { status: 'ready'; settings: ExtensionSettings; saved: boolean }
  | { status: 'error'; message: string };

export function App() {
  const [state, setState] = useState<OptionsState>({ status: 'loading' });

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

  return (
    <main className="options">
      <header>
        <h1>Locale Proxy Settings</h1>
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
            <option value="ipapi">ipapi.co</option>
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
    </main>
  );
}
