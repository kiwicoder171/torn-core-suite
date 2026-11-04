from dataclasses import dataclass
import statistics
import urllib.parse
from typing import Any, Optional


@dataclass(frozen=True)
class Deal:
    item_id: int
    item_name: str
    origin: str  # "bazaar" or "itemmarket"
    seller_id: int  # User ID for Bazaar, Listing/Seller ID for Item Market
    price: int
    quantity: int
    reference_price: int
    recommended_flip_price: int  # Exact price to relist for a fast, profitable flip
    active_median: int
    baseline_price: int
    discount_pct: float
    profit_per_unit: int
    total_potential_profit: int
    is_high_mug_risk: bool
    mug_risk_reason: Optional[str]
    buy_url: str

    @property
    def dedupe_key(self) -> str:
        """Unique key for cache deduplication."""
        return f"{self.item_id}:{self.origin}:{self.seller_id}:{self.price}"


class MarketAnalyzer:
    """
    Analyzes Torn market order books with dual-anchor pricing and anti-mugger heuristics.
    Supports both Torn API v1 and Torn API v2 payload schemas.
    """

    def __init__(
        self,
        enable_mug_risk_warning: bool = True,
        filter_single_unit_baits: bool = False,
        default_min_discount_pct: float = 3.0,
        default_min_profit: int = 100000,
    ):
        self.enable_mug_risk_warning = enable_mug_risk_warning
        self.filter_single_unit_baits = filter_single_unit_baits
        self.default_min_discount_pct = default_min_discount_pct
        self.default_min_profit = default_min_profit

    def find_deals(self, item_config: dict[str, Any], market_data: dict[str, Any]) -> list[Deal]:
        item_id = item_config["id"]
        item_name = item_config.get("name", f"Item #{item_id}")
        baseline_price = item_config.get("baseline_price", 0)
        min_discount_pct = item_config.get("min_discount_pct", self.default_min_discount_pct)
        min_profit = item_config.get("min_profit", self.default_min_profit)

        normalized_listings: list[dict[str, Any]] = []

        # 1. Parse itemmarket (Handles API v2 object schema or API v1 list schema)
        imarket_raw = market_data.get("itemmarket")
        if isinstance(imarket_raw, dict):
            # API v2 schema: {"item": {"average_price": ...}, "listings": [{"price": ..., "amount": ...}]}
            v2_item = imarket_raw.get("item", {})
            v2_avg = v2_item.get("average_price", 0)
            if baseline_price <= 0 and v2_avg > 0:
                baseline_price = v2_avg

            for item in imarket_raw.get("listings", []):
                cost = item.get("price") if "price" in item else item.get("cost", 0)
                qty = item.get("amount") if "amount" in item else item.get("quantity", 0)
                seller_id = item.get("seller_id") or item.get("ID", 0)
                normalized_listings.append({
                    "origin": "itemmarket",
                    "seller_id": seller_id,
                    "cost": cost,
                    "quantity": qty,
                })
        elif isinstance(imarket_raw, list):
            # API v1 schema
            for item in imarket_raw:
                cost = item.get("cost") if "cost" in item else item.get("price", 0)
                qty = item.get("quantity") if "quantity" in item else item.get("amount", 0)
                seller_id = item.get("ID") or item.get("seller_id", 0)
                normalized_listings.append({
                    "origin": "itemmarket",
                    "seller_id": seller_id,
                    "cost": cost,
                    "quantity": qty,
                })

        # 2. Parse bazaar listings (if present)
        bazaar_raw = market_data.get("bazaar")
        if isinstance(bazaar_raw, list):
            for bz in bazaar_raw:
                cost = bz.get("cost") if "cost" in bz else bz.get("price", 0)
                qty = bz.get("quantity") if "quantity" in bz else bz.get("amount", 0)
                seller_id = bz.get("ID") or bz.get("seller_id", 0)
                normalized_listings.append({
                    "origin": "bazaar",
                    "seller_id": seller_id,
                    "cost": cost,
                    "quantity": qty,
                })

        # Filter out zero or negative price/quantity entries
        valid_listings = [
            x for x in normalized_listings
            if x["cost"] > 0 and x["quantity"] > 0
        ]

        if not valid_listings:
            return []

        # Sort ascending by cost
        valid_listings.sort(key=lambda x: x["cost"])

        # Compute active market median from top 3-5 listings
        median_pool = valid_listings
        if self.filter_single_unit_baits:
            non_single = [x for x in valid_listings if x["quantity"] > 1]
            if len(non_single) >= 3:
                median_pool = non_single

        sample_size = min(5, len(median_pool))
        sample_costs = [x["cost"] for x in median_pool[:sample_size]]

        if sample_costs:
            active_median = int(statistics.median(sample_costs))
        else:
            active_median = baseline_price

        # Determine reference anchor:
        if baseline_price > 0 and active_median > 0:
            reference_price = min(active_median, baseline_price)
        elif active_median > 0:
            reference_price = active_median
        else:
            reference_price = baseline_price

        if reference_price <= 0:
            return []

        deals: list[Deal] = []

        for listing in valid_listings:
            cost = listing["cost"]
            quantity = listing["quantity"]
            origin = listing["origin"]
            seller_id = listing["seller_id"]

            if cost >= reference_price:
                # Since listings are sorted, no further listing is below reference price
                break

            discount_pct = ((reference_price - cost) / reference_price) * 100.0
            # Relist at reference price minus $1 to undercut market and sell rapidly
            recommended_flip_price = max(cost + 1, reference_price - 1)
            profit_per_unit = recommended_flip_price - cost
            total_potential_profit = profit_per_unit * quantity

            # Check threshold constraints
            if discount_pct < min_discount_pct:
                continue

            if total_potential_profit < min_profit:
                continue

            # Mugger Risk Heuristic
            is_mug_risk = False
            mug_reason = None
            if self.enable_mug_risk_warning and quantity <= 3 and discount_pct >= 5.0:
                is_mug_risk = True
                mug_reason = (
                    f"Low quantity ({quantity} unit{'s' if quantity > 1 else ''}) "
                    f"with high discount ({discount_pct:.1f}%). Common mugger trap!"
                )

            # Generate target URL
            if origin == "bazaar":
                buy_url = f"https://www.torn.com/bazaar.php?userId={seller_id}"
            else:
                encoded_name = urllib.parse.quote(item_name)
                buy_url = f"https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID={item_id}&itemName={encoded_name}"

            deal = Deal(
                item_id=item_id,
                item_name=item_name,
                origin=origin,
                seller_id=seller_id,
                price=cost,
                quantity=quantity,
                reference_price=reference_price,
                recommended_flip_price=recommended_flip_price,
                active_median=active_median,
                baseline_price=baseline_price,
                discount_pct=round(discount_pct, 2),
                profit_per_unit=profit_per_unit,
                total_potential_profit=total_potential_profit,
                is_high_mug_risk=is_mug_risk,
                mug_risk_reason=mug_reason,
                buy_url=buy_url,
            )
            deals.append(deal)

        return deals
