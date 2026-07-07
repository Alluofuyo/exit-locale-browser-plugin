import { useCallback, useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../src/browser/runtime';
import type { ExtensionSettings, IpCheckResult } from '../../src/shared/types';

type PopupState =
  | { status: 'loading' }
  | { status: 'ready'; settings: ExtensionSettings; result: IpCheckResult; refreshing: boolean }
  | { status: 'error'; message: string };

function getLocationLabel(result: IpCheckResult): string {
  return [result.city, result.region, result.country].filter(Boolean).join(', ') || 'Unknown location';
}

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }

  return date.toLocaleString();
}

export function App() {
  const [state, setState] = useState<PopupState>({ status: 'loading' });

  const load = useCallback(async (force = false) => {
    setState((current) =>
      current.status === 'ready' ? { ...current, refreshing: true } : { status: 'loading' },
    );

    const settingsResponse = await sendRuntimeMessage<ExtensionSettings>({ type: 'GET_SETTINGS' });
    if (!settingsResponse.ok) {
      setState({ status: 'error', message: settingsResponse.error.message });
      return;
    }

    const resultResponse = await sendRuntimeMessage<IpCheckResult>({
      type: 'CHECK_CURRENT_EXIT',
      force,
    });

    if (!resultResponse.ok) {
      setState({ status: 'error', message: resultResponse.error.message });
      return;
    }

    setState({
      status: 'ready',
      settings: settingsResponse.data,
      result: resultResponse.data,
      refreshing: false,
    });
  }, []);

  useEffect(() => {
    void load(false).catch((error: unknown) => {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to load popup state.',
      });
    });
  }, [load]);

  if (state.status === 'loading') {
    return (
      <main className="popup">
        <p className="muted">Checking current exit...</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="popup">
        <header>
          <h1>Locale Proxy</h1>
        </header>
        <p className="error">{state.message}</p>
        <button type="button" onClick={() => void load(true)}>
          Retry
        </button>
      </main>
    );
  }

  const { result, settings, refreshing } = state;
  const isSuccess = result.status === 'success';

  return (
    <main className="popup">
      <header>
        <h1>Locale Proxy</h1>
        <span className={settings.enabled ? 'status enabled' : 'status disabled'}>
          {settings.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </header>

      <section className="ip-panel">
        <div className="label">Current exit IP</div>
        <div className="ip-value">{isSuccess ? result.ip : 'Unavailable'}</div>
        <div className="location">{isSuccess ? getLocationLabel(result) : result.error?.message}</div>
      </section>

      <dl className="details">
        <div>
          <dt>ISP / ASN</dt>
          <dd>{[result.isp, result.asn].filter(Boolean).join(' / ') || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{result.timezone || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{result.providerId}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{formatCheckedAt(result.checkedAt)}</dd>
        </div>
      </dl>

      <button type="button" disabled={refreshing} onClick={() => void load(true)}>
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </main>
  );
}
