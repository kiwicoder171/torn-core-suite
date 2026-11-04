import asyncio
import logging
from typing import Any, Optional
import aiohttp

from rate_limiter import SlidingWindowRateLimiter

logger = logging.getLogger("TornFlipper.API")


class TornApiException(Exception):
    def __init__(self, code: int, message: str):
        super().__init__(f"Torn API Error [{code}]: {message}")
        self.code = code
        self.message = message


class TornApiClient:
    """
    Async client for the official Torn.com API v1 with built-in rate-limiting and backoff.
    """

    BASE_URL = "https://api.torn.com"

    def __init__(
        self,
        api_key: str,
        rate_limiter: Optional[SlidingWindowRateLimiter] = None,
        session: Optional[aiohttp.ClientSession] = None,
        timeout_seconds: float = 10.0,
    ):
        self.api_key = api_key
        self.rate_limiter = rate_limiter or SlidingWindowRateLimiter(max_calls=75, period_seconds=60.0)
        self._external_session = session is not None
        self._session = session
        self.timeout = aiohttp.ClientTimeout(total=timeout_seconds)

    async def get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self) -> None:
        if not self._external_session and self._session and not self._session.closed:
            await self._session.close()

    async def fetch_market_data(self, item_id: int) -> dict[str, Any]:
        """
        Fetch active Bazaar and Item Market listings for a given item ID.
        Endpoint: https://api.torn.com/market/<item_id>?selections=bazaar,itemmarket&key=<key>
        """
        endpoint = f"{self.BASE_URL}/market/{item_id}?selections=bazaar,itemmarket&key={self.api_key}"
        return await self._execute_request(endpoint)

    async def verify_key(self) -> tuple[bool, str]:
        """
        Check if the API key is valid by querying the basic user endpoint.
        """
        endpoint = f"{self.BASE_URL}/user/?selections=basic&key={self.api_key}"
        try:
            data = await self._execute_request(endpoint)
            name = data.get("name", "Unknown")
            player_id = data.get("player_id", "Unknown")
            return True, f"Key verified for {name} [{player_id}]"
        except TornApiException as e:
            return False, str(e)
        except Exception as ex:
            return False, f"Network error: {ex}"

    async def _execute_request(self, url: str, max_retries: int = 3) -> dict[str, Any]:
        for attempt in range(max_retries):
            # Await rate limit slot
            await self.rate_limiter.acquire()
            session = await self.get_session()

            try:
                async with session.get(url) as response:
                    if response.status == 429:
                        wait_time = 15.0 * (attempt + 1)
                        logger.warning(f"HTTP 429 Rate limited by Torn. Backing off for {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue

                    if response.status >= 500:
                        wait_time = 3.0 * (attempt + 1)
                        logger.warning(f"HTTP {response.status} Server Error. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue

                    data = await response.json()

                    # Check for Torn API business-level errors
                    if "error" in data:
                        err = data["error"]
                        code = err.get("code", 0)
                        msg = err.get("error", "Unknown Torn API error")

                        # Code 5: Too Many Requests
                        if code == 5:
                            wait_time = 15.0 * (attempt + 1)
                            logger.warning(f"Torn API Code 5 (Too many requests). Backing off for {wait_time}s...")
                            await asyncio.sleep(wait_time)
                            continue

                        raise TornApiException(code=code, message=msg)

                    return data

            except aiohttp.ClientError as ce:
                if attempt == max_retries - 1:
                    logger.error(f"Client error contacting Torn API after {max_retries} attempts: {ce}")
                    raise
                await asyncio.sleep(2.0 * (attempt + 1))

        raise RuntimeError("Failed to fetch data from Torn API after max retries")
