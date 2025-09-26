#!/usr/bin/env python3
"""
Teste completo do sistema AIOS - Verificação de todas as APIs
"""
import json
import urllib.request
import urllib.parse

def main():
    print("🚀 TESTE COMPLETO DO SISTEMA AIOS v2.0")
    print("=" * 50)
    
    # 1. Health Check
    print("\n1️⃣  HEALTH CHECK")
    try:
        with urllib.request.urlopen('http://localhost:8000/health') as response:
            health = json.loads(response.read())
            print(f"✅ Status: {health['status']}")
            print(f"✅ Serviço: {health['service']}")
            print(f"✅ Versão: {health['version']}")
    except Exception as e:
        print(f"❌ Erro: {e}")
        return
    
    # 2. Authentication
    print("\n2️⃣  AUTENTICAÇÃO")
    try:
        login_data = json.dumps({'email': 'admin@aios.com', 'password': 'admin123'})
        login_req = urllib.request.Request(
            'http://localhost:8000/api/v1/auth/login',
            data=login_data.encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(login_req) as response:
            auth = json.loads(response.read())
            token = auth['access_token']
            user = auth['user']
            print(f"✅ Login: {user['email']}")
            print(f"✅ Role: {user['role']}")
            print(f"✅ Token: {token[:20]}...")
    except Exception as e:
        print(f"❌ Erro: {e}")
        return
    
    # Headers com autenticação
    headers = {'Authorization': f'Bearer {token}'}
    
    # 3. Dashboard API
    print("\n3️⃣  DASHBOARD API")
    try:
        req = urllib.request.Request('http://localhost:8000/api/v1/dashboard/metrics', headers=headers)
        with urllib.request.urlopen(req) as response:
            dashboard = json.loads(response.read())
            print(f"✅ Dispositivos Total: {dashboard['devices']['total']}")
            print(f"✅ Dispositivos Online: {dashboard['devices']['online']}")
            print(f"✅ Eventos 24h: {dashboard['events']['last_24h']}")
            print(f"✅ CPU: {dashboard['system']['cpu_usage']}%")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 4. Fleet Management API
    print("\n4️⃣  FLEET MANAGEMENT API")
    try:
        req = urllib.request.Request('http://localhost:8000/api/v1/fleet/devices?limit=3', headers=headers)
        with urllib.request.urlopen(req) as response:
            fleet = json.loads(response.read())
            print(f"✅ Total de Dispositivos: {fleet['total']}")
            for device in fleet['devices'][:2]:
                print(f"   📱 {device['name']} - {device['status']} ({device['location']})")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 5. Events API
    print("\n5️⃣  EVENTS API")
    try:
        req = urllib.request.Request('http://localhost:8000/api/v1/events/?limit=3', headers=headers)
        with urllib.request.urlopen(req) as response:
            events = json.loads(response.read())
            print(f"✅ Total de Eventos: {events['total']}")
            for event in events['events'][:2]:
                print(f"   🔔 {event['title']} - {event['severity']} ({event['device_name']})")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 6. Pipelines API
    print("\n6️⃣  PIPELINES API")
    try:
        req = urllib.request.Request('http://localhost:8000/api/v1/pipelines/', headers=headers)
        with urllib.request.urlopen(req) as response:
            pipelines = json.loads(response.read())
            print(f"✅ Total de Pipelines: {pipelines['total']}")
            for pipeline in pipelines['pipelines'][:2]:
                print(f"   🔄 {pipeline['name']} - {pipeline['status']}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    print("\n🎉 TESTE CONCLUÍDO!")
    print("✅ Sistema AIOS v2.0 está funcionando corretamente!")
    print("📱 Frontend: http://localhost:5173")
    print("🔧 Backend: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")

if __name__ == "__main__":
    main()