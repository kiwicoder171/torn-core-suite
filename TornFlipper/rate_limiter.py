import asyncio
import time
from collections import deque


class SlidingWindowRateLimiter:
    """
    Thread-safe & coroutine-safe sliding-window rate limiter.
    Ensures that no more than `max_calls` occur within any rolling `period_seconds` window.
    Designed for Torn API's 100 req/min rule, defaulting to a conservative 75 req/min.
    """

    def __init__(self, max_calls: int = 75, period_seconds: float = 60.0):
        if max_calls <= 0:
            raise ValueError("max_calls must be greater than 0")
        if period_seconds <= 0:
            raise ValueError("period_seconds must be greater than 0")

        self.max_calls = max_calls
        self.period = period_seconds
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

            while len(self._timestamps) >= self.max_calls:
                sleep_duration = self._timestamps[0] + self.period - now
                if sleep_duration > 0:
                    waited += sleep_duration
                    await asyncio.sleep(sleep_duration)
                now = time.monotonic()
                self._purge_expired(now)

            self._timestamps.append(time.monotonic())
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
