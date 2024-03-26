
const vscode = require('vscode');
const lastCommit = require('./lastCommit');
const fs = require('fs');
const app = require('./app');
const generateChangelog = require('./generateChangelog');
function showWebView(context) {
    const extensionPath = context.extensionPath;
    const panel = vscode.window.createWebviewPanel(
        'CommitDocsViewer',
        'Commit Docs UI',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(extensionPath + '/media')]
        }
    );
    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        // message = JSON.parse(message);
        // console.log(message);
        if (message.command === 'webviewData') {
          // Handle the data received from the webview
          generateChangelog(message.dataLog);

          // Example: Send a message back to the webview
          panel.webview.postMessage({
            command: 'extensionCommand',
            data: 'Done!',
            status: 'complete',
          });
        }
      },
      undefined,
      context.subscriptions
    );
    // Read and inject the HTML content
    // const htmlContent = getWebViewContent();
    lastCommit.getGitInfo().then(gitInfo => {
        // Send Git information to the webview
        if(gitInfo)
        {
          Promise.all([lastCommit.getWebviewContent(gitInfo)]).then(
            (extras) => {
              panel.webview.html = getWebViewContent(extras);
            }
          )
        }
        else {
          vscode.window.showErrorMessage("Unable to fetch repository information, please open a workspace folder and try again");
          panel.dispose();
        }
        
      });
}


function getWebViewContent(extras) {

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Commit Docs</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlightjs@9.16.2/styles/dark.css">
      <style type="text/css">
        .added {
            background-color: #135A00;
            color: #fff !important;
        }
        .deleted {
            background-color: #8c0000;
            color: #fff !important;
        }
        /*custom font*/
        @import url(https://fonts.googleapis.com/css?family=Montserrat);
        body {
          font-family: montserrat, arial, verdana;
        }
      </style>
      
      <style>
      body, html {
        height: 100%;
        margin: 0;
        overflow: hidden;
      }
  
      .container {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
  
      .upper-half {
        flex: 1;
        overflow-y: auto;
        position: relative;
      }
  
      .upper-half::before {
        content: "";
        position: fixed;
        top: 0%;
        left: 0;
        right: 0;
        height: 10%;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));
        /* pointer-events: none; */
      }
  
      .upper-half::after {
        content: "";
        position: fixed;
        top: 40%;
        left: 0;
        right: 0;
        bottom: 0;
        height: 10%;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1));
        pointer-events: none;
      }
  
      .lower-half {
        flex: 1;
        
      }
      .textarea {
        background: rgba(0,0,0,.5);
        color: #E5E5E5;
        width: 80%;
        height: 80%;
        border: 2px solid rgba(30,30,30,.7);
        box-shadow: 2px 1px 5px rgba(10,10,10,.7);
        margin: auto;
      }
      .hljs {
        background: #2f2f2fed !important;
      }
      .header {
        position: fixed;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
        padding-left: 8px;
        width: 100%;
      }
      .header span {
        float: right;

      }
      .header > span, .header > h2 {
        display: inline-block;
        width: 50%;
      }
      .changes {
        margin-top:70px;
      }
      .no-copy {
        user-select: none;
      }
      .added::before {
        content: "+";
        position: relative;
        left: 0;
        top: 0;
        user-select: none;
        pointer-events: none;
      }
      .deleted::before {
        content: "-";
        position: relative;
        left: 0;
        top: 0;
        user-select: none;
        pointer-events: none;
      }
      .CodeMirror {
        background-color: #292929 !important;
        color: #D0D0D0 !important;
      }
      .textarea::selection,  .CodeMirror-selectedtext {
        background-color: #ffcc00 !important; /* Your desired highlight color */
        color: #3A3A3A !important; /* Text color when highlighted */
      }
      details > summary {
        cursor: pointer;
      }
      .editor-toolbar {
        background: #00ffda;
      }
      .lower-half {
        opacity: 0.1;
        pointer-events: none;
      }
      .doc-status {
        display:iinline-block; 
        position: relative; 
        right:0; 
        color:yellow;
      }
    </style>


    <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">


    </head>
    <body>
    <div class="container">
    <div class="upper-half">
      <!-- Your scrollable content goes here -->
      <div id="git-info">${extras}</div>
    </div>
    <div></div>
    <div class="lower-half">
      <!-- Your content for the lower half goes here -->
      <textarea class="textarea" id="markdownTextarea"></textarea>
    </div>
  </div>
    
      <script src="https://cdn.jsdelivr.net/npm/highlightjs@9.16.2/highlight.pack.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-easing/1.3/jquery.easing.min.js"></script>
      <script src="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
      <script type="text/javascript">
        hljs.initHighlightingOnLoad();
        $(document).ready(function() { 
          document.querySelectorAll('.textarea').forEach((e)=>{
            e.contentEditable = true;
          })
        });
      </script>
      <script type="text/javascript">
        ${app.init.start()}
        
        
      </script>
      <script>
    document.querySelector('.changes').addEventListener('copy', function (event) {
      var selection = window.getSelection();
      var range = selection.getRangeAt(0);
      var clonedRange = range.cloneRange();
      
      // Create a temporary div and set its text content without the '+'
      var tempDiv = document.createElement('div');
      tempDiv.textContent = clonedRange.toString().replace(/^\+/gm, '');

      // Replace the selection with the modified text
      clonedRange.deleteContents();
      clonedRange.insertNode(tempDiv);

      // Copy the modified content to the clipboard
      event.clipboardData.setData('text/plain', tempDiv.textContent);

      // Prevent the original text from being modified
      event.preventDefault();
    });
  </script>
  <script>
    // Initialize SimpleMDE
    window.simplemde = simplemde = new SimpleMDE({
      element: document.getElementById("markdownTextarea"),
      spellChecker: false, // Optional: Disable spell checker
    });
    simplemde.codemirror.on("change", function(){
      // This function will be called whenever there's a change in the textarea
      var content = simplemde.value();
      updateCurrent(content);
    });
  </script>

    <script>
    window.docs = window.docs ? window.docs : (docs ? docs : {});
    window.els = {};
    const vscode = acquireVsCodeApi();
      function startWriting(fileId, el) {
        // fileId = fileId.replaceAll('/', '').replaceAll('.', '');
        window.currentFileId = fileId;
        window.els[fileId] = el;
        console.log({fileId, docs: window.docs, doc: window.docs[fileId]});
        window.docs[fileId] = undefined != window.docs[fileId] ? window.docs[fileId] : "";
        console.log({fileId, docs: window.docs, doc: window.docs[fileId]});
        window.simplemde.value(window.docs[fileId]);
        document.querySelector('.lower-half').style.opacity = 1;
        document.querySelector('.lower-half').style.pointerEvents = 'all';
        // console.log(fileId, window.simplemde);
      }
      function updateCurrent(content) {
        window.docs[window.currentFileId] = content;
        let el = window.els[window.currentFileId].parentElement.querySelector('.doc-status');
        if(content.trim().length > 0) {
          el.title = el.textContent = "✔️ Logged";
          el.style.color = "green";
        }
        else {
          el.title = el.textContent = "— Not Yet Logged";
          el.style.color = "yellow";
        }
        const jsonString = JSON.stringify(window.docs);
        // console.log(jsonString);
        vscode.postMessage({
          command: 'webviewData',
          dataLog: JSON.parse(jsonString)
        });
      }
  
    </script>
    </body>
    </html>
    
    `;
}

function fetchScript(path)
{
  return fs.readFileSync(path, 'utf-8').toString();
}

module.exports = {
    showWebView
};