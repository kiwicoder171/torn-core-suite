import asyncio
import time
from rate_limiter import SlidingWindowRateLimiter


def test_sliding_window_burst():
    async def _test():
        limiter = SlidingWindowRateLimiter(max_calls=3, period_seconds=0.2)
        assert limiter.remaining_calls() == 3

        # First 3 should take ~0 seconds
        w1 = await limiter.acquire()
        w2 = await limiter.acquire()
        w3 = await limiter.acquire()

        assert w1 == 0.0
        assert w2 == 0.0
        assert w3 == 0.0
        assert limiter.remaining_calls() == 0

        # 4th call must wait for the window to slide
        t0 = time.monotonic()
        w4 = await limiter.acquire()
        elapsed = time.monotonic() - t0

        assert elapsed >= 0.15
        assert w4 > 0.0

    asyncio.run(_test())


def test_sliding_window_expiry():
    async def _test():
        limiter = SlidingWindowRateLimiter(max_calls=2, period_seconds=0.1)

        await limiter.acquire()
        await limiter.acquire()
        assert limiter.remaining_calls() == 0

        await asyncio.sleep(0.12)
        assert limiter.remaining_calls() == 2

    asyncio.run(_test())
