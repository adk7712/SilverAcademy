import { now } from './clock';

describe('clock', () => {
  it('returns a Date', () => {
    expect(now()).toBeInstanceOf(Date);
  });
});
