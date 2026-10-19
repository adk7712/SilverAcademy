// UC #5-3: hooks for the incident list, one incident (with audit trail) and attachment links.
import { useCallback, useEffect, useState } from 'react';
import type { IncidentStatus } from '@silveracademy/shared';
import { useSessionGuard } from '../../auth';
import {
  attachmentUrl,
  fetchAuditTrail,
  fetchIncident,
  fetchIncidents,
} from '../repo/incidentRepo';
import type { AuditEntryView, IncidentView } from '../types';

export function useIncidentList(status: IncidentStatus | '') {
  const onSessionError = useSessionGuard();
  const [items, setItems] = useState<IncidentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; // ignore responses from a superseded filter or reload
    setLoading(true);
    setError(null);
    fetchIncidents(status || undefined).then(
      (list) => {
        if (!live) return;
        setItems(list);
        setLoading(false);
      },
      (e: unknown) => {
        if (!live) return;
        setError(e);
        setLoading(false);
        onSessionError(e);
      },
    );
    return () => {
      live = false;
    };
  }, [status, tick, onSessionError]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { items, loading, error, reload };
}

export function useIncident(id: string) {
  const onSessionError = useSessionGuard();
  const [incident, setIncident] = useState<IncidentView | null>(null);
  const [audit, setAudit] = useState<AuditEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; // ignore responses for a previous id or reload
    setLoading(true);
    setError(null);
    Promise.all([fetchIncident(id), fetchAuditTrail(id)]).then(
      ([inc, trail]) => {
        if (!live) return;
        setIncident(inc);
        setAudit(trail);
        setLoading(false);
      },
      (e: unknown) => {
        if (!live) return;
        setError(e);
        setLoading(false);
        onSessionError(e);
      },
    );
    return () => {
      live = false;
    };
  }, [id, tick, onSessionError]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { incident, audit, loading, error, reload };
}

const revokeAll = (urls: (string | null)[]) => urls.forEach((u) => u && URL.revokeObjectURL(u));

/** Resolves short-lived object URLs (read through storage rules) for attachment paths; a failure maps to null. */
export function useAttachmentUrls(paths: readonly string[]): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const key = paths.join('|');
  useEffect(() => {
    let live = true;
    let loaded: (string | null)[] = [];
    void Promise.all(
      paths.map(async (p) => [p, await attachmentUrl(p).catch(() => null)] as const),
    ).then((pairs) => {
      loaded = pairs.map(([, url]) => url);
      if (live) setUrls(Object.fromEntries(pairs));
      else revokeAll(loaded);
    });
    return () => {
      live = false;
      revokeAll(loaded); // object URLs are short-lived: released when the incident view closes (M5)
    };
  }, [key]);
  return urls;
}
