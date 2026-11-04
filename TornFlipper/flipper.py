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

        # Subsystems
        rate_limit = config.get("rate_limit_calls_per_minute", 75)
        self.rate_limiter = SlidingWindowRateLimiter(max_calls=rate_limit, period_seconds=60.0)
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
        self.tier_1_interval = intervals.get("tier_1_seconds", 5.0)
        self.tier_2_interval = intervals.get("tier_2_seconds", 25.0)
        self.tier_3_interval = intervals.get("tier_3_seconds", 60.0)

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

    async def _tier_worker(self, tier_name: str, items_list: list[dict[str, Any]], interval: float) -> None:
        if not items_list:
            return

        logger.info(f"Starting {tier_name} loop ({len(items_list)} items, interval: {interval}s)")
        while self.running:
            start_time = asyncio.get_event_loop().time()

            for item_config in items_list:
                if not self.running:
                    break
                await self.scan_item(item_config)

            elapsed = asyncio.get_event_loop().time() - start_time
            sleep_time = max(0.5, interval - elapsed)
            try:
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                break

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
        logger.info("Initializing TornFlipper Service...")

        # If a real API key is supplied, attempt verification
        api_key = self.config.get("api_key", "").strip()
        if api_key and api_key != "YOUR_TORN_API_KEY_HERE":
            valid, msg = await self.api_client.verify_key()
            if valid:
                logger.info(f"✅ {msg}")
            else:
                logger.warning(f"⚠️ API Key check failed: {msg}")

        tier_1_items = self.items.get("tier_1", [])
        tier_2_items = self.items.get("tier_2", [])
        tier_3_items = self.items.get("tier_3", [])

        tasks = [
            asyncio.create_task(self._tier_worker("Tier 1", tier_1_items, self.tier_1_interval)),
            asyncio.create_task(self._tier_worker("Tier 2", tier_2_items, self.tier_2_interval)),
            asyncio.create_task(self._tier_worker("Tier 3", tier_3_items, self.tier_3_interval)),
        ]

        try:
            await asyncio.gather(*tasks)
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

    # Determine config and items paths
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
            # Signal handling on Windows / restricted environments
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
