import time
from typing import Optional
from analyzer import Deal


class DealAlertCache:
    """
    In-memory cache with TTL that prevents duplicate webhook alerts for the same listing.
    Re-alerts if the seller reduces the price further.
    """

    def __init__(self, ttl_seconds: float = 1800.0, max_entries: int = 1000):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        # Key: (item_id, origin, seller_id) -> (price, recorded_at)
        self._cache: dict[tuple[int, str, int], tuple[int, float]] = {}

    def should_alert(self, deal: Deal) -> bool:
        """
        Returns True if the deal is novel, has expired from cache, or has a lower price.
        """
        now = time.monotonic()
        key = (deal.item_id, deal.origin, deal.seller_id)

        if key not in self._cache:
            return True

        cached_price, recorded_at = self._cache[key]

        # If expired by TTL
        if now - recorded_at > self.ttl_seconds:
            return True

        # If price was lowered by seller, it's a new opportunity
        if deal.price < cached_price:
            return True

        # Otherwise, it's a duplicate active listing
        return False

    def record_alert(self, deal: Deal) -> None:
        """Record a deal as alerted."""
        now = time.monotonic()
        self._purge_expired(now)

        # Evict oldest if full
        if len(self._cache) >= self.max_entries:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            self._cache.pop(oldest_key, None)

        key = (deal.item_id, deal.origin, deal.seller_id)
        self._cache[key] = (deal.price, now)

    def clear(self) -> None:
        self._cache.clear()

    def _purge_expired(self, now: float) -> None:
        cutoff = now - self.ttl_seconds
        expired_keys = [k for k, v in self._cache.items() if v[1] < cutoff]
        for k in expired_keys:
            del self._cache[k]
