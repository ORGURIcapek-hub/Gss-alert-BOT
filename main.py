import requests
import time
import os

TOKEN = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("CHAT_ID")
BUY_ZONE = float(os.environ.get("BUY_ZONE", "2300"))
SELL_ZONE = float(os.environ.get("SELL_ZONE", "2350"))

TP_POINTS = 500
SL_POINTS = 500

def send_telegram(msg):
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": CHAT_ID, "text": msg, "parse_mode": "HTML"})

def get_gold_price():
    url = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    return r.json()["chart"]["result"][0]["meta"]["regularMarketPrice"]

def send_buy_alert(price):
    msg = (
        f"🟢 <b>BUY SIGNAL!</b>\n"
        f"━━━━━━━━━━━━━━\n"
        f"📍 Entry: <b>{price:.1f}</b>\n"
        f"━━━━━━━━━━━━━━\n"
        f"🎯 TP1: {price + TP_POINTS:.1f} (+{TP_POINTS})\n"
        f"🎯 TP2: {price + TP_POINTS*2:.1f} (+{TP_POINTS*2})\n"
        f"🎯 TP3: {price + TP_POINTS*3:.1f} (+{TP_POINTS*3})\n"
        f"🎯 TP4: {price + TP_POINTS*4:.1f} (+{TP_POINTS*4})\n"
        f"━━━━━━━━━━━━━━\n"
        f"🛑 SL: {price - SL_POINTS:.1f} (-{SL_POINTS})"
    )
    send_telegram(msg)

def send_sell_alert(price):
    msg = (
        f"🔴 <b>SELL SIGNAL!</b>\n"
        f"━━━━━━━━━━━━━━\n"
        f"📍 Entry: <b>{price:.1f}</b>\n"
        f"━━━━━━━━━━━━━━\n"
        f"🎯 TP1: {price - TP_POINTS:.1f} (+{TP_POINTS})\n"
        f"🎯 TP2: {price - TP_POINTS*2:.1f} (+{TP_POINTS*2})\n"
        f"🎯 TP3: {price - TP_POINTS*3:.1f} (+{TP_POINTS*3})\n"
        f"🎯 TP4: {price - TP_POINTS*4:.1f} (+{TP_POINTS*4})\n"
        f"━━━━━━━━━━━━━━\n"
        f"🛑 SL: {price + SL_POINTS:.1f} (-{SL_POINTS})"
    )
    send_telegram(msg)

send_telegram("✅ <b>GSS Alert Bot เริ่มทำงานแล้ว!</b>")
last_signal = None
