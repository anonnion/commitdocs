const vscode = require('vscode');
const showWebView = require('./webview');
const generateChangelog = require('./generateChangelog');
const lastCommit = require('./lastCommit');


function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.showLastCommit', () => {
        // Retrieve the last commit URL logic here
        console.log("Extension activated.");
        // Display the last commit URL in a WebView
        showWebView.showWebView(context);
    });
    let disposable2 = vscode.commands.registerCommand('extension.lastCommit', () => {
        lastCommit.getLastCommitUrl();
    });
    let disposable3 = vscode.commands.registerCommand('extension.generateChangelog', () => {
        generateChangelog();
    });

    context.subscriptions.push([disposable, disposable2, disposable3]);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
