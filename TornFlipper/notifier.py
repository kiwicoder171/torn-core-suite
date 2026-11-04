import asyncio
import logging
from typing import Any, Optional
import aiohttp

from analyzer import Deal

logger = logging.getLogger("TornFlipper.Notifier")


class WebhookNotifier:
    """
    Dispatches rich market deal notifications to Discord webhooks and/or Telegram chats.
    """

    def __init__(
        self,
        discord_webhook_url: Optional[str] = None,
        telegram_bot_token: Optional[str] = None,
        telegram_chat_id: Optional[str] = None,
        session: Optional[aiohttp.ClientSession] = None,
    ):
        self.discord_webhook_url = discord_webhook_url.strip() if discord_webhook_url else None
        self.telegram_bot_token = telegram_bot_token.strip() if telegram_bot_token else None
        self.telegram_chat_id = telegram_chat_id.strip() if telegram_chat_id else None
        self._external_session = session is not None
        self._session = session

    async def get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self) -> None:
        if not self._external_session and self._session and not self._session.closed:
            await self._session.close()

    async def notify_deal(self, deal: Deal) -> bool:
        """
        Broadcast deal alert across all configured channels.
        Always logs to console. Returns True if at least one remote dispatch succeeded.
        """
        # Always output formatted text to stdout/logs
        log_msg = (
            f"[DEAL DETECTED] {deal.item_name} @ ${deal.price:,} "
            f"({deal.quantity}x, -{deal.discount_pct}%, +${deal.total_potential_profit:,} profit) -> {deal.buy_url}"
        )
        if deal.is_high_mug_risk:
            logger.warning(f"⚠️ {log_msg} | {deal.mug_risk_reason}")
        else:
            logger.info(log_msg)

        dispatched = False

        if self.discord_webhook_url:
            success = await self._send_discord_embed(deal)
            if success:
                dispatched = True

        if self.telegram_bot_token and self.telegram_chat_id:
            success = await self._send_telegram_message(deal)
            if success:
                dispatched = True

        return dispatched

    async def _send_discord_embed(self, deal: Deal) -> bool:
        color = 0xF59E0B if deal.is_high_mug_risk else 0x10B981  # Amber or Emerald

        fields = [
            {"name": "🏷️ Deal Price", "value": f"**${deal.price:,}**", "inline": True},
            {"name": "🎯 Recommended Flip", "value": f"**${deal.recommended_flip_price:,}**", "inline": True},
            {"name": "📊 Reference", "value": f"${deal.reference_price:,} (-{deal.discount_pct}%)", "inline": True},
            {"name": "📦 Quantity", "value": f"**{deal.quantity:,}** units", "inline": True},
            {"name": "💳 Total to Buy All", "value": f"**${deal.total_cost:,}**", "inline": True},
            {
                "name": "💵 Total Flip Profit",
                "value": f"**+${deal.total_potential_profit:,}** *(+${deal.profit_per_unit:,}/ea)*",
                "inline": True,
            },
            {
                "name": "🏪 Origin",
                "value": f"{deal.origin.capitalize()} (Seller: `{deal.seller_id}`)",
                "inline": False,
            },
        ]

        if deal.is_high_mug_risk:
            fields.append({
                "name": "⚠️ MUG RISK WARNING",
                "value": f"*{deal.mug_risk_reason}*",
                "inline": False,
            })

        fields.append({
            "name": "⚡ Direct Buy Link",
            "value": f"[{'Open Seller Bazaar' if deal.origin == 'bazaar' else 'Open Item Market'}]({deal.buy_url})",
            "inline": False,
        })

        payload = {
            "username": "TornFlipper Bot",
            "avatar_url": "https://www.torn.com/images/v2/torn_city_logo.png",
            "embeds": [
                {
                    "title": f"🔔 FLIP OPPORTUNITY: {deal.item_name}",
                    "color": color,
                    "fields": fields,
                    "footer": {
                        "text": "TornFlipper • Manual 1-Click Purchase • Ban Safe"
                    },
                }
            ],
        }

        try:
            session = await self.get_session()
            async with session.post(self.discord_webhook_url, json=payload, timeout=5.0) as resp:
                if resp.status in (200, 204):
                    return True
                logger.error(f"Discord webhook error {resp.status}: {await resp.text()}")
        except Exception as e:
            logger.error(f"Failed to send Discord webhook: {e}")

        return False

    async def _send_telegram_message(self, deal: Deal) -> bool:
        url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"

        warning_line = f"\n⚠️ <b>MUG RISK:</b> {deal.mug_risk_reason}" if deal.is_high_mug_risk else ""
        text = (
            f"🔔 <b>FLIP OPPORTUNITY: {deal.item_name}</b>\n\n"
            f"🏷️ <b>Deal Price:</b> ${deal.price:,} (-{deal.discount_pct}%)\n"
            f"🎯 <b>Recommended Flip:</b> ${deal.recommended_flip_price:,}\n"
            f"📊 <b>Ref Market:</b> ${deal.reference_price:,}\n"
            f"📦 <b>Available:</b> {deal.quantity:,} units\n"
            f"💳 <b>Total to Buy All:</b> ${deal.total_cost:,}\n"
            f"💰 <b>Total Flip Profit:</b> +${deal.total_potential_profit:,}\n"
            f"🏪 <b>Origin:</b> {deal.origin.capitalize()} (Seller: {deal.seller_id})"
            f"{warning_line}\n\n"
            f"👉 <a href=\"{deal.buy_url}\"><b>Open {'Bazaar' if deal.origin == 'bazaar' else 'Item Market'} on Torn</b></a>"
        )

        payload = {
            "chat_id": self.telegram_chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": False,
        }

        try:
            session = await self.get_session()
            async with session.post(url, json=payload, timeout=5.0) as resp:
                if resp.status == 200:
                    return True
                logger.error(f"Telegram API error {resp.status}: {await resp.text()}")
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")

        return False
