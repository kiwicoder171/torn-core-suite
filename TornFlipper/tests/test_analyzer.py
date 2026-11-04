import pytest
from analyzer import MarketAnalyzer


@pytest.fixture
def analyzer():
    return MarketAnalyzer(
        enable_mug_risk_warning=True,
        filter_single_unit_baits=False,
        default_min_discount_pct=3.0,
        default_min_profit=100000,
    )


def test_analyzer_detects_valid_deal(analyzer):
    item_config = {
        "id": 206,
        "name": "Xanax",
        "baseline_price": 835000,
        "min_discount_pct": 3.0,
        "min_profit": 50000,
    }

    market_data = {
        "bazaar": [
            {"ID": 1001, "cost": 800000, "quantity": 10},  # Underpriced deal
            {"ID": 1002, "cost": 835000, "quantity": 50},
            {"ID": 1003, "cost": 836000, "quantity": 25},
            {"ID": 1004, "cost": 837000, "quantity": 10},
        ],
        "itemmarket": [
            {"ID": 2001, "cost": 838000, "quantity": 5},
        ],
    }

    deals = analyzer.find_deals(item_config, market_data)

    assert len(deals) == 1
    deal = deals[0]
    assert deal.item_name == "Xanax"
    assert deal.price == 800000
    assert deal.quantity == 10
    assert deal.profit_per_unit == 35000
    assert deal.total_potential_profit == 350000
    assert deal.origin == "bazaar"
    assert deal.seller_id == 1001
    assert "bazaar.php?userId=1001" in deal.buy_url
    assert not deal.is_high_mug_risk


def test_analyzer_flags_mug_risk(analyzer):
    item_config = {
        "id": 206,
        "name": "Xanax",
        "baseline_price": 835000,
        "min_discount_pct": 3.0,
        "min_profit": 50000,
    }

    # 1 unit at 50% discount -> Classic mugger bait
    market_data = {
        "bazaar": [
            {"ID": 9999, "cost": 500000, "quantity": 1},
            {"ID": 1002, "cost": 835000, "quantity": 50},
            {"ID": 1003, "cost": 836000, "quantity": 25},
            {"ID": 1004, "cost": 837000, "quantity": 10},
        ],
        "itemmarket": [],
    }

    deals = analyzer.find_deals(item_config, market_data)

    assert len(deals) == 1
    deal = deals[0]
    assert deal.is_high_mug_risk is True
    assert "Common mugger trap" in (deal.mug_risk_reason or "")


def test_analyzer_rejects_insufficient_profit(analyzer):
    item_config = {
        "id": 206,
        "name": "Xanax",
        "baseline_price": 835000,
        "min_discount_pct": 3.0,
        "min_profit": 100000,  # Needs $100k total
    }

    # 1 unit at $35k profit -> Rejected because total profit < $100k
    market_data = {
        "bazaar": [
            {"ID": 1001, "cost": 800000, "quantity": 1},
            {"ID": 1002, "cost": 835000, "quantity": 50},
            {"ID": 1003, "cost": 836000, "quantity": 25},
        ],
        "itemmarket": [],
    }

    deals = analyzer.find_deals(item_config, market_data)
    assert len(deals) == 0


def test_analyzer_imarket_link_generation(analyzer):
    item_config = {
        "id": 283,
        "name": "Donator Pack",
        "baseline_price": 23500000,
        "min_discount_pct": 2.0,
        "min_profit": 300000,
    }

    market_data = {
        "bazaar": [
            {"ID": 1001, "cost": 23500000, "quantity": 1},
        ],
        "itemmarket": [
            {"ID": 5555, "cost": 22000000, "quantity": 2},  # $1.5M profit each
        ],
    }

    deals = analyzer.find_deals(item_config, market_data)
    assert len(deals) == 1
    deal = deals[0]
    assert deal.origin == "itemmarket"
    assert "page.php?sid=ItemMarket" in deal.buy_url
    assert "itemID=283" in deal.buy_url
    assert "itemName=Donator%20Pack" in deal.buy_url
