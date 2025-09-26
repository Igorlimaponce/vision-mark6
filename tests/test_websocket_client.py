#!/usr/bin/env python3
"""
Cliente WebSocket de teste para verificar conexões em tempo real do AIOS
"""

import asyncio
import websockets
import json
import requests
from urllib.parse import urlencode

async def test_websocket_connection():
    # Primeiro, fazer login para obter token
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "email": "admin@aios.com",
        "password": "admin123"
    }
    
    print("🔐 Fazendo login...")
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            token = response.json()["access_token"]
            print(f"✅ Login realizado com sucesso!")
        else:
            print(f"❌ Erro no login: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        return

    # Conectar ao WebSocket
    ws_url = f"ws://localhost:8000/api/v1/ws/ws?token={token}"
    print(f"🌐 Conectando ao WebSocket: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ Conectado ao WebSocket!")
            print("📡 Aguardando mensagens em tempo real...")
            
            # Escutar mensagens por 30 segundos
            timeout_counter = 0
            while timeout_counter < 30:
                try:
                    # Aguarda por mensagem com timeout de 1 segundo
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    
                    print(f"\n📨 Mensagem recebida:")
                    print(f"   Tipo: {data.get('type', 'unknown')}")
                    print(f"   Timestamp: {data.get('timestamp', 'N/A')}")
                    
                    if data.get('type') == 'system_metrics':
                        metrics = data.get('data', {})
                        print(f"   CPU: {metrics.get('cpu_usage', 'N/A')}%")
                        print(f"   Memória: {metrics.get('memory_usage', 'N/A')}%")
                        print(f"   Dispositivos Online: {metrics.get('devices_online', 'N/A')}")
                        
                except asyncio.TimeoutError:
                    timeout_counter += 1
                    print(".", end="", flush=True)
                    
            print(f"\n🔚 Teste finalizado após 30 segundos")
                    
    except Exception as e:
        print(f"❌ Erro na conexão WebSocket: {e}")

if __name__ == "__main__":
    print("🚀 Testando conexão WebSocket do AIOS...")
    asyncio.run(test_websocket_connection())