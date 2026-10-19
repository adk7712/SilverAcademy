# shared

Types, enums, zod schemas, constants and pure logic shared by mobile, web and functions. Consumed as TS source (no build step). Import everything from `@silveracademy/shared`.

| Path           | Contents                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | Every tunable value (architecture.md section 7 plus validation limits). No magic numbers elsewhere.                                 |
| `enums.ts`     | `const` arrays + union types (`ROLES`/`Role`, ...); arrays feed `z.enum`.                                                           |
| `errors.ts`    | `AppErrorCode` (type + enum-style object), `AppError`, `httpsCodeFor`.                                                              |
| `entities/`    | Firestore doc types per feature (`TimestampLike` for timestamps).                                                                   |
| `schemas/`     | zod input/output per callable, namespaced on the barrel (`bookingsSchemas.bookWorkshopInput`); `toFieldErrors` for `INVALID_INPUT`. |
| `callables.ts` | `CALLABLES` registry, `CallableName`, `CallableInput<N>`, `CallableOutput<N>`.                                                      |
| `logic/`       | Pure helpers: workshop filter/sort/recommend, check-in window, age, ticket/QR parse, voucher code.                                  |
| `services/`    | `AuthProvider`, `SingpassVerifier`, `MapProvider` interfaces (implementations: tasks 1.1, 1.6).                                     |
| `auth/`        | `MOCK_SINGPASS_PROFILES`.                                                                                                           |

Tests sit next to sources (`*.test.ts`); run `npm test` from the repo root.
