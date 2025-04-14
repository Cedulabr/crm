/**
 * Classe para gerenciar a conexão WebSocket com o servidor
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private connectionPromise: Promise<WebSocket> | null = null;

  private constructor() {
    // Privado para evitar instanciação direta
  }

  /**
   * Obtém a instância única do WebSocketManager (padrão Singleton)
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Conecta ao servidor WebSocket
   */
  public async connect(): Promise<WebSocket> {
    // Se já estiver conectando, retorna a Promise existente
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Se já estiver conectado, retorna o socket existente
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log(`Conectando ao WebSocket: ${wsUrl}`);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('Conexão WebSocket estabelecida');
          this.isConnecting = false;
          resolve(this.socket!);
          
          // Limpar timer de reconexão se existir
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Mensagem WebSocket recebida:', data);
            
            // Notificar todos os ouvintes pelo tipo da mensagem
            if (data.type) {
              const listenersForType = this.listeners.get(data.type);
              if (listenersForType) {
                listenersForType.forEach(listener => {
                  try {
                    listener(data);
                  } catch (err) {
                    console.error('Erro no listener:', err);
                  }
                });
              }
            }
            
            // Notificar ouvintes para "all" (todos os tipos)
            const allListeners = this.listeners.get('all');
            if (allListeners) {
              allListeners.forEach(listener => {
                try {
                  listener(data);
                } catch (err) {
                  console.error('Erro no listener "all":', err);
                }
              });
            }
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('Erro na conexão WebSocket:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log(`Conexão WebSocket fechada: ${event.code} ${event.reason}`);
          
          // Tentar reconectar após 5 segundos
          if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              console.log('Tentando reconectar WebSocket...');
              this.connect().catch(err => console.error('Erro na reconexão:', err));
            }, 5000);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Envia uma mensagem para o servidor
   */
  public async send(data: any): Promise<void> {
    try {
      const socket = await this.connect();
      socket.send(JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao enviar mensagem WebSocket:', error);
      throw error;
    }
  }

  /**
   * Adiciona um ouvinte para mensagens de um tipo específico
   */
  public addListener(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);
    
    // Retorna uma função para remover este ouvinte
    return () => {
      const listenersForType = this.listeners.get(type);
      if (listenersForType) {
        listenersForType.delete(callback);
        if (listenersForType.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  /**
   * Inscreve-se para receber atualizações de uma tabela
   */
  public async subscribeToTable(table: string, filter?: string): Promise<() => void> {
    try {
      // Conectar se ainda não estiver conectado
      await this.connect();
      
      // Enviar mensagem de inscrição
      await this.send({
        type: 'subscribe',
        table,
        filter
      });
      
      // Retornar função para cancelar a inscrição
      return () => {
        this.send({
          type: 'unsubscribe',
          table,
          filter
        }).catch(err => console.error('Erro ao cancelar inscrição:', err));
      };
    } catch (error) {
      console.error('Erro ao inscrever-se na tabela:', error);
      return () => {}; // Função vazia em caso de erro
    }
  }

  /**
   * Fecha a conexão WebSocket
   */
  public close(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.listeners.clear();
    this.isConnecting = false;
    this.connectionPromise = null;
  }
}

// Instância do WebSocketManager para uso em toda a aplicação
export const websocketManager = WebSocketManager.getInstance();

// Hook React para integrar WebSocket com componentes React
export function createWebSocketSubscription(messageType: string) {
  const subscribe = (callback: (data: any) => void) => {
    // Garantir que o WebSocket esteja conectado
    websocketManager.connect().catch(err => console.error('Erro ao conectar WebSocket:', err));
    
    // Adicionar listener
    return websocketManager.addListener(messageType, callback);
  };
  
  return { subscribe };
}