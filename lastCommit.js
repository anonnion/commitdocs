const vscode = require('vscode');
const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');

const SimpleGit = require('simple-git/promise');

const GIT_REPO_URL = 'https://github.com/anonnion/ci'; // Replace with the actual repository URL

async function fetchCommitsAndChanges() {
  try {
    const git = SimpleGit(GIT_REPO_URL);

    const commits = await git.log();
    log('15\n', commits);
    const changedFiles = [];
    const fileChanges = [];
    
    for (const commit of commits) {
      const diff = await git.diff({ commit });
      const files = diff.split('\n').filter(line => line.startsWith('diff --git'));
      
      for (const file of files) {
        const filename = file.split(' ')[2];
        changedFiles.push(filename);
        fileChanges.push(diff.split(`diff --git a/${filename} b/${filename}`)[1]); // Extract changes for the file
      }
    }
    
    log('Changed files:', changedFiles);
    log('File changes:', fileChanges);
  } catch (error) {
    log('Error fetching commits and changes:', error);
  }
}

function log(msg1, msg2) 
{
  if(!fs.existsSync('/Users/admin/Documents/GitHub/comdoc/commitdocs/log.log')) fs.writeFileSync('/Users/admin/Documents/GitHub/comdoc/commitdocs/log.log', '\n');
  return fs.appendFileSync('/Users/admin/Documents/GitHub/comdoc/commitdocs/log.log', [msg1, msg2].join(`\n`))
}

fetchCommitsAndChanges();

/**
 * Retrieves Git information including the last commit, remote URL, changed files, and author.
 * @returns {Promise<Object|null>} Git information or null if an error occurs.
 */
async function getGitInfo() {
  try {
    const cwd = getCurrentWorkingDirectory();
    if (!cwd) {
      return vscode.window.showErrorMessage("Please open a git folder!");
    }
    process.chdir(cwd);
    const lastCommit = await simpleGit().revparse(['HEAD']);
    const remoteUrl = await simpleGit().remote(['get-url', 'origin']);
    var currentUser = await simpleGit().raw(['config', '--get', 'user.email']);
    currentUser = currentUser.split('+')[1].split('@')[0];
    const statusSummary = await simpleGit().status();
    const changedFiles = await Promise.all(statusSummary.files.map(async file => {
      const fileContent = file.status === 'D' ? '' : await getFileContentWithChanges(file.path);
      return {
        file: file.path,
        status: file.working_dir,
        fileContent,
      };
    }));
    return {
      author: currentUser,
      lastCommit,
      remoteUrl,
      changedFiles,
    };
  } catch (error) {
    console.error('Could not retrieve Git information. Error:', error);
    return null;
  }
}

/**
 * Retrieves file content with line-level changes using git show.
 * @param {string} filePath - Path of the file.
 * @returns {Promise<string>} File content with changes.
 */
async function getFileContentWithChanges(filePath) {
  const showResult = await simpleGit().show(['-U9999', 'HEAD', '--', filePath]);
  return showResult;
}

/**
 * Retrieves the current working directory of the workspace.
 * @returns {string|undefined} Current working directory or undefined if no workspace folders.
 */
function getCurrentWorkingDirectory() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }

  return undefined;
}

/**
 * Fetches the version number from a specified URL.
 * @returns {Promise<string>} Version number.
 */
async function getVersion() {
  const versionUrl = 'http://127.0.0.1:8081/fmm';
  try {
    const response = await axios.get(versionUrl);
    return response.data;
  } catch (error) {
    console.error('Could not fetch version. Using default version. Error:', error);
    return '1.12.8';
  }
}

/**
 * Retrieves commit documentation from a specified directory.
 * @returns {Promise<string|boolean>} Commit documentation or false if the directory does not exist.
 */
async function getCommitDocs() {
  const gitInfoPromise = getGitInfo();
  const versionPromise = getVersion();

  try {
    const [gitInfo, version] = await Promise.all([gitInfoPromise, versionPromise]);

    // Now you have both gitInfo and version
    const cwd = getCurrentWorkingDirectory();
    const author = gitInfo.author;
    const dir = cwd ? `${cwd}/.commitdocs/${version}/${author}` : undefined;

    if (!cwd) {
      vscode.window.showErrorMessage('Please open a workspace to generate a commit doc');
      return false;
    } else {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        return false;
      } else if (fs.existsSync(`${dir}/commitlog.json`)) {
        let file = fs.readFileSync(`${dir}/commitlog.json`, 'utf8');
        console.log("Delivering file...", { file });
        return file; // Make sure the Promise resolves to the correct value
      } else {
        let msg = "CommitDocs Error: Could not find config file!";
        vscode.window.showErrorMessage(msg);
        return false;
      }
    }
  } catch (error) {
    // Handle errors during the Promise.all
    console.error('Error in getCommitDocs:', error);
    return false;
  }
}


/**
 * Generates the webview content using Git information and commit documentation.
 * @param {Object} gitInfo - Git information.
 * @returns {string} Webview content.
 */
async function getWebviewContent(gitInfo) {
  let mdocs = await getCommitDocs();
  let docs = (JSON.parse(mdocs));
  let conScript =  `
  <script>
  let docs = JSON.parse(('${mdocs}'));
  window.docs = docs = docs.docs;
      console.log("Docs: ", window.docs);
      window.docs = window.docs.docs;
    </script>
    <div class="header">
      <h2><sup>Commit Doc by aNoNnIoN®️</sup></h2>
      <span>
        <small><a href="${gitInfo.remoteUrl}">${gitInfo.remoteUrl}</a></small>
      </span>
    </div>
    <div class="changes">
      <h2>Changes Document for commit <small><sup><a href="${gitInfo.remoteUrl.replace('.git', '')}/commit/${gitInfo.lastCommit}">${gitInfo.lastCommit}</a></sup></small></h2>
      <p>Select a file below to start writing your documentation for changes made to the file.</p>
      <ol>
        ${gitInfo.changedFiles.map(file => {
      let extension = file.file.match(/\.([^.]+)$/)[1];
      if (extension === 'DS_Store') {
        return '';
      }
      return `
            <li>
              <details>
                <summary onclick="startWriting('${file.file}', this)">
                  <strong>${file.file}</strong> <span>- ${file.status == 'M' ? 'Modified' : (file.status == 'D' ? 'Deleted' : 'Added')}
                   ${(undefined != docs?.docs && docs?.docs[file.file] && docs?.docs[file.file].length > 0) ? 
                    '<span class="doc-status" title="✔️ Logged" style="color: green;">✔️ Logged</span>'
                    : 
                    '<span class="doc-status" title="Not Yet Logged">— Not Yet Logged</span></span>' 
                  }
                </summary>
                <pre><code class="language-${extension}">${file.status === 'D' ? '' : getHighlightedFileContent(file)}</code></pre>
              </details>
            </li>
          `;
    }).join('')}
      </ol>
    </div>
  `;
    return conScript;
}

/**
 * Highlights added and deleted lines in the file content.
 * @param {Object} file - File information.
 * @returns {string} Highlighted file content.
 */
function getHighlightedFileContent(file) {
  const lines = file.fileContent.split('\n');
  const highlightedLines = lines.map(line => {
    if (line.startsWith('+++') || line.startsWith('---')) {
      return '';
    } else if (line.startsWith('+')) {
      return `<div class="added">${line.substr(1)}</div>`;
    } else if (line.startsWith('-')) {
      return `<div class="deleted">${line.substr(1)}</div>`;
    } else {
      return '';
    }
  }).filter(line => line.trim() !== '');

  return highlightedLines.join('\n');
}

// Export functions for external use
module.exports = {
  getGitInfo,
  getWebviewContent,
  getCommitDocs,
  getCurrentWorkingDirectory,
  getVersion,
};
