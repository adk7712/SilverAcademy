// Storage rules tests (architecture.md 3.5): report attachments only.
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { createEnv, ids, personas } from './env';

let env: RulesTestEnvironment;
let p: ReturnType<typeof personas>;

const FIVE_MB = 5 * 1024 * 1024;
const png = { contentType: 'image/png' };
const bytes = (n: number) => new Uint8Array(n);
const fileRef = (c: ReturnType<typeof personas>[keyof ReturnType<typeof personas>], path: string) =>
  ref(c.storage(), path);

beforeAll(async () => {
  env = await createEnv();
  p = personas(env);
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearStorage());

describe('reportUploads/{uid}/{fileId}', () => {
  const own = `reportUploads/${ids.learner}/a.png`;
  it('owner uploads image/jpeg, image/png, application/pdf up to 5 MB', async () => {
    await assertSucceeds(uploadBytes(fileRef(p.learner, own), bytes(10), png));
    await assertSucceeds(
      uploadBytes(fileRef(p.learner, `reportUploads/${ids.learner}/b.jpg`), bytes(10), {
        contentType: 'image/jpeg',
      }),
    );
    await assertSucceeds(
      uploadBytes(fileRef(p.learner, `reportUploads/${ids.learner}/c.pdf`), bytes(FIVE_MB), {
        contentType: 'application/pdf',
      }),
    );
  });
  it('rejects oversize, wrong type, other users and anonymous', async () => {
    await assertFails(uploadBytes(fileRef(p.learner, own), bytes(FIVE_MB + 1), png));
    await assertFails(
      uploadBytes(fileRef(p.learner, own), bytes(10), { contentType: 'text/html' }),
    );
    await assertFails(uploadBytes(fileRef(p.other, own), bytes(10), png));
    await assertFails(uploadBytes(fileRef(p.anon, own), bytes(10), png));
    await assertFails(
      uploadBytes(fileRef(p.suspended, `reportUploads/${ids.suspended}/a.png`), bytes(10), png),
    );
  });
  it('owner and admin read; others cannot', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), own), bytes(10), png);
    });
    await assertSucceeds(getBytes(fileRef(p.learner, own)));
    await assertSucceeds(getBytes(fileRef(p.admin, own)));
    await assertFails(getBytes(fileRef(p.other, own)));
    await assertFails(getBytes(fileRef(p.partner, own)));
  });
  it('no overwrite-by-update or delete for anyone', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), own), bytes(10), png);
    });
    await assertFails(uploadBytes(fileRef(p.learner, own), bytes(11), png));
    await assertFails(deleteObject(fileRef(p.learner, own)));
    await assertFails(deleteObject(fileRef(p.admin, own)));
  });
});

describe('everything else', () => {
  it('is denied', async () => {
    await assertFails(uploadBytes(fileRef(p.admin, 'misc/x.png'), bytes(10), png));
    await assertFails(getBytes(fileRef(p.admin, 'misc/x.png')));
  });
});
