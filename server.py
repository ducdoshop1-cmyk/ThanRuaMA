#!/usr/bin/env python3
"""
MA Cloud Optimizer Server v1.0
Chay: python server.py
Mo trinh duyet: http://localhost:8888
"""

import http.server
import json
import urllib.request
import urllib.parse
import urllib.error
import os
import time
import sys
import ssl

PORT = int(os.environ.get('PORT', 8888))

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BINANCE_HOSTS = [
    'https://data-api.binance.vision',
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api4.binance.com',
]
_binance_ok_host = None

def fetch_json(url, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            })
            with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (451, 403):
                raise
            if attempt < retries:
                time.sleep(0.5)
                continue
            raise
        except Exception as e:
            if attempt < retries:
                time.sleep(0.5)
                continue
            raise

def binance_fetch(path):
    global _binance_ok_host
    if _binance_ok_host:
        try:
            return fetch_json(_binance_ok_host + path)
        except Exception:
            _binance_ok_host = None
    last_err = None
    for host in BINANCE_HOSTS:
        try:
            data = fetch_json(host + path, retries=1)
            _binance_ok_host = host
            sys.stdout.write(f"  [OK] Binance: {host}\n")
            sys.stdout.flush()
            return data
        except Exception as e:
            last_err = e
            sys.stdout.write(f"  [SKIP] {host}: {e}\n")
            sys.stdout.flush()
            continue
    raise Exception(f"Binance: all mirrors failed. Last: {last_err}")

class Handler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path.startswith('/api/'):
            try:
                self.route_api()
            except Exception as e:
                self.json_response(500, {'error': str(e)})
            return
        if self.path in ('/', ''):
            self.path = '/index.html'
        super().do_GET()

    def end_headers(self):
        if hasattr(self, 'path') and (self.path.endswith('.html') or self.path.endswith('.js') or self.path == '/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def route_api(self):
        p = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(p.query)
        g = lambda k, d='': q.get(k, [d])[0]

        if p.path == '/api/binance/klines':
            self.binance_klines(g('symbol','BTCUSDT'), g('interval','15m'), int(g('limit','10000')))
        elif p.path == '/api/binance/ticker':
            self.json_response(200, binance_fetch('/api/v3/ticker/24hr'))
        elif p.path == '/api/mexc/klines':
            self.mexc_futures_klines(g('symbol','BTC_USDT'), g('interval','Min15'), int(g('limit','10000')))
        elif p.path == '/api/mexc/ticker':
            self.json_response(200, fetch_json('https://contract.mexc.com/api/v1/contract/ticker'))
        else:
            self.json_response(404, {'error': 'Not found'})

    def binance_klines(self, symbol, interval, target):
        all_c = []
        end = int(time.time() * 1000)
        for b in range((target // 1000) + 2):
            d = binance_fetch(f'/api/v3/klines?symbol={symbol}&interval={interval}&limit=1000&endTime={end}')
            if not d: break
            all_c = d + all_c
            end = d[0][0] - 1
            if len(d) < 1000 or len(all_c) >= target: break
            if b > 0 and b % 5 == 0: time.sleep(0.2)
        self.json_response(200, all_c[-target:] if len(all_c) > target else all_c)

    def mexc_futures_klines(self, symbol, interval, target):
        sec_map = {
            'Min1':60,'Min3':180,'Min5':300,'Min15':900,'Min30':1800,
            'Min60':3600,'Hour4':14400,'Hour8':28800,
            'Day1':86400,'Week1':604800,'Month1':2592000
        }
        spc = sec_map.get(interval, 900)
        all_c = []
        end = int(time.time())
        per = 2000
        for b in range((target // per) + 2):
            start = end - per * spc
            url = f'https://contract.mexc.com/api/v1/contract/kline/{symbol}?interval={interval}&start={start}&end={end}'
            d = fetch_json(url)
            if not d or not d.get('success') or not d.get('data') or not d['data'].get('time'): break
            dd = d['data']
            if len(dd['time']) == 0: break
            batch = []
            for j in range(len(dd['time'])):
                batch.append([
                    dd['time'][j] * 1000,
                    str(dd['open'][j]), str(dd['high'][j]), str(dd['low'][j]),
                    str(dd['close'][j]), str(dd['vol'][j]),
                    0,'0',0,'0','0','0'
                ])
            all_c = batch + all_c
            end = start - 1
            if len(batch) < 100 or len(all_c) >= target: break
            time.sleep(0.1)
        self.json_response(200, all_c[-target:] if len(all_c) > target else all_c)

    def json_response(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        msg = str(args[0]) if args else ''
        if '/api/' in msg:
            sys.stdout.write(f"  [API] {msg}\n")
            sys.stdout.flush()

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    srv = http.server.HTTPServer(('0.0.0.0', PORT), Handler)
    print("")
    print("=" * 50)
    print("  MA Cloud Optimizer Server v1.0")
    print(f"  http://localhost:{PORT}")
    print("  Ctrl+C to stop")
    print("")
    print("  Binance: auto-fallback across 6 mirrors")
    print("  MEXC Futures: direct connection")
    print("=" * 50)
    print("")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        srv.server_close()

if __name__ == '__main__':
    run()
