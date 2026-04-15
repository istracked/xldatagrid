import { vi } from 'vitest';
import { EventBus } from '../events';
import { GridEvent } from '../types';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('dispatches events to registered handlers', async () => {
    const handler = vi.fn();
    bus.addHook({ event: 'cell:click', handler });
    await bus.dispatch('cell:click', { rowId: 'r1', field: 'name' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ type: 'cell:click', payload: { rowId: 'r1', field: 'name' } });
  });

  it('does not call handlers for other event types', async () => {
    const handler = vi.fn();
    bus.addHook({ event: 'cell:click', handler });
    await bus.dispatch('row:insert');
    expect(handler).not.toHaveBeenCalled();
  });

  it('before phase runs before on phase', async () => {
    const order: string[] = [];
    bus.addHook({ event: 'cell:click', phase: 'on', handler: () => { order.push('on'); } });
    bus.addHook({ event: 'cell:click', phase: 'before', handler: () => { order.push('before'); } });
    await bus.dispatch('cell:click');
    expect(order).toEqual(['before', 'on']);
  });

  it('after phase runs after on phase', async () => {
    const order: string[] = [];
    bus.addHook({ event: 'cell:click', phase: 'after', handler: () => { order.push('after'); } });
    bus.addHook({ event: 'cell:click', phase: 'on', handler: () => { order.push('on'); } });
    await bus.dispatch('cell:click');
    expect(order).toEqual(['on', 'after']);
  });

  it('all three phases run in order: before, on, after', async () => {
    const order: string[] = [];
    bus.addHook({ event: 'cell:click', phase: 'after', handler: () => { order.push('after'); } });
    bus.addHook({ event: 'cell:click', phase: 'on', handler: () => { order.push('on'); } });
    bus.addHook({ event: 'cell:click', phase: 'before', handler: () => { order.push('before'); } });
    await bus.dispatch('cell:click');
    expect(order).toEqual(['before', 'on', 'after']);
  });

  it('before phase can cancel the event via event.cancel()', async () => {
    bus.addHook({
      event: 'cell:click',
      phase: 'before',
      handler: (e) => { e.cancel!(); },
    });
    const event = await bus.dispatch('cell:click');
    expect(event.cancelled).toBe(true);
  });

  it('before phase can cancel the event by returning false', async () => {
    bus.addHook({
      event: 'cell:click',
      phase: 'before',
      handler: () => false,
    });
    const event = await bus.dispatch('cell:click');
    expect(event.cancelled).toBe(true);
  });

  it('cancelled event skips on phase handlers', async () => {
    const onHandler = vi.fn();
    bus.addHook({ event: 'cell:click', phase: 'before', handler: () => false });
    bus.addHook({ event: 'cell:click', phase: 'on', handler: onHandler });
    await bus.dispatch('cell:click');
    expect(onHandler).not.toHaveBeenCalled();
  });

  it('after phase always runs even when event is cancelled', async () => {
    const afterHandler = vi.fn();
    bus.addHook({ event: 'cell:click', phase: 'before', handler: () => false });
    bus.addHook({ event: 'cell:click', phase: 'after', handler: afterHandler });
    await bus.dispatch('cell:click');
    expect(afterHandler).toHaveBeenCalledTimes(1);
  });

  it('stops processing before handlers after cancellation', async () => {
    const secondBefore = vi.fn();
    bus.addHook({ event: 'cell:click', phase: 'before', priority: 100, handler: () => false });
    bus.addHook({ event: 'cell:click', phase: 'before', priority: 200, handler: secondBefore });
    await bus.dispatch('cell:click');
    expect(secondBefore).not.toHaveBeenCalled();
  });

  it('priority ordering within the same phase (lower number runs first)', async () => {
    const order: number[] = [];
    bus.addHook({ event: 'cell:click', phase: 'on', priority: 300, handler: () => { order.push(300); } });
    bus.addHook({ event: 'cell:click', phase: 'on', priority: 100, handler: () => { order.push(100); } });
    bus.addHook({ event: 'cell:click', phase: 'on', priority: 200, handler: () => { order.push(200); } });
    await bus.dispatch('cell:click');
    expect(order).toEqual([100, 200, 300]);
  });

  it('default phase is on and default priority is 500', async () => {
    const order: string[] = [];
    bus.addHook({ event: 'cell:click', priority: 400, phase: 'on', handler: () => { order.push('explicit-400'); } });
    bus.addHook({ event: 'cell:click', handler: () => { order.push('default-500'); } });
    await bus.dispatch('cell:click');
    expect(order).toEqual(['explicit-400', 'default-500']);
  });

  it('addHook returns a disposer that removes the hook', async () => {
    const handler = vi.fn();
    const remove = bus.addHook({ event: 'cell:click', handler });
    remove();
    await bus.dispatch('cell:click');
    expect(handler).not.toHaveBeenCalled();
  });

  it('disposer only removes its own hook, not others', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const removeA = bus.addHook({ event: 'cell:click', handler: handlerA });
    bus.addHook({ event: 'cell:click', handler: handlerB });
    removeA();
    await bus.dispatch('cell:click');
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it('subscribe notifies listener on every dispatch', async () => {
    const listener = vi.fn();
    bus.subscribe(listener);
    await bus.dispatch('cell:click');
    await bus.dispatch('row:insert');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('subscribe returns an unsubscribe function', async () => {
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);
    unsubscribe();
    await bus.dispatch('cell:click');
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies all listeners on dispatch', async () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    bus.subscribe(listenerA);
    bus.subscribe(listenerB);
    await bus.dispatch('cell:click');
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('clear removes all hooks', async () => {
    const handler = vi.fn();
    bus.addHook({ event: 'cell:click', handler });
    bus.clear();
    await bus.dispatch('cell:click');
    expect(handler).not.toHaveBeenCalled();
  });

  it('clear removes all listeners', async () => {
    const listener = vi.fn();
    bus.subscribe(listener);
    bus.clear();
    await bus.dispatch('cell:click');
    expect(listener).not.toHaveBeenCalled();
  });

  it('handles async handlers', async () => {
    const order: string[] = [];
    bus.addHook({
      event: 'cell:click',
      phase: 'on',
      handler: async () => {
        await Promise.resolve();
        order.push('async');
      },
    });
    bus.addHook({
      event: 'cell:click',
      phase: 'after',
      handler: () => { order.push('after'); },
    });
    await bus.dispatch('cell:click');
    expect(order).toEqual(['async', 'after']);
  });

  it('handles async before handler that cancels', async () => {
    const onHandler = vi.fn();
    bus.addHook({
      event: 'cell:click',
      phase: 'before',
      handler: async () => {
        await Promise.resolve();
        return false as const;
      },
    });
    bus.addHook({ event: 'cell:click', phase: 'on', handler: onHandler });
    const event = await bus.dispatch('cell:click');
    expect(event.cancelled).toBe(true);
    expect(onHandler).not.toHaveBeenCalled();
  });

  it('multiple hooks on the same event all receive the same event object', async () => {
    const received: GridEvent[] = [];
    bus.addHook({ event: 'cell:click', handler: (e) => { received.push(e); } });
    bus.addHook({ event: 'cell:click', handler: (e) => { received.push(e); } });
    await bus.dispatch('cell:click');
    expect(received).toHaveLength(2);
    expect(received[0]).toBe(received[1]);
  });

  it('returns the event object from dispatch', async () => {
    const event = await bus.dispatch('cell:click', { field: 'x' });
    expect(event.type).toBe('cell:click');
    expect(event.payload).toEqual({ field: 'x' });
    expect(typeof event.timestamp).toBe('number');
  });

  it('payload is passed through to the event', async () => {
    let received: Record<string, unknown> = {};
    bus.addHook({ event: 'row:insert', handler: (e) => { received = e.payload; } });
    await bus.dispatch('row:insert', { rowId: '42', index: 5 });
    expect(received).toEqual({ rowId: '42', index: 5 });
  });

  it('dispatch with no payload defaults to empty object', async () => {
    let received: Record<string, unknown> | undefined;
    bus.addHook({ event: 'grid:mount', handler: (e) => { received = e.payload; } });
    await bus.dispatch('grid:mount');
    expect(received).toEqual({});
  });
});
