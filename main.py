import requests
import time
import os

TOKEN = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("CHAT_ID")
BUY_ZONE = float(os.environ.get("BUY_ZONE", "2300"))
SELL_ZONE = float(os.environ.get("SELL_ZONE", "2350"))

def send_telegram(msg):
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": CHAT_ID, "text": msg, "parse_mode": "HTML"})

def get_gold_price():
    url = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    return r.json()["chart"]["result"][0]["meta"]["regularMarketPrice"]

send_telegram("✅ บอทเริ่มทำงานแล้ว!")
last_signal = None

while True:
    try:
        price = get_gold_price()
        print(f"ราคาปัจจุบัน: {price}")

        if price <= BUY_ZONE and last_signal != "BUY":
            send_telegram(f"🟢 <b>BUY SIGNAL!</b>\n💰 GOLD: {price}\n📍 Entry: {BUY_ZONE}")
            last_signal = "BUY"

        elif price >= SELL_ZONE and last_signal != "SELL":
            send_telegram(f"🔴 <b>SELL SIGNAL!</b>\n💰 GOLD: {price}\n📍 Entry: {SELL_ZONE}")
            last_signal = "SELL"

    except Exception as e:
        print(f"Error: {e}")

    time.sleep(60)
