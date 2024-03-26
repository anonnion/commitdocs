

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const lastCommit = require('./lastCommit');
const vscode = require('vscode');

// Interface for the changelog entry
class ChangelogEntry {
  constructor(type, path, fileType, changeDate, description) {
    this.type = type;
    this.path = path;
    this.fileType = fileType;
    this.changeDate = changeDate;
    this.description = description;
  }
}

// Function to fetch version number
async function getVersion() {
  const versionUrl = 'http://127.0.0.1:8081/fmm';
  const response = 
  (await axios.get(versionUrl)) || 
  "1.12.8";
  return response.data;
}


function getCurrentWorkingDirectory()
 {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Check if there is at least one workspace folder
  if (workspaceFolders && workspaceFolders.length > 0) {
    // Use the first workspace folder as the current working directory
    const currentWorkingDirectory = workspaceFolders[0].uri.fsPath;
    return currentWorkingDirectory;
  }

  // If there are no workspace folders
  return undefined;
}


// Function to generate changelog
async function generateChangelog(docs) {
  const options = await lastCommit.getGitInfo();
  const changes = options.changedFiles;

  const version = await getVersion();

  const changelog = {
    date: new Date().toISOString(),
    version,
    docs: docs,
  };

  const jsonString = JSON.stringify(changelog);
  // console.log("jsonString: " + jsonString);
  const cwd = getCurrentWorkingDirectory();
  const dir = cwd + "/.commitdocs/" + version + "/" + options.author;
  // console.log("dir: " + dir);
  if(!cwd) {
    vscode.window.showErrorMessage("Please open a workspace to generate a commit doc");
  }
  else {
    if(!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true});
    }
    if(!fs.existsSync(dir+'/commitlog.json')) fs.writeFileSync(dir+'/commitlog.json', '');
    else fs.truncateSync(dir+'/commitlog.json');
    fs.writeFileSync(dir+'/commitlog.json', jsonString);
    return true;
  }
}

module.exports = generateChangelog