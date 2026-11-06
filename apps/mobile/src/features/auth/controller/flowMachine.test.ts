// UC #0-1 tests for the fake Singpass flow rules: busy guard, skipApproval, cancel, register, cancel-then-restart.
import { INITIAL_FLOW, stepFlow, type FlowAction, type FlowState } from './flowMachine';

const run = (actions: FlowAction[], from: FlowState = INITIAL_FLOW) => {
  let state = from;
  const effects = actions.map((a) => {
    const out = stepFlow(state, a);
    state = out.state;
    return out.effect;
  });
  return { state, effects };
};
const begin = (profileId = 'senior-62', skipApproval = false): FlowAction => ({
  type: 'begin',
  profileId,
  skipApproval,
});

describe('stepFlow', () => {
  it('begin starts the approval wait and marks busy', () => {
    const { state, effects } = run([begin()]);
    expect(effects[0]).toEqual({ kind: 'startApproval', attempt: 1 });
    expect(state).toEqual({ busy: true, approving: 'senior-62', attempt: 1 });
  });

  it('busy guard: a second begin or register is ignored while busy', () => {
    const { state, effects } = run([
      begin(),
      begin('learner-35'),
      begin('learner-35', true),
      { type: 'register', profileId: 'senior-62', registerAs: 'LEARNER' },
    ]);
    expect(effects.slice(1)).toEqual([{ kind: 'none' }, { kind: 'none' }, { kind: 'none' }]);
    expect(state.approving).toBe('senior-62');
    expect(state.attempt).toBe(1);
  });

  it('approval elapsing starts the login for the pending profile', () => {
    const { state, effects } = run([begin(), { type: 'approved', attempt: 1 }]);
    expect(effects[1]).toEqual({ kind: 'login', profileId: 'senior-62', attempt: 1 });
    expect(state).toEqual({ busy: true, approving: null, attempt: 1 });
  });

  it('skipApproval goes straight to login with no approving state', () => {
    const { state, effects } = run([begin('suspended-demo', true)]);
    expect(effects[0]).toEqual({ kind: 'login', profileId: 'suspended-demo', attempt: 1 });
    expect(state.approving).toBeNull();
    expect(state.busy).toBe(true);
  });

  it('settled frees the flow for the next attempt', () => {
    const { state } = run([begin('a', true), { type: 'settled', attempt: 1 }]);
    expect(state.busy).toBe(false);
  });

  it('register runs without an approval step', () => {
    const { state, effects } = run([
      { type: 'register', profileId: 'volunteer-28', registerAs: 'VOLUNTEER' },
    ]);
    expect(effects[0]).toEqual({
      kind: 'register',
      profileId: 'volunteer-28',
      registerAs: 'VOLUNTEER',
      attempt: 1,
    });
    expect(state.approving).toBeNull();
    expect(state.busy).toBe(true);
  });

  it('cancel during approval stops the wait and frees the flow', () => {
    const { state, effects } = run([begin(), { type: 'cancel' }]);
    expect(effects[1]).toEqual({ kind: 'cancelApproval' });
    expect(state).toMatchObject({ busy: false, approving: null });
  });

  it('a late approval of a cancelled attempt does nothing', () => {
    const { effects } = run([begin(), { type: 'cancel' }, { type: 'approved', attempt: 1 }]);
    expect(effects[2]).toEqual({ kind: 'none' });
  });

  it('cancel while a login is in flight frees the flow without a cancelApproval effect', () => {
    const { state, effects } = run([begin('a', true), { type: 'cancel' }]);
    expect(effects[1]).toEqual({ kind: 'none' });
    expect(state.busy).toBe(false);
  });

  it('cancel-then-restart: the old attempt settling does not clear the new attempt', () => {
    const { state, effects } = run([
      begin('a', true),
      { type: 'cancel' },
      begin('b'),
      { type: 'settled', attempt: 1 },
    ]);
    expect(effects[2]).toEqual({ kind: 'startApproval', attempt: 2 });
    expect(state).toEqual({ busy: true, approving: 'b', attempt: 2 });
  });

  it('cancel when idle is a no-op', () => {
    const { state, effects } = run([{ type: 'cancel' }]);
    expect(effects[0]).toEqual({ kind: 'none' });
    expect(state).toEqual(INITIAL_FLOW);
  });
});
