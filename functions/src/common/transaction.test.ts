import type { Firestore } from 'firebase-admin/firestore';
import { AppError } from '@silveracademy/shared';
import { runTx } from './transaction';

const fakeDb = (impl: () => Promise<unknown>) =>
  ({ runTransaction: jest.fn(impl) }) as unknown as Firestore & { runTransaction: jest.Mock };

describe('runTx', () => {
  it('returns the transaction result and passes maxAttempts', async () => {
    const db = fakeDb(() => Promise.resolve(42));
    await expect(runTx(db, () => Promise.resolve(1), 3)).resolves.toBe(42);
    expect(db.runTransaction).toHaveBeenCalledWith(expect.any(Function), { maxAttempts: 3 });
  });
  it('maps exhausted contention to BUSY_TRY_AGAIN', async () => {
    const db = fakeDb(() => Promise.reject({ code: 10 }));
    await expect(runTx(db, () => Promise.resolve(1))).rejects.toMatchObject({
      code: 'BUSY_TRY_AGAIN',
    });
  });
  it('lets AppError and other errors through unchanged', async () => {
    const appErr = new AppError('WORKSHOP_FULL');
    await expect(
      runTx(
        fakeDb(() => Promise.reject(appErr)),
        () => Promise.resolve(1),
      ),
    ).rejects.toBe(appErr);
    const other = new Error('x');
    await expect(
      runTx(
        fakeDb(() => Promise.reject(other)),
        () => Promise.resolve(1),
      ),
    ).rejects.toBe(other);
  });
});
