#!/usr/bin/env python3
"""
Script de teste manual para WebSocket integration

Este script conecta ao WebSocket server e simula eventos de pipeline
para testar a integração em tempo real.
"""

import asyncio
import json
import websockets
import time
from datetime import datetime

# Configurações
WEBSOCKET_URL = "ws://localhost:8000/ws"
TEST_PIPELINE_ID = "test-pipeline-123"

async def test_websocket_connection():
    """Testa conexão básica com WebSocket"""
    print("🔌 Testando conexão WebSocket...")
    
    try:
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("✅ Conexão estabelecida com sucesso!")
            
            # Enviar mensagem de teste
            test_message = {
                "type": "ping",
                "data": {"timestamp": datetime.now().isoformat()}
            }
            
            await websocket.send(json.dumps(test_message))
            print(f"📤 Mensagem enviada: {test_message}")
            
            # Aguardar resposta
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Resposta recebida: {response}")
            except asyncio.TimeoutError:
                print("⏰ Timeout - nenhuma resposta recebida em 5s")
                
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")

async def simulate_pipeline_events():
    """Simula eventos de pipeline para testar callbacks"""
    print("\n🎭 Simulando eventos de pipeline...")
    
    # Eventos de teste
    events = [
        {
            "type": "pipeline_status",
            "data": {
                "pipeline_id": TEST_PIPELINE_ID,
                "status": "starting",
                "detailed_status": {
                    "stats": {
                        "total_frames_processed": 0,
                        "frames_per_second": 0.0,
                        "average_processing_time": 0.0,
                        "total_detections": 0,
                        "errors_count": 0,
                        "uptime": 0
                    },
                    "nodes": {
                        "input_node": {"is_running": True},
                        "detection_node": {"is_running": False}
                    }
                }
            }
        },
        {
            "type": "pipeline_status",
            "data": {
                "pipeline_id": TEST_PIPELINE_ID,
                "status": "running",
                "detailed_status": {
                    "stats": {
                        "total_frames_processed": 50,
                        "frames_per_second": 25.0,
                        "average_processing_time": 40.0,
                        "total_detections": 12,
                        "errors_count": 0,
                        "uptime": 2
                    },
                    "nodes": {
                        "input_node": {"is_running": True},
                        "detection_node": {"is_running": True}
                    }
                }
            }
        },
        {
            "type": "pipeline_frame",
            "data": {
                "pipeline_id": TEST_PIPELINE_ID,
                "frame_data": {
                    "frame_id": 51,
                    "timestamp": int(time.time() * 1000),
                    "detections_count": 3,
                    "processing_time": 35.2,
                    "fps": 28.5,
                    "node_results": {
                        "detection_node": {
                            "detections": [
                                {
                                    "class": "person",
                                    "confidence": 0.95,
                                    "bbox": [100, 200, 50, 100]
                                },
                                {
                                    "class": "person", 
                                    "confidence": 0.87,
                                    "bbox": [300, 150, 60, 120]
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            "type": "pipeline_analytics",
            "data": {
                "pipeline_id": TEST_PIPELINE_ID,
                "analytics": {
                    "node_id": "people_counter",
                    "node_type": "PeopleCounterNode",
                    "people_count": 2,
                    "trend": "stable",
                    "new_crossings": 1,
                    "total_crossings": 15,
                    "results": {
                        "current_count": 2,
                        "zones": ["zone_1", "zone_2"]
                    }
                }
            }
        },
        {
            "type": "pipeline_error",
            "data": {
                "pipeline_id": TEST_PIPELINE_ID,
                "error_message": "Camera timeout - attempting reconnection",
                "severity": "medium"
            }
        }
    ]
    
    print(f"📋 {len(events)} eventos preparados para simulação")
    return events

async def monitor_websocket():
    """Monitora mensagens recebidas do WebSocket"""
    print("\n👁️  Monitorando mensagens WebSocket...")
    
    try:
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("✅ Conectado ao WebSocket - aguardando mensagens...")
            
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    
                    # Processar diferentes tipos de mensagem
                    msg_type = data.get('type', 'unknown')
                    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                    
                    if msg_type == 'pipeline_status':
                        status = data['data'].get('status', 'unknown')
                        pipeline_id = data['data'].get('pipeline_id', 'unknown')
                        print(f"📊 [{timestamp}] STATUS: {pipeline_id} -> {status}")
                        
                    elif msg_type == 'pipeline_frame':
                        pipeline_id = data['data'].get('pipeline_id', 'unknown')
                        fps = data['data']['frame_data'].get('fps', 0)
                        detections = data['data']['frame_data'].get('detections_count', 0)
                        print(f"🎬 [{timestamp}] FRAME: {pipeline_id} -> {fps:.1f}fps, {detections} detections")
                        
                    elif msg_type == 'pipeline_analytics':
                        pipeline_id = data['data'].get('pipeline_id', 'unknown')
                        count = data['data']['analytics'].get('people_count', 0)
                        print(f"📈 [{timestamp}] ANALYTICS: {pipeline_id} -> {count} people")
                        
                    elif msg_type == 'pipeline_error':
                        pipeline_id = data['data'].get('pipeline_id', 'unknown')
                        error = data['data'].get('error_message', 'unknown error')
                        print(f"❌ [{timestamp}] ERROR: {pipeline_id} -> {error}")
                        
                    else:
                        print(f"📝 [{timestamp}] OTHER: {msg_type}")
                        
                except asyncio.TimeoutError:
                    # Timeout normal - continuar monitorando
                    continue
                except websockets.exceptions.ConnectionClosed:
                    print("🔌 Conexão WebSocket fechada")
                    break
                except json.JSONDecodeError as e:
                    print(f"❌ Erro ao decodificar JSON: {e}")
                except Exception as e:
                    print(f"❌ Erro inesperado: {e}")
                    
    except Exception as e:
        print(f"❌ Erro na conexão de monitoramento: {e}")

def print_header():
    """Imprime cabeçalho do script"""
    print("=" * 60)
    print("🚀 TESTE MANUAL - WEBSOCKET INTEGRATION")
    print("=" * 60)
    print(f"URL: {WEBSOCKET_URL}")
    print(f"Pipeline ID de teste: {TEST_PIPELINE_ID}")
    print("=" * 60)

def print_menu():
    """Imprime menu de opções"""
    print("\n📋 OPÇÕES DISPONÍVEIS:")
    print("1. Testar conexão WebSocket")
    print("2. Monitorar mensagens em tempo real")
    print("3. Simular eventos de pipeline")
    print("4. Executar todos os testes")
    print("0. Sair")
    print("-" * 40)

async def main():
    """Função principal do script"""
    print_header()
    
    while True:
        print_menu()
        choice = input("Digite sua escolha: ").strip()
        
        if choice == "1":
            await test_websocket_connection()
            
        elif choice == "2":
            print("⚠️  Para parar o monitoramento, pressione Ctrl+C")
            try:
                await monitor_websocket()
            except KeyboardInterrupt:
                print("\n🛑 Monitoramento interrompido pelo usuário")
                
        elif choice == "3":
            events = await simulate_pipeline_events()
            print(f"✅ {len(events)} eventos simulados preparados")
            print("💡 Para ver os efeitos, execute o monitoramento em outra instância")
            
        elif choice == "4":
            print("🔄 Executando todos os testes...")
            await test_websocket_connection()
            await asyncio.sleep(1)
            events = await simulate_pipeline_events()
            print(f"✅ Testes completos - {len(events)} eventos preparados")
            
        elif choice == "0":
            print("👋 Saindo...")
            break
            
        else:
            print("❌ Opção inválida. Tente novamente.")
    
    print("\n🏁 Script finalizado!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Script interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro fatal: {e}")
