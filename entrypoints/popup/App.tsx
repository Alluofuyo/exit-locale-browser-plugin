import { useCallback, useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../src/browser/runtime';
import type { ExtensionSettings, IpCheckResult, LocaleRecommendation } from '../../src/shared/types';

type PopupState =
  | { status: 'loading' }
  | {
      status: 'ready';
      settings: ExtensionSettings;
      result: IpCheckResult;
      recommendation: LocaleRecommendation;
      refreshing: boolean;
      applying: boolean;
    }
  | { status: 'error'; message: string };

interface ApplyLocaleRecommendationResponse {
  settings: ExtensionSettings;
  recommendation: LocaleRecommendation;
}

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

    const recommendationResponse = await sendRuntimeMessage<LocaleRecommendation>({
      type: 'GET_LOCALE_RECOMMENDATION',
    });

    if (!recommendationResponse.ok) {
      setState({ status: 'error', message: recommendationResponse.error.message });
      return;
    }

    setState({
      status: 'ready',
      settings: settingsResponse.data,
      result: resultResponse.data,
      recommendation: recommendationResponse.data,
      refreshing: false,
      applying: false,
    });
  }, []);

  async function applyRecommendation() {
    if (state.status !== 'ready' || state.recommendation.status !== 'available') {
      return;
    }

    setState({ ...state, applying: true });
    const response = await sendRuntimeMessage<ApplyLocaleRecommendationResponse>({
      type: 'APPLY_LOCALE_RECOMMENDATION',
    });

    if (!response.ok) {
      setState({ status: 'error', message: response.error.message });
      return;
    }

    setState({
      ...state,
      settings: response.data.settings,
      recommendation: response.data.recommendation,
      applying: false,
    });
  }

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
          <h1>Exit Locale</h1>
        </header>
        <p className="error">{state.message}</p>
        <button type="button" onClick={() => void load(true)}>
          Retry
        </button>
      </main>
    );
  }

  const { result, settings, recommendation, refreshing, applying } = state;
  const isSuccess = result.status === 'success';
  const canApplyRecommendation = recommendation.status === 'available';

  return (
    <main className="popup">
      <header>
        <h1>Exit Locale</h1>
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

      <section className="recommendation-panel">
        <div className="recommendation-header">
          <div>
            <div className="label">Recommended spoofing</div>
            <div className="recommendation-title">
              {canApplyRecommendation ? `${recommendation.confidence} confidence` : 'Unavailable'}
            </div>
          </div>
        </div>

        {canApplyRecommendation ? (
          <dl className="details">
            <div>
              <dt>Languages</dt>
              <dd>{recommendation.languages.join(', ') || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{recommendation.timezone || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Geolocation</dt>
              <dd>
                {recommendation.geolocation
                  ? `${recommendation.geolocation.label} (${recommendation.geolocation.latitude.toFixed(4)}, ${recommendation.geolocation.longitude.toFixed(4)})`
                  : 'Unknown'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="muted">{recommendation.reason}</p>
        )}
      </section>

      <button type="button" disabled={!canApplyRecommendation || applying} onClick={() => void applyRecommendation()}>
        {applying ? 'Applying...' : 'Apply recommendation'}
      </button>

      <button type="button" disabled={refreshing} onClick={() => void load(true)}>
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </main>
  );
}
