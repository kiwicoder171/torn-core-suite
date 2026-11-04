import argparse
import asyncio
import json
import logging
import os
import signal
import sys
from typing import Any

from analyzer import MarketAnalyzer
from api_client import TornApiClient, TornApiException
from cache import DealAlertCache
from notifier import WebhookNotifier
from rate_limiter import SlidingWindowRateLimiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("TornFlipper")


class TornFlipperService:
    def __init__(self, config: dict[str, Any], items: dict[str, list[dict[str, Any]]]):
        self.config = config
        self.items = items
        self.running = False

        # Subsystems: smooth_spacing=True ensures perfectly metered pace without micro-bursts
        rate_limit = config.get("rate_limit_calls_per_minute", 60)
        self.rate_limiter = SlidingWindowRateLimiter(
            max_calls=rate_limit,
            period_seconds=60.0,
            smooth_spacing=True,
        )
        self.api_client = TornApiClient(
            api_key=config.get("api_key", ""),
            rate_limiter=self.rate_limiter,
        )
        self.analyzer = MarketAnalyzer(
            enable_mug_risk_warning=config.get("enable_mug_risk_warning", True),
            filter_single_unit_baits=config.get("filter_single_unit_baits", False),
            default_min_discount_pct=config.get("default_min_discount_pct", 3.0),
            default_min_profit=config.get("default_min_profit", 100000),
        )
        cache_ttl = config.get("cache_ttl_minutes", 30) * 60.0
        self.cache = DealAlertCache(ttl_seconds=cache_ttl)
        self.notifier = WebhookNotifier(
            discord_webhook_url=config.get("discord_webhook_url"),
            telegram_bot_token=config.get("telegram_bot_token"),
            telegram_chat_id=config.get("telegram_chat_id"),
        )

        intervals = config.get("poll_intervals", {})
        self.tier_1_interval = intervals.get("tier_1_seconds", 8.0)
        self.tier_2_interval = intervals.get("tier_2_seconds", 30.0)
        self.tier_3_interval = intervals.get("tier_3_seconds", 90.0)

    async def scan_item(self, item_config: dict[str, Any]) -> None:
        item_id = item_config["id"]
        item_name = item_config.get("name", f"Item #{item_id}")

        try:
            market_data = await self.api_client.fetch_market_data(item_id)
            deals = self.analyzer.find_deals(item_config, market_data)

            for deal in deals:
                if self.cache.should_alert(deal):
                    await self.notifier.notify_deal(deal)
                    self.cache.record_alert(deal)

        except TornApiException as e:
            logger.error(f"Torn API error scanning {item_name} (ID {item_id}): {e}")
        except Exception as ex:
            logger.error(f"Unexpected error scanning {item_name} (ID {item_id}): {ex}")

    async def scan_all_once(self) -> None:
        """Single pass scan through all configured tiers."""
        logger.info("Executing single full market scan pass...")
        all_items = (
            self.items.get("tier_1", [])
            + self.items.get("tier_2", [])
            + self.items.get("tier_3", [])
        )
        for item_config in all_items:
            await self.scan_item(item_config)
        logger.info("Single pass scan completed.")

    async def start(self) -> None:
        self.running = True
        logger.info("Initializing TornFlipper Service (Priority Metronome Mode)...")

        api_key = self.config.get("api_key", "").strip()
        if api_key and api_key != "YOUR_TORN_API_KEY_HERE":
            valid, msg = await self.api_client.verify_key()
            if valid:
                logger.info(f"✅ {msg}")
            else:
                logger.warning(f"⚠️ API Key check failed: {msg}")

        # Assemble priority schedule queue
        scheduled_items: list[dict[str, Any]] = []
        for it in self.items.get("tier_1", []):
            scheduled_items.append({"config": it, "tier": 1, "interval": self.tier_1_interval, "next_poll": 0.0})
        for it in self.items.get("tier_2", []):
            scheduled_items.append({"config": it, "tier": 2, "interval": self.tier_2_interval, "next_poll": 0.0})
        for it in self.items.get("tier_3", []):
            scheduled_items.append({"config": it, "tier": 3, "interval": self.tier_3_interval, "next_poll": 0.0})

        logger.info(
            f"Scheduler ready: {len(scheduled_items)} total items monitored. "
            f"Rate Ceiling: {self.rate_limiter.max_calls} calls/min (Spacing: ~{self.rate_limiter.min_spacing:.2f}s/req)"
        )

        try:
            while self.running:
                now = asyncio.get_event_loop().time()
                due_items = [it for it in scheduled_items if it["next_poll"] <= now]

                if not due_items:
                    earliest = min(it["next_poll"] for it in scheduled_items)
                    sleep_duration = max(0.1, earliest - now)
                    try:
                        await asyncio.sleep(sleep_duration)
                    except asyncio.CancelledError:
                        break
                    continue

                # Priority: Tier 1 > Tier 2 > Tier 3, then earliest scheduled
                due_items.sort(key=lambda x: (x["tier"], x["next_poll"]))
                target = due_items[0]

                if not self.running:
                    break

                await self.scan_item(target["config"])
                target["next_poll"] = asyncio.get_event_loop().time() + target["interval"]

        except asyncio.CancelledError:
            pass
        finally:
            self.running = False
            await self.shutdown()

    async def shutdown(self) -> None:
        logger.info("Shutting down TornFlipper...")
        self.running = False
        await self.api_client.close()
        await self.notifier.close()
        logger.info("TornFlipper shutdown complete.")


def load_json_file(filepath: str) -> dict[str, Any]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Configuration file not found: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="TornFlipper Market Deal Scanner")
    parser.add_argument("--config", default="config.json", help="Path to config.json")
    parser.add_argument("--items", default="items.json", help="Path to items.json")
    parser.add_argument("--once", action="store_true", help="Execute single pass scan and exit")
    parser.add_argument("--dry-run", action="store_true", help="Mock run without network alerts")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.isabs(args.config) or os.path.exists(args.config):
        config_path = args.config
    else:
        config_path = os.path.join(base_dir, args.config)

    if os.path.isabs(args.items) or os.path.exists(args.items):
        items_path = args.items
    else:
        items_path = os.path.join(base_dir, args.items)

    if not os.path.exists(config_path):
        example_config = os.path.join(base_dir, "config.example.json")
        if os.path.exists(example_config):
            logger.warning(f"No {config_path} found. Falling back to {example_config}")
            config_path = example_config
        else:
            logger.error(f"Cannot find config at {config_path}")
            sys.exit(1)

    config = load_json_file(config_path)
    items = load_json_file(items_path)

    service = TornFlipperService(config, items)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def handle_signal():
        service.running = False
        for task in asyncio.all_tasks(loop):
            task.cancel()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except NotImplementedError:
            pass

    try:
        if args.once:
            loop.run_until_complete(service.scan_all_once())
            loop.run_until_complete(service.shutdown())
        else:
            loop.run_until_complete(service.start())
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()


if __name__ == "__main__":
    main()
