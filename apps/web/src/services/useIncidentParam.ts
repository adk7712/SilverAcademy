// UC #5-3 follow-up deep link: reads the `?incident=<referenceNo>` query param set by the incident detail page.
import { useSearchParams } from 'react-router-dom';

const INCIDENT_REF_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** The linked incident reference number, or null when absent or malformed. */
export function useIncidentParam(): string | null {
  const [params] = useSearchParams();
  const id = params.get('incident');
  return id && INCIDENT_REF_PATTERN.test(id) ? id : null;
}
