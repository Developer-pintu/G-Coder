import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import { ChatViewProvider } from './chatViewProvider';

let ws: WebSocket | null = null;
let statusBarItem: vscode.StatusBarItem;
let chatProvider: ChatViewProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('G-Coder Ghost is now active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'g-coder.connectGhost';
    context.subscriptions.push(statusBarItem);
    updateStatusBar('Disconnected');

    chatProvider = new ChatViewProvider(context.extensionUri, () => ws);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
    );

    let connectCmd = vscode.commands.registerCommand('g-coder.connectGhost', () => {
        connectToGhostServer();
    });

    context.subscriptions.push(connectCmd);

    // Auto-connect on startup
    connectToGhostServer();
}

function connectToGhostServer() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        vscode.window.showInformationMessage('G-Coder: Already connected to Ghost Server.');
        return;
    }

    updateStatusBar('Connecting...');
    
    // Connect to the g-coder CLI Ghost Server
    ws = new WebSocket('ws://localhost:8080');

    ws.on('open', () => {
        updateStatusBar('Connected');
        vscode.window.showInformationMessage('G-Coder Ghost Server Connected! Ready for live typing and chat.');
    });

    ws.on('message', (data) => {
        const message = data.toString();
        
        try {
            const payload = JSON.parse(message);
            if (payload.type === 'authReq') {
                // Return generic token or attempt to read local VSCode secrets
                ws?.send(JSON.stringify({ type: 'authRes', token: 'vscode_local_bridge' }));
            } else if (payload.type === 'type') {
                typeIntoEditor(payload.content);
            } else if (payload.type === 'chatResponse') {
                // Route to chat view
                if (chatProvider) chatProvider.appendMessage('agent', payload.content);
            }
        } catch (e) {
            // Handle raw strings as direct typing
            typeIntoEditor(message);
        }
    });

    ws.on('close', () => {
        updateStatusBar('Disconnected');
    });

    ws.on('error', (err) => {
        updateStatusBar('Error');
        console.error('WebSocket error:', err);
    });
}

function typeIntoEditor(text: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, text);
        });
    }
}

function updateStatusBar(status: string) {
    if (status === 'Connected') {
        statusBarItem.text = `$(radio-tower) G-Coder: Active`;
        statusBarItem.backgroundColor = undefined;
    } else if (status === 'Disconnected') {
        statusBarItem.text = `$(plug) G-Coder: Disconnected`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = `$(sync~spin) G-Coder: ${status}`;
    }
    statusBarItem.show();
}

export function deactivate() {
    if (ws) {
        ws.close();
    }
}
