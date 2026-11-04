import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from api_client import TornApiClient, TornApiException
from rate_limiter import SlidingWindowRateLimiter


def test_api_client_fetch_market_data():
    async def _test():
        limiter = SlidingWindowRateLimiter(max_calls=10, period_seconds=1.0)
        client = TornApiClient(api_key="test_key", rate_limiter=limiter)

        mock_data = {
            "bazaar": [{"ID": 100, "cost": 820000, "quantity": 10}],
            "itemmarket": [],
        }

        mock_resp = AsyncMock()
        mock_resp.status = 200
        mock_resp.json = AsyncMock(return_value=mock_data)

        mock_session = MagicMock()
        mock_session.get.return_value.__aenter__.return_value = mock_resp

        with patch.object(client, "get_session", return_value=mock_session):
            data = await client.fetch_market_data(206)
            assert "bazaar" in data
            assert data["bazaar"][0]["cost"] == 820000

        await client.close()

    asyncio.run(_test())


def test_api_client_handles_torn_error():
    async def _test():
        client = TornApiClient(api_key="bad_key")

        mock_data = {
            "error": {"code": 2, "error": "Incorrect key"}
        }

        mock_resp = AsyncMock()
        mock_resp.status = 200
        mock_resp.json = AsyncMock(return_value=mock_data)

        mock_session = MagicMock()
        mock_session.get.return_value.__aenter__.return_value = mock_resp

        with patch.object(client, "get_session", return_value=mock_session):
            with pytest.raises(TornApiException) as exc_info:
                await client.fetch_market_data(206)
            assert exc_info.value.code == 2

        await client.close()

    asyncio.run(_test())
