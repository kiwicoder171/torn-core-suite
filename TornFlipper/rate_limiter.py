import asyncio
import time
from collections import deque


class SlidingWindowRateLimiter:
    """
    Thread-safe & coroutine-safe sliding-window rate limiter with optional smooth metronome pacing.
    Guarantees both:
    1. A hard maximum of `max_calls` in any rolling `period_seconds` window.
    2. Optional smooth spacing (`period_seconds / max_calls`) to prevent micro-burst traffic spikes.
    """

    def __init__(self, max_calls: int = 60, period_seconds: float = 60.0, smooth_spacing: bool = False):
        if max_calls <= 0:
            raise ValueError("max_calls must be greater than 0")
        if period_seconds <= 0:
            raise ValueError("period_seconds must be greater than 0")

        self.max_calls = max_calls
        self.period = period_seconds
        self.smooth_spacing = smooth_spacing
        self.min_spacing = (period_seconds / max_calls) if smooth_spacing else 0.0
        self._last_call: float = 0.0
        self._timestamps: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def acquire(self) -> float:
        """
        Wait if necessary until a call slot is available.
        Returns the duration (in seconds) waited (0.0 if slot was immediately open).
        """
        waited = 0.0
        async with self._lock:
            now = time.monotonic()
            self._purge_expired(now)

            # Smooth spacing to eliminate burst spikes
            if self.smooth_spacing and self._last_call > 0.0:
                elapsed_since_last = now - self._last_call
                if elapsed_since_last < self.min_spacing:
                    spacing_wait = self.min_spacing - elapsed_since_last
                    waited += spacing_wait
                    await asyncio.sleep(spacing_wait)
                    now = time.monotonic()
                    self._purge_expired(now)

            # Window capacity wait
            while len(self._timestamps) >= self.max_calls:
                sleep_duration = self._timestamps[0] + self.period - now
                if sleep_duration > 0:
                    waited += sleep_duration
                    await asyncio.sleep(sleep_duration)
                now = time.monotonic()
                self._purge_expired(now)

            self._last_call = time.monotonic()
            self._timestamps.append(self._last_call)
            return waited

    def remaining_calls(self) -> int:
        """Return the number of requests currently available in the active rolling window."""
        now = time.monotonic()
        self._purge_expired(now)
        return max(0, self.max_calls - len(self._timestamps))

    def _purge_expired(self, now: float) -> None:
        threshold = now - self.period
        while self._timestamps and self._timestamps[0] <= threshold:
            self._timestamps.popleft()
