import * as vscode from 'vscode';
import * as WebSocket from 'ws';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'g-coder.chatView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _getWs: () => WebSocket | null
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'sendPrompt':
                    {
                        const ws = this._getWs();
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'chat',
                                content: data.value
                            }));
                            // Acknowledge locally
                            this.appendMessage('user', data.value);
                        } else {
                            vscode.window.showErrorMessage('G-Coder: Ghost Server is not connected.');
                        }
                        break;
                    }
            }
        });
    }

    public appendMessage(role: 'user' | 'agent', text: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'newMessage', role, text });
        }
    }

    public clearChat() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'clear' });
        }
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>G-Coder Chat</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        box-sizing: border-box;
                        margin: 0;
                    }
                    #chat-container {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .message {
                        padding: 10px;
                        border-radius: 8px;
                        max-width: 90%;
                        word-wrap: break-word;
                        white-space: pre-wrap;
                    }
                    .user {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        align-self: flex-end;
                        border-bottom-right-radius: 0;
                    }
                    .agent {
                        background-color: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-editorWidget-border);
                        align-self: flex-start;
                        border-bottom-left-radius: 0;
                    }
                    .input-container {
                        display: flex;
                        gap: 8px;
                    }
                    #prompt-input {
                        flex: 1;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 8px;
                        border-radius: 4px;
                        font-family: var(--vscode-font-family);
                    }
                    #prompt-input:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 12px;
                        cursor: pointer;
                        border-radius: 4px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div id="chat-container">
                    <div class="message agent">Hello! I am G-Coder Ghost. Ask me anything about your codebase.</div>
                </div>
                <div class="input-container">
                    <input type="text" id="prompt-input" placeholder="Ask G-Coder..." autofocus>
                    <button id="send-btn">Send</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    const chatContainer = document.getElementById('chat-container');
                    const input = document.getElementById('prompt-input');
                    const sendBtn = document.getElementById('send-btn');

                    function appendMsg(role, text) {
                        const div = document.createElement('div');
                        div.className = 'message ' + role;
                        div.textContent = text;
                        chatContainer.appendChild(div);
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }

                    function send() {
                        const val = input.value.trim();
                        if (val) {
                            vscode.postMessage({ type: 'sendPrompt', value: val });
                            input.value = '';
                        }
                    }

                    sendBtn.addEventListener('click', send);
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') send();
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'newMessage':
                                appendMsg(message.role, message.text);
                                break;
                            case 'clear':
                                chatContainer.innerHTML = '<div class="message agent">Chat cleared.</div>';
                                break;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
