// UC #2-5 tests for report draft validation and attachment checks.
import { MAX_ATTACHMENT_BYTES } from '@silveracademy/shared';
import {
  attachmentPath,
  checkAttachment,
  maxAttachmentMb,
  validateReportDraft,
} from './reportLogic';

describe('validateReportDraft', () => {
  it('blocks missing category and short description', () => {
    expect(validateReportDraft({ category: null, description: 'short' })).toEqual({
      category: 'CATEGORY_REQUIRED',
      description: 'DESCRIPTION_TOO_SHORT',
    });
  });
  it('accepts a complete draft', () => {
    expect(
      validateReportDraft({ category: 'SOFTWARE', description: 'The app froze on login.' }),
    ).toEqual({});
  });
  it('trims before counting and caps length', () => {
    expect(validateReportDraft({ category: 'SOFTWARE', description: '   a   ' }).description).toBe(
      'DESCRIPTION_TOO_SHORT',
    );
    expect(
      validateReportDraft({ category: 'SOFTWARE', description: 'x'.repeat(2001) }).description,
    ).toBe('DESCRIPTION_TOO_LONG');
  });
});

describe('checkAttachment', () => {
  it('rejects oversize and unsupported types, accepts the limit', () => {
    expect(checkAttachment({ sizeBytes: MAX_ATTACHMENT_BYTES + 1, contentType: 'image/png' })).toBe(
      'TOO_LARGE',
    );
    expect(checkAttachment({ sizeBytes: 10, contentType: 'text/plain' })).toBe('BAD_TYPE');
    expect(
      checkAttachment({ sizeBytes: MAX_ATTACHMENT_BYTES, contentType: 'application/pdf' }),
    ).toBeNull();
  });
  it('exposes the limit in MB for messages', () => {
    expect(maxAttachmentMb).toBe(5);
  });
});

describe('attachmentPath', () => {
  it('builds a path under reportUploads/{uid}/', () => {
    expect(attachmentPath('u1', 'image/jpeg', 'n1')).toBe('reportUploads/u1/n1.jpg');
  });
});
