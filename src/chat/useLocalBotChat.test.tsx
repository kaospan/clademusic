import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useLocalBotChat } from '@/chat/useLocalBotChat';

function Harness(props: { enabled: boolean; roomKey: string; intervalMs?: number }) {
  const { messages, sendLocalMessage } = useLocalBotChat({
    enabled: props.enabled,
    roomKey: props.roomKey,
    botIntervalMs: props.intervalMs ?? 1000,
    now: () => new Date('2026-02-04T12:00:00.000Z'),
    random: () => 0.42,
  });
  const [text, setText] = useState('');

  return (
    <div>
      <div data-testid="count">{messages.length}</div>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>{m.message}</li>
        ))}
      </ul>
      <input aria-label="msg" value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => sendLocalMessage(text)}>send</button>
    </div>
  );
}

describe('useLocalBotChat', () => {
  it('seeds bot messages when enabled', () => {
    render(<Harness enabled={true} roomKey="room:global" intervalMs={10_000} />);
    expect(Number(screen.getByTestId('count').textContent || '0')).toBeGreaterThanOrEqual(2);
  });

  it('adds bot messages over time', () => {
    vi.useFakeTimers();
    render(<Harness enabled={true} roomKey="room:global" intervalMs={1000} />);

    const initialCount = Number(screen.getByTestId('count').textContent || '0');
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const laterCount = Number(screen.getByTestId('count').textContent || '0');

    expect(laterCount).toBeGreaterThan(initialCount);
    vi.useRealTimers();
  });

  it('sendLocalMessage appends a user message', async () => {
    render(<Harness enabled={true} roomKey="room:global" intervalMs={10_000} />);

    const before = Number(screen.getByTestId('count').textContent || '0');
    fireEvent.change(screen.getByLabelText('msg'), { target: { value: 'Hello' } });
    act(() => {
      screen.getByText('send').click();
    });

    const after = Number(screen.getByTestId('count').textContent || '0');
    expect(after).toBe(before + 1);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('clears messages when roomKey changes', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Harness enabled={true} roomKey="room:a" intervalMs={10_000} />);
    const countA = Number(screen.getByTestId('count').textContent || '0');
    expect(countA).toBeGreaterThan(0);

    rerender(<Harness enabled={true} roomKey="room:b" intervalMs={10_000} />);
    const countB = Number(screen.getByTestId('count').textContent || '0');
    expect(countB).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
