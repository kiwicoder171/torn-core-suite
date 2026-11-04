import time
from analyzer import Deal
from cache import DealAlertCache


def make_sample_deal(price=800000, quantity=10):
    return Deal(
        item_id=206,
        item_name="Xanax",
        origin="bazaar",
        seller_id=12345,
        price=price,
        quantity=quantity,
        reference_price=835000,
        active_median=835000,
        baseline_price=835000,
        discount_pct=4.19,
        profit_per_unit=35000,
        total_potential_profit=35000 * quantity,
        is_high_mug_risk=False,
        mug_risk_reason=None,
        buy_url="https://www.torn.com/bazaar.php?userId=12345",
    )


def test_cache_deduplication():
    cache = DealAlertCache(ttl_seconds=60.0)
    deal = make_sample_deal(price=800000)

    # First time: should alert
    assert cache.should_alert(deal) is True
    cache.record_alert(deal)

    # Second time with identical price: should NOT alert
    assert cache.should_alert(deal) is False


def test_cache_re_alerts_on_price_drop():
    cache = DealAlertCache(ttl_seconds=60.0)
    deal1 = make_sample_deal(price=800000)

    cache.record_alert(deal1)
    assert cache.should_alert(deal1) is False

    # Seller drops price to $780k -> Should alert!
    deal2 = make_sample_deal(price=780000)
    assert cache.should_alert(deal2) is True


def test_cache_ttl_expiration():
    cache = DealAlertCache(ttl_seconds=0.05)
    deal = make_sample_deal(price=800000)

    cache.record_alert(deal)
    assert cache.should_alert(deal) is False

    time.sleep(0.06)
    assert cache.should_alert(deal) is True
