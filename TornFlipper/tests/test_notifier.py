import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from analyzer import Deal
from notifier import WebhookNotifier


def sample_deal():
    return Deal(
        item_id=206,
        item_name="Xanax",
        origin="bazaar",
        seller_id=12345,
        price=800000,
        quantity=10,
        reference_price=835000,
        active_median=835000,
        baseline_price=835000,
        discount_pct=4.19,
        profit_per_unit=35000,
        total_potential_profit=350000,
        is_high_mug_risk=False,
        mug_risk_reason=None,
        buy_url="https://www.torn.com/bazaar.php?userId=12345",
    )


def test_notifier_stdout_when_no_webhooks():
    async def _test():
        notifier = WebhookNotifier()
        deal = sample_deal()
        result = await notifier.notify_deal(deal)
        assert result is False

    asyncio.run(_test())


def test_notifier_discord_embed_dispatch():
    async def _test():
        notifier = WebhookNotifier(discord_webhook_url="https://discord.com/api/webhooks/mock")
        deal = sample_deal()

        mock_resp = AsyncMock()
        mock_resp.status = 204

        mock_session = MagicMock()
        mock_session.post.return_value.__aenter__.return_value = mock_resp

        with patch.object(notifier, "get_session", return_value=mock_session):
            success = await notifier._send_discord_embed(deal)
            assert success is True
            mock_session.post.assert_called_once()
            args, kwargs = mock_session.post.call_args
            assert args[0] == "https://discord.com/api/webhooks/mock"
            embed = kwargs["json"]["embeds"][0]
            assert "FLIP OPPORTUNITY: Xanax" in embed["title"]

    asyncio.run(_test())
