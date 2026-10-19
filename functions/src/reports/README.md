# reports

Report an Issue and the incident queue (ADR-020).

Callables (`reports-*`): `submitReport` (attachments verified in Storage, reference number `SA-YYMMDD-XXXXX` in Singapore time, retry on collision), `updateIncident` (workflow SUBMITTED -> UNDER_REVIEW -> AWAITING_INFO | RESOLVED -> CLOSED, audited, reporter notified).
Pure rules in `controller/`; Storage inspector is injectable (`AttachmentInspector`) for tests.
