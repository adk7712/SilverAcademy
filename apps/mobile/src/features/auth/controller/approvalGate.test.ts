// UC #0-1 tests for the fake approval delay: fires once, cancel stops sign-in, double start ignored.
import { createApprovalGate } from './approvalGate';

describe('createApprovalGate', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('approves once after the delay', () => {
    const onApproved = jest.fn();
    const gate = createApprovalGate(2000, onApproved);
    expect(gate.start()).toBe(true);
    expect(gate.isActive()).toBe(true);
    jest.advanceTimersByTime(1999);
    expect(onApproved).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(gate.isActive()).toBe(false);
  });
  it('ignores a second start while waiting (double tap)', () => {
    const onApproved = jest.fn();
    const gate = createApprovalGate(2000, onApproved);
    expect(gate.start()).toBe(true);
    expect(gate.start()).toBe(false);
    jest.runAllTimers();
    expect(onApproved).toHaveBeenCalledTimes(1);
  });
  it('never approves after cancel (cancel or unmount during the delay)', () => {
    const onApproved = jest.fn();
    const gate = createApprovalGate(2000, onApproved);
    gate.start();
    gate.cancel();
    jest.runAllTimers();
    expect(onApproved).not.toHaveBeenCalled();
    expect(gate.isActive()).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('cancel is safe when idle and the gate can start again afterwards', () => {
    const onApproved = jest.fn();
    const gate = createApprovalGate(2000, onApproved);
    gate.cancel();
    expect(gate.start()).toBe(true);
    jest.runAllTimers();
    expect(onApproved).toHaveBeenCalledTimes(1);
  });
});
