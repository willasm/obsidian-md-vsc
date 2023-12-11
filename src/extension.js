const vscode = require("vscode");
const os = require('os');
const { readFile } = require('fs/promises')
const { join } = require('path');
const { getAppDataPath } = require("appdata-path");
const path = require("path");
const fs = require("fs");
const moment = require('moment');

module.exports = {
    activate,
    deactivate,
};

let myContext;
let myStatusBarItem;
let obVaultsJsonPath;
let defaultVault;
let defaultVaultPath;
let defaultNote;
let defaultNotePathFilename;
let dailyNoteFilename;
let dailyNotePathFilename;
let buttonClass;
let backlinkSeparator;
// Note: seperator regex - Just using or to match both
let separatorsRegexString = ' ?\\| ?| ?~ ?| ?• ?| ?· ?| ?° ?| ?¦ ?| ?§ ?| ?¥ ?| ?¤ ?| ?º ?| ?— ?| ?¡ ?| ?« ?| ?» ?'
let globalStoragePath;
let globalStorageFilename = "Backlinks.json";
let globalStorageFilenamePath;
let currentDocumentName;
let currentDocumentPathFilename;
let useGlobalSettings;
let BacklinkPrefix = [];
let headers = [];
let bookmarked = [];
let bookmarkedTitles = [];
let bookmarkedValid = [];
let workspaces = [];
let plugins = [];
let currentDocument;
let currentSelection;

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                            ● Function Activate ●                             │
//  │                                                                              │
//  │                      • Activate Extension Activation •                       │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function activate(context) {

  // Activate - Initialize Extension 
  //---------------------------------------------------------------------------------------------------------
  myContext = context;                    // Save context

  // Activate - Update Backlinks Data File 
  let extensionInfo =vscode.extensions.getExtension('willasm.obsidian-md-vsc');
  let extensionPackage = extensionInfo.packageJSON;
  let currentVersion = extensionPackage.version;
  if (currentVersion == '1.2.0' || currentVersion == '1.1.0' || currentVersion == '1.0.4' || currentVersion == '1.0.3' || currentVersion == '1.0.2' || currentVersion == '1.0.1' || currentVersion == '1.0.0') {
    updateOldDataFile();
  };

  // Activate - Get Default Vault & Note from Settings 
  let settings = vscode.workspace.getConfiguration("obsidian-md-vsc");
  defaultVault = settings.get("defaultVault");
  defaultVaultPath = settings.get("defaultVaultPath");
  defaultNote = settings.get("defaultNote");
  buttonClass = settings.get("buttonClass");
  backlinkSeparator = settings.get("backlinkSeparator");
  defaultNotePathFilename = path.join(defaultVaultPath, defaultNote);
  defaultNotePathFilename += '.md'
  BacklinkPrefix = settings.get("BacklinkPrefix");
  // Activate - Get OS, Possible return values are 'aix', 'darwin', 'freebsd','linux', 'openbsd', 'sunos', and 'win32' 
  osPlatform = os.platform();
  if (osPlatform === 'win32') {
    //console.log("Win32");
    obVaultsJsonPath = join(getAppDataPath()+'/obsidian/obsidian.json');
    //console.log(getAppDataPath());
    //obVaultsJsonPath = '%appdata%/obsidian/obsidian.json'
  } else if (osPlatform === 'darwin') {
    //console.log("Mac");
    obVaultsJsonPath = join(os.homedir()+'/Library/Application Support/obsidian/obsidian.json');
  } else {
    //console.log("linux");
    obVaultsJsonPath = join(os.homedir()+'/.config/obsidian/obsidian.json');
  }
//console.log(os.homedir());


  // Activate - Register Extension Commands 
  vscode.commands.registerCommand('obsidian-md-vsc.connect-with-vault', connectWithObsidian);
  context.subscriptions.push(vscode.commands.registerCommand('obsidian-md-vsc.set-defaults-global', () => {
      useGlobalSettings = true;
      setDefaultVaultNote();
      })
    )
  context.subscriptions.push(vscode.commands.registerCommand('obsidian-md-vsc.set-defaults-local', () => {
      useGlobalSettings = false;
      setDefaultVaultNote();
      })
    )
  // Activate - Push Subscriptions 
  context.subscriptions.push(connectWithObsidian);

  // Activate - Ensures the Statusbar Item Always up-to-date with Activity in Editor 
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));

  // Activate - Update VSCode Backlinks When File is Saved 
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => updateBacklinksOnSave(document)));

  // Activate - Update VSCode Backlinks When File is Deleted 
  context.subscriptions.push(vscode.workspace.onDidDeleteFiles((files) => updateBacklinksOnDelete(files)));

  // Activate - Update VSCode Backlinks When File is Renamed 
  context.subscriptions.push(vscode.workspace.onDidRenameFiles((newUriOldUriArray) => updateBacklinksOnRename(newUriOldUriArray)));

  // Activate - Create Statusbar Button 
  createStatusBarItem();
  showStatusBarItem();
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                        ● Function updateOldDataFile ●                        │
//  │                                                                              │
//  │                  • Update old version backlinks data file •                  │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateOldDataFile() {

  // updateOldDataFile - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateOldDataFile - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  let newFileJsonObject = [];
  if (fs.existsSync(globalStorageFilenamePath)) {
    let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  // No need to continue if data file contains no data
  if (fileJsonObject.length == 0 || null || undefined) {
    return;
  };

  // updateOldDataFile - Create a Backup of the Backlinks Data File 
  let backupFile = path.join(globalStoragePath, globalStorageFilename + ".BKP");
  if (!fs.existsSync(backupFile)) {
    fs.writeFileSync(backupFile, JSON.stringify(fileJsonObject));
  } else {
    // Can return here since the backup is created then the data file has already been updated
    return;
  }
  
  // updateOldDataFile - Process Data File Contains Backlinks 
  for (let i = 0; i < fileJsonObject.length; i ++) {
    let id = fileJsonObject[i].id;
    let type = fileJsonObject[i].type;
    let vscodePath = fileJsonObject[i].vscodePath;
    let obsidianPath = fileJsonObject[i].obsidianPath;
    let lineNumber = fileJsonObject[i].lineNumber;
    let newBacklinkText;
    let vscodeFile = fs.readFileSync(vscodePath,"utf-8");
    let idRegExVscode = new RegExp(`(.*?)( ?\\| ?)(File: ?)(.+?)( ?\\| ?)(ID: ?)(${id})`);
    let match = idRegExVscode.exec(vscodeFile);
    idRegExVscode.lastIndex = 0;
    if (match != null) {
      newBacklinkText = match[1];
      let backlinkTextSearch = vscodeFile.replace(idRegExVscode, `| $1$2$3$4$5$6$7 |`);
      idRegExVscode.lastIndex = 0;
      let newDataItem = {
        "id": id,
        "type": type,
        "vscodePath": vscodePath,
        "obsidianPath": obsidianPath,
        "lineNumber": lineNumber,
        "backlinkText": newBacklinkText
      };

      // updateOldDataFile - Push the Updated Json Data File Item and Update this VSCode File 
      newFileJsonObject.push(newDataItem);

      // updateOldDataFile - Write this Backlink to the Updated VSCode File 
      fs.writeFileSync(vscodePath, backlinkTextSearch);
    };
  };

  // updateOldDataFile - Write the Updated Json Data File to Extensions Global Storage Folder 
  fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(newFileJsonObject));
  vscode.window.showInformationMessage('Successfully Updated Backlinks Data File!', 'OK');

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function addBacklinkDataFile ●                       │
//  │                                                                              │
//  │                 • Add new item to the backlinks data file •                  │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function addBacklinkDataFile(id, type, vscodePath, obsidianPath, lineNumber, backlinkText) {

  // addBacklinkDataFile - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
  };

  // addBacklinkDataFile - Create New Json Data Object 
  let newBacklink = {
    id: id,
    type: type,
    vscodePath: vscodePath,
    obsidianPath: obsidianPath,
    lineNumber: lineNumber,
    backlinkText: backlinkText
  };

  // addBacklinkDataFile - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageFilenamePath)) {
    let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  };

  // addBacklinkDataFile - Add Json Data to File Buffer 
  fileJsonObject.push(newBacklink);
  
  // addBacklinkDataFile - Write the Json Data File to Extensions Global Storage Folder 
  fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(fileJsonObject));

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                     ● Function removeBacklinkDataFile ●                      │
//  │                                                                              │
//  │                 • Remove Item From the Backlinks data File •                 │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function removeBacklinkDataFile(id) {

  // removeBacklinkDataFile - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return;   // Just return if the file does not exist
  };

  // removeBacklinkDataFile - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (!fs.existsSync(globalStorageFilenamePath)) {
    return;   // Just return if the file does not exist
  };
  let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
  fileJsonObject = JSON.parse(file);

  // removeBacklinkDataFile - Remove the Requested Backlink Object by its ID 
  let updatedJsonObject = [];
  for (let i = 0; i  < fileJsonObject.length; i ++) {
    if (fileJsonObject[i].id != id) {
      updatedJsonObject.push(fileJsonObject[i]);
    };
  };

  // removeBacklinkDataFile - Write the Json Data File to Extensions Global Storage Folder 
  fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(updatedJsonObject));

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                  ● Function commandVerifyDeleteBacklinks ●                   │
//  │                                                                              │
//  │          • Validate All VSCode Backlinks and Prompt for Deletion •           │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function commandVerifyDeleteBacklinks(scope) {

  // commandVerifyDeleteBacklinks - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    vscode.window.showInformationMessage('No backlinks Data Available...','OK');
    return; // No need to continue if backlinks data does not exist
  };

  // commandVerifyDeleteBacklinks - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageFilenamePath)) {
    let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    vscode.window.showInformationMessage('No backlinks Data Available...','OK');
    // No need to continue if data file does not exist
    return;
  };
  // No need to continue if data file contains no data
  if (fileJsonObject.length == 0 || null || undefined) {
    vscode.window.showInformationMessage('No backlinks Data Available...','OK');
    return;
  };

  // commandVerifyDeleteBacklinks - Get Projects Path 
  let projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

  // commandVerifyDeleteBacklinks - Check if Data File Contains Deleted Files Backlinks 
  let projectBacklinksList = [];
  let allBacklinksList = [];
  let newBacklinkItemList = [];
  for (let i = 0; i < fileJsonObject.length; i ++) {
    let newBacklinkItem = {};
    newBacklinkItem.id = fileJsonObject[i].id;
    newBacklinkItem.type = fileJsonObject[i].type;
    newBacklinkItem.vscodePath = fileJsonObject[i].vscodePath;
    newBacklinkItem.obsidianPath = fileJsonObject[i].obsidianPath;
    newBacklinkItem.lineNumber = fileJsonObject[i].lineNumber;
    newBacklinkItem.backlinkText = fileJsonObject[i].backlinkText;
    let idRegEx = new RegExp(`ID: ?${newBacklinkItem.id}`,'gm');
    let obsidianFilename = fileJsonObject[i].obsidianPath;
    let fileObsidian;
    if (fs.existsSync(obsidianFilename)) {
      fileObsidian = fs.readFileSync(obsidianFilename,"utf-8");
      newBacklinkItem.fileObsidianValid = true;
    } else {
      fileObsidian = '';
      newBacklinkItem.fileObsidianValid = false;
    };
    let vscodeFilename = fileJsonObject[i].vscodePath;
    let fileVscode;
    if (fs.existsSync(vscodeFilename)) {
      fileVscode = fs.readFileSync(vscodeFilename,"utf-8");
      newBacklinkItem.fileVscodeValid = true;
    } else {
      fileVscode = '';
      newBacklinkItem.fileVscodeValid = false;
    };
    let isValidObdidian = idRegEx.test(fileObsidian);
    idRegEx.lastIndex = 0;
    let isValidVscode = idRegEx.test(fileVscode);
    idRegEx.lastIndex = 0;
    if (isValidObdidian) {
      if (isValidVscode) {
        newBacklinkItem.backlinkStatusVscode = true;
        newBacklinkItem.backlinkStatusObsidian = true;
        newBacklinkItem.backlinkStatusString = `'${newBacklinkItem.backlinkText}'`;
        allBacklinksList.push({label: newBacklinkItem.backlinkStatusString, description: `${newBacklinkItem.id}`});
        if (vscodeFilename.indexOf(projectPath) >= 0) {
          projectBacklinksList.push({label: newBacklinkItem.backlinkStatusString, description: `${newBacklinkItem.id}`});
        };
        newBacklinkItemList.push(newBacklinkItem);
      } else {
        newBacklinkItem.backlinkStatusObsidian = true;
        newBacklinkItem.backlinkStatusVscode = false;
        newBacklinkItem.backlinkStatus = false;
        newBacklinkItem.backlinkStatusString = `'${newBacklinkItem.backlinkText}' *** Backlink is Invalid ***`;
        allBacklinksList.push({label: newBacklinkItem.backlinkStatusString, description: `${newBacklinkItem.id}`});
        if (vscodeFilename.indexOf(projectPath) >= 0) {
          projectBacklinksList.push({label: newBacklinkItem.backlinkStatusString, description: `${newBacklinkItem.id}`});
        };
        newBacklinkItemList.push(newBacklinkItem);
      };
    } else {
      newBacklinkItem.backlinkStatusObsidian = false;
      newBacklinkItem.backlinkStatusVscode = false;
      newBacklinkItem.backlinkStatusString = `'${newBacklinkItem.backlinkText}' *** Backlink is Invalid ***`;
      allBacklinksList.push({label: newBacklinkItem.backlinkStatusString, description: `${newBacklinkItem.id}`});
      if (vscodeFilename.indexOf(projectPath) >= 0) {
        projectBacklinksList.push({label: newBacklinkItem.backlinkStatusString, description: `${newBacklinkItem.id}`});
      };
      newBacklinkItemList.push(newBacklinkItem);
    };
  };

  // commandVerifyDeleteBacklinks - Prompt User With a List of Backlinks to Delete 
  let options = {
    placeHolder: "Select any backlinks you wish to delete",
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} - Daily Note: ${dailyNoteFilename} ===---`,
    canPickMany: true
  };
  let pick;
  if (scope == 'Project') {
    if (projectBacklinksList.length == 0) {
      vscode.window.showInformationMessage('No Project Backlinks Available...','OK');
      return;
    };
    pick = await vscode.window.showQuickPick(projectBacklinksList, options);
  } else {
      pick = await vscode.window.showQuickPick(allBacklinksList, options);
  };

  // commandVerifyDeleteBacklinks - User Canceled 
  if (!pick || pick.length == 0) {
    return;
  };

  // commandVerifyDeleteBacklinks - Process Selected Picks 
  for (let idx = 0; idx < pick.length; idx ++) {
    let id = pick[idx].description
    let backlinkText = fileJsonObject[idx].backlinkText;
    let idRegExVscode = new RegExp(`(.*?)(${separatorsRegexString})(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})( ?)(${separatorsRegexString})(\\r?\\n)?`);
    let idRegExTypeLink = new RegExp(`(\\[)(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\]\\()(vscode:\\/\\/file)(.+)(:)(\\d+)(\\))(\\r?\\n)?`);
    let idRegExTypeButton = new RegExp(`(\`\`\`button\\r?\\n)(name )(.+?)(${separatorsRegexString})(File: )(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\r?\\ntype link)(\\r?\\nclass .+|)?(\\r?\\naction )(vscode:\\/\\/file\\/)(.+?)(:)(\\d+)(\\r?\\n\`\`\`)(\\r?\\n)?`);
    for (let index = 0; index < newBacklinkItemList.length; index ++) {
      if (id == newBacklinkItemList[index].id) {
        let type = newBacklinkItemList[index].type;
        let obsidianPath = newBacklinkItemList[index].obsidianPath;
        let vscodePath = newBacklinkItemList[index].vscodePath;
        let lineNumber = newBacklinkItemList[index].lineNumber;
        if (newBacklinkItemList[index].fileVscodeValid) {
          if (newBacklinkItemList[index].backlinkStatusVscode) {
            let fileVscode = fs.readFileSync(vscodePath,"utf-8");
            let matchVscode = fileVscode.replace(idRegExVscode, `$1$12`);
            fs.writeFileSync(vscodePath, matchVscode);
          };
        };
        if (newBacklinkItemList[index].fileObsidianValid) {
          if (newBacklinkItemList[index].backlinkStatusObsidian) {
            let fileObsidian = fs.readFileSync(obsidianPath,"utf-8");
            let matchObsidian;
            if (type == 'link') {
              matchObsidian = fileObsidian.replace(idRegExTypeLink, "");
            } else {
              matchObsidian = fileObsidian.replace(idRegExTypeButton, "");
            };
          fs.writeFileSync(obsidianPath, matchObsidian);
          };
        };  
        removeBacklinkDataFile(id);
      };  
    };  
  };  

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                      ● Function updateBacklinksOnSave ●                      │
//  │                                                                              │
//  │               • Update All VSCode Backlinks After File Saved •               │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateBacklinksOnSave(document) {

  // updateBacklinksOnSave - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateBacklinksOnSave - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageFilenamePath)) {
    let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  // No need to continue if data file contains no data
  if (fileJsonObject.length == 0 || null || undefined) {
    return;
  };

  // updateBacklinksOnSave - Check if Data File Contains Saved Files Backlinks 
  for (let i = 0; i < fileJsonObject.length; i ++) {
    if (document.fileName == fileJsonObject[i].vscodePath) {
      let id = fileJsonObject[i].id;
      let type = fileJsonObject[i].type;
      let oldBacklinkText = fileJsonObject[i].backlinkText;
      let vscodeFile = fs.readFileSync(document.fileName,"utf-8");
      let vscodeFileLines = vscodeFile.split('\n');
      let newLineNumber;
      let idRegExVscode = new RegExp(`(.*?)(${separatorsRegexString})(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})( ?)(${separatorsRegexString})`);
      let idRegExTypeLink = new RegExp(`(\\[)(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\]\\()(vscode:\\/\\/file)(.+)(:)(\\d+)(\\))`);
      let idRegExTypeButton = new RegExp(`(\`\`\`button\\r?\\n)(name )(.+?)(${separatorsRegexString})(File: )(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\r?\\ntype link)(\\r?\\nclass .+|)?(\\r?\\naction )(vscode:\\/\\/file\\/)(.+?)(:)(\\d+)(\\r?\\n\`\`\`)`);
      for (let idx = 0; idx < vscodeFileLines.length; idx++) {
        idRegExVscode.lastIndex = 0;
        let test = idRegExVscode.exec(vscodeFileLines[idx]);
        idRegExVscode.lastIndex = 0;
        if (test != null) {
          newLineNumber = idx;
          let oldLineNumber = fileJsonObject[i].lineNumber;
          let newBacklinkText = test[3];
          if (newLineNumber != oldLineNumber || newBacklinkText != oldBacklinkText) {
            // updateBacklinksOnSave - Save the updated data file 
            fileJsonObject[i].lineNumber = newLineNumber;
            fileJsonObject[i].backlinkText = newBacklinkText;
            fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(fileJsonObject));
            // updateBacklinksOnSave - Load and update the obsidian file then save it 
            newLineNumber++;
            let obsidianFilename = fileJsonObject[i].obsidianPath;
            // updateBacklinksOnSave - Update Obsidian File Only if it Exists 
            if (fs.existsSync(obsidianFilename)) {
              let file = fs.readFileSync(obsidianFilename,"utf-8");
              let match;
              if (type == 'link') {
                match = file.replace(idRegExTypeLink, `$1${newBacklinkText}$3$4$5$6$7$8$9$10$11$12${newLineNumber}$14`);
              } else {
                match = file.replace(idRegExTypeButton, `$1$2${newBacklinkText}$4$5$6$7$8$9$10$11$12$13$14$15${newLineNumber}$17`);
              };
              fs.writeFileSync(obsidianFilename, match);
            };
          }
        };
      };
    };
  };
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                     ● Function updateBacklinksOnDelete ●                     │
//  │                                                                              │
//  │             • Update All VSCode Backlinks After File Deletion •              │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateBacklinksOnDelete(deletedFiles) {

  // updateBacklinksOnDelete - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateBacklinksOnDelete - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageFilenamePath)) {
    let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  // No need to continue if data file contains no data
  if (fileJsonObject.length == 0 || null || undefined) {
    return;
  };

  // updateBacklinksOnDelete - Get All Deleted Files (Full Path) 
  let deletedFilesList = [];
  for (let i = 0; i < deletedFiles.files.length; i++) {
    deletedFilesList.push(deletedFiles.files[i].fsPath);
  };

  // updateBacklinksOnDelete - Check if Data File Contains Deleted Files Backlinks 
  for (let i = 0; i < fileJsonObject.length; i ++) {
    if (deletedFilesList.includes(fileJsonObject[i].vscodePath)) {
      let id = fileJsonObject[i].id;
      let idRegExTypeLink = new RegExp(`(\\[)(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\]\\()(vscode:\\/\\/file)(.+)(:)(\\d+)(\\))`);
      let idRegExTypeButton = new RegExp(`(\`\`\`button\\r?\\n)(name )(.+?)(${separatorsRegexString})(File: )(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\r?\\ntype link)(\\r?\\nclass .+|)?(\\r?\\naction )(vscode:\\/\\/file\\/)(.+?)(:)(\\d+)(\\r?\\n\`\`\`)`);
      let type = fileJsonObject[i].type;
      let match;
      let obsidianFilename = fileJsonObject[i].obsidianPath;
      // updateBacklinksOnDelete - Update Obsidian File Only if it Exists 
      if (fs.existsSync(obsidianFilename)) {
        let file = fs.readFileSync(obsidianFilename,"utf-8");
        if (type == 'link') {
          match = file.replace(idRegExTypeLink, "");
        } else {
          match = file.replace(idRegExTypeButton, "");
        };
        fs.writeFileSync(obsidianFilename, match);
      };
      removeBacklinkDataFile(id);
    };
  };
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                     ● Function updateBacklinksOnRename ●                     │
//  │                                                                              │
//  │              • Update All VSCode Backlinks After File Renamed •              │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateBacklinksOnRename(newUriOldUriArray) {

  // updateBacklinksOnRename - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateBacklinksOnRename - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageFilenamePath)) {
    let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  // No need to continue if data file contains no data
  if (fileJsonObject.length == 0 || null || undefined) {
    return;
  };

  // updateBacklinksOnRename - Get All Renamed Files Old and New Uri's (Full Path) 
  let renamedNewUriListfsPath = [];
  let renamedNewUriListPath = [];
  let renamedOldUriListfsPath = [];
  for (let i = 0; i < newUriOldUriArray.files.length; i++) {
    renamedNewUriListfsPath.push(newUriOldUriArray.files[i].newUri.fsPath);
    renamedNewUriListPath.push(newUriOldUriArray.files[i].newUri.path);
    renamedOldUriListfsPath.push(newUriOldUriArray.files[i].oldUri.fsPath);
  };

  // updateBacklinksOnRename - Check if Data File Contains Renamed Files (Full Path) 
  for (let i = 0; i < fileJsonObject.length; i ++) {
    if (renamedOldUriListfsPath.includes(fileJsonObject[i].vscodePath)) {
      // Rename Data files VSCode path
      let renamedIndex = renamedOldUriListfsPath.indexOf(fileJsonObject[i].vscodePath);
      let newRenamedUri = renamedNewUriListfsPath[renamedIndex];
      let newRenamedUriPath = renamedNewUriListPath[renamedIndex];
      let newFilename = newRenamedUri.split(path.sep).pop();
      fileJsonObject[i].vscodePath = newRenamedUri;
      // Rename Obsidian link - File: NEWNAME and file path vscode://.../FILENAME
      let id = fileJsonObject[i].id;
      let idRegExTypeLink = new RegExp(`(\\[)(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\]\\()(vscode:\\/\\/file)(.+)(:)(\\d+)(\\))`);
      let idRegExTypeButton = new RegExp(`(\`\`\`button\\r?\\n)(name )(.+?)(${separatorsRegexString})(File: )(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\r?\\ntype link)(\\r?\\nclass .+|)?(\\r?\\naction )(vscode:\\/\\/file)(.+?)(:)(\\d+)(\\r?\\n\`\`\`)`);
      let type = fileJsonObject[i].type;
      let match;
      let obsidianFilename = fileJsonObject[i].obsidianPath;
      // updateBacklinksOnRename - Update Obsidian File Only if it Exists 
      if (fs.existsSync(obsidianFilename)) {
        let file = fs.readFileSync(obsidianFilename,"utf-8");
        if (type == 'link') {
          // TODO: Need to add the whole path noy just the filename
          match = file.replace(idRegExTypeLink,`$1$2$3$4${newFilename}$6$7$8$9$10${newRenamedUriPath}$12$13$14`);
        } else {
          match = file.replace(idRegExTypeButton, `$1$2$3$4$5${newFilename}$7$8$9$10$11$12$13${newRenamedUriPath}$15$16$17`);
        };
        fs.writeFileSync(obsidianFilename, match);
      };
    };
  };

  // updateBacklinksOnRename - Write the Json Data File to Extensions Global Storage Folder 
  fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(fileJsonObject));

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function createStatusBarItem ●                       │
//  │                                                                              │
//  │                        • Create the Status Bar Item •                        │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function createStatusBarItem() {
  //only ever want one status bar item
  if (myStatusBarItem === undefined) {
    myStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1
    );
  myStatusBarItem.command = 'obsidian-md-vsc.connect-with-vault';
  }
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                        ● Function showStatusBarItem ●                        │
//  │                                                                              │
//  │                         • Show the Status Bar Item •                         │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function showStatusBarItem() {
  updateStatusBarItem();
  myStatusBarItem.show();
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function updateStatusBarItem ●                       │
//  │                                                                              │
//  │                        • Update the Status Bar Item •                        │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateStatusBarItem() {
  if (defaultVault === "" || defaultVault === undefined) {
    myStatusBarItem.text = `$(notebook) Set Default Vault/Note`;
    myStatusBarItem.tooltip = 'Configure Obsidian Defaults';
  } else {
    myStatusBarItem.text = `$(notebook) ${defaultVault} - ${defaultNote}`;
    myStatusBarItem.tooltip = `Connect to Obsidian\nVault: ${defaultVault}\nNote: ${defaultNote}`;
  }
};
  

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function setDefaultVaultNote ●                       │
//  │                                                                              │
//  │                       • Set the Default Vault & Note •                       │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function setDefaultVaultNote() {
  
  let vaultNames = [];                                        // Vault Names Array

  // setDefaulVaultNote - Get Obsidian.json Data 
  let vaultDataFile = await readFile(obVaultsJsonPath);       // Read file into memory
  let vaultDataObj = JSON.parse(vaultDataFile.toString());    // Parse json

  // setDefaulVaultNote - Cacheing Map 
  var objMap = new Map(Object.entries(vaultDataObj.vaults));

  // setDefaulVaultNote - Get Vault Selection from User 
  let quickpick = vscode.window.createQuickPick();
  quickpick.title = "--== Select your default vault ==--";
  quickpick.placeholder = "Choose from these available vaults";
  quickpick.matchOnDescription = true;
  objMap.forEach((item, key) => {
    let vaultPath = item.path;
    let vaultName = vaultPath.split(path.sep).pop();
    if (item.open === true) {
      vaultNames.push({label: vaultName, path: vaultPath, description: "Currently open or last opened vault"});
    } else {
      vaultNames.push({label: vaultName, path: vaultPath});
    }
  });
  quickpick.items = vaultNames;

  // setDefaulVaultNote - Get Vault Selection from User 
  quickpick.onDidAccept(async () => {
    // setDefaulVaultNote - Get Default Obsidian Note From Selected Vault Folder 
    const dirVault = vscode.Uri.file(path.join(quickpick.selectedItems[0].path))
    let vaultPath = dirVault.path;
    let fsPathVault = dirVault.fsPath;
    const options = OpenDialogOptions = {
      title: `Select default note from Obsidian vault - ${quickpick.selectedItems[0].path}`,
      defaultUri: dirVault,
      canSelectMany: false,
      canSelectFolders: false,
      canSelectFiles: true,
      filters: { Markdown: ['md']},
      openLabel: "Select Default Note"
    };
    let noteUri = await vscode.window.showOpenDialog(options);
    if (noteUri == undefined) {
      quickpick.hide();
      return;
    };
    let notePath = noteUri[0].path;
    if (!notePath.includes(vaultPath)) {
      let message = `Default note selected is outside of the vault '${quickpick.selectedItems[0].label}' Please try again.`;
      vscode.window.showErrorMessage(message, 'OK');
      return;
    };
    // setDefaulVaultNote - Save the Selected Default Vault & Note to Settings 
    if (noteUri && noteUri[0]) {
      let noteNameObj = noteUri[0].fsPath.split(fsPathVault);
      let noteNameFull = noteNameObj[1];
      let noteName = noteNameFull.replace(/^\/+|\\+/, "");
      noteName = noteName.substring(0, noteName.lastIndexOf('.'));
      let settings = vscode.workspace.getConfiguration("obsidian-md-vsc");
      if (useGlobalSettings) {
        settings.update("defaultVault",quickpick.selectedItems[0].label,1);
        settings.update("defaultVaultPath",quickpick.selectedItems[0].path,1);
        settings.update("defaultNote",noteName,1);
      } else {
        settings.update("defaultVault",quickpick.selectedItems[0].label,0);
        settings.update("defaultVaultPath",quickpick.selectedItems[0].path,0);
        settings.update("defaultNote",noteName,0);
      }
      defaultVault = quickpick.selectedItems[0].label;
      defaultVaultPath = quickpick.selectedItems[0].path;
      defaultNote = noteName;
      updateStatusBarItem();
    }
  quickpick.hide();
  }),
  
  // setDefaulVaultNote - Show the Quickpick 
  quickpick.show();

};

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function connectWithObsidian ●                       │
//  │                                                                              │
//  │                 • Prompt for Commands to send to Obsidian •                  │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function connectWithObsidian() {

  // connectWithObsidian - Set Default Vault & Note if Required 
  if (defaultVault === "" || defaultVault === undefined) {
    // connectWithObsidian - true - Save to Global Settings, false - Save to Workspace Settings 
    useGlobalSettings = true;
    setDefaultVaultNote();
    return;
  }

  // connectWithObsidian - Initialize Variables 
  headers = [];   // Need to Clear any Previous Data
  bookmarked = [];
  bookmarkedTitles = [];
  bookmarkedValid = [];
  workspaces = [];
  plugins = [];
  headersDaily = [];
  currentDocument = "";
  currentDocumentName = "";
  currentDocumentPathFilename = "";
  currentSelection = "";
  dailyNoteFilename = "";
  dailyNotePathFilename = "";
  let settings = vscode.workspace.getConfiguration("obsidian-md-vsc");
  buttonClass = settings.get("buttonClass");
  backlinkSeparator = settings.get("backlinkSeparator");
  defaultVault = settings.get("defaultVault");
  defaultVaultPath = settings.get("defaultVaultPath");
  defaultNote = settings.get("defaultNote");
  defaultNotePathFilename = path.join(defaultVaultPath, defaultNote);
  defaultNotePathFilename += '.md'
  let pathToNote = path.join(defaultVaultPath, defaultNote+".md");
  if (!fs.existsSync(pathToNote)) {
    let message = `Default note '${defaultNote}' was not found. Set Default Vault and Note Now?`;
    let choice = await vscode.window.showErrorMessage(message,'Set Now', 'Cancel');
    if (choice === 'Set Now') {
      useGlobalSettings = true;
      await setDefaultVaultNote();
    };
    return;
  };
  let pathToBookmarks = path.join(defaultVaultPath, ".obsidian", "bookmarks.json");
  let pathToWorkspaces = path.join(defaultVaultPath, ".obsidian", "workspaces.json");
  let pathToPlugins = path.join(defaultVaultPath, ".obsidian", "community-plugins.json");
  let pathToDailyJson = path.join(defaultVaultPath, ".obsidian", "daily-notes.json");
  let editor = vscode.window.activeTextEditor;    // Copy Current Document and Current Selection Into Buffers
  if (editor) {
    let selection = editor.selection;
    currentSelection = editor.document.getText(selection);
    let document = editor.document;
    currentDocumentPathFilename = document.fileName;
    currentDocumentName = document.fileName.split(/[/\\]+/).pop();
    currentDocument = document.getText();
  }
  // connectWithObsidian - Assign Date/Time Variables 
  // See https://momentjs.com/docs/#/displaying/format/
  //
  // Year
  let Y = moment().format('Y');
  let YY = moment().format('YY');
  let YYYY = moment().format('YYYY');
  // Month
  let M = moment().format('M');
  let Mo = moment().format('Mo');
  let MM = moment().format('MM');
  let MMM = moment().format('MMM');
  let MMMM = moment().format('MMMM');
  // Day of Month
  let D = moment().format('D');
  let Do = moment().format('Do');
  let DD = moment().format('DD');
  // Day of Year
  let DDD = moment().format('DDD');
  let DDDo = moment().format('DDDo');
  let DDDD = moment().format('DDDD');
  // Day of Week
  let d = moment().format('d');
  let doo = moment().format('do'); // do variable name not allowed, is keyword
  let dd = moment().format('dd');
  let ddd = moment().format('ddd');
  let dddd = moment().format('dddd');
  // Day of Week (Locale)
  let e = moment().format('e');
  // Day of Week (ISO)
  let E = moment().format('E');
  // Quarter
  let Q = moment().format('Q');
  let Qo = moment().format('Qo');
  // Week of Year
  let w = moment().format('w');
  let wo = moment().format('wo');
  let ww = moment().format('ww');
  // Week of Year (ISO)
  let W = moment().format('W');
  let Wo = moment().format('Wo');
  let WW = moment().format('WW');
  // ** Time **
  // AM/PM
  let A = moment().format('A');
  let a = moment().format('a');
  // Hour
  let HH = moment().format('HH');
  let H = moment().format('H');
  let h = moment().format('h');
  let hh = moment().format('hh');
  let k = moment().format('k');
  let kk = moment().format('kk');
  // Minute
  let m = moment().format('m');
  let mm = moment().format('mm');
  // Second
  let s = moment().format('s');
  let ss = moment().format('ss');
  // Time Zone
  let Z = moment().format('Z');
  let ZZ = moment().format('ZZ');
  // var today = new Date();
  // var dd = String(today.getDate()).padStart(2, '0');
  // var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  // var yyyy = today.getFullYear();

  // connectWithObsidian - Get Headers From Default Note 
  fs.readFile(pathToNote, 'utf-8', (err, data) => {
    if (err) {
      console.log('Warning: Unable to Load Default Note Headers (Has default note been set in settings.json?)');
      throw err;
    }
    let headerRegEx = /^#{1,6} +(.*)/gm
    while (headerMatch = headerRegEx.exec(data)) {
      headers.push({label: headerMatch[1]});
    }
  });

  // connectWithObsidian - Get Bookmarked Notes From Default Vault 
  fs.readFile(pathToBookmarks, 'utf-8', (err, data) => {
    if (err) {
      console.log('Warning: Unable to Load Bookmarked Notes List (Have any notes been Bookmarked yet?)');
      throw err;
    };
    const bookmarkedData = JSON.parse(data);
    for (let i = 0; i < bookmarkedData.items.length; i++) {
      // TODO Check for other types here???
      if (bookmarkedData.items[i].type == 'file') {
        let cleanTitle = bookmarkedData.items[i].path.split(/[/\\]+/).pop();
        bookmarked.push({title: bookmarkedData.items[i].title || cleanTitle, path: bookmarkedData.items[i].path, subpath: bookmarkedData.items[i].subpath || '', ctime: bookmarkedData.items[i].ctime});
      };
    };
  });

  // connectWithObsidian - Get Workspaces From Default Vault 
  fs.readFile(pathToWorkspaces, 'utf-8', (err, data) => {
    if (err) {
      console.log('Warning: Unable to Load Workspaces List (Have any workspaces been created yet?)');
      throw err;
    }
    const workspaceData = JSON.parse(data);
    workspaces.push(Object.keys(workspaceData.workspaces));
    workspaces = workspaces[0];
  });

  // connectWithObsidian - Get Plugins From Default Vault 
  fs.readFile(pathToPlugins, 'utf-8', (err, data) => {
    if (err) {
      console.log('Warning: Unable to Load Plugins List (Have any plugins been installed yet?)');
      throw err;
    }
    plugins = data;
  });

  // connectWithObsidian - Get Headers From Daily Note 
  fs.readFile(pathToDailyJson, 'utf-8', (err, data) => {
    if (err) {
      console.log("Warning: Unable to Load 'daily-notes.json' (Have daily notes core plugin been enabled yet?)");
      throw err
    }
    const dailyData = JSON.parse(data);
    let dailyName = dailyData.format;
    // ** Dates **
    // Year
    dailyName = dailyName.replace('YYYY', YYYY);
    dailyName = dailyName.replace('YY', YY);
    dailyName = dailyName.replace('Y', Y);
    // Month
    dailyName = dailyName.replace('MMMM', MMMM);
    dailyName = dailyName.replace('MMM', MMM);
    dailyName = dailyName.replace('MM', MM);
    dailyName = dailyName.replace('Mo', Mo);
    dailyName = dailyName.replace('M', M);
    // Day of Month
    dailyName = dailyName.replace('DD', DD);
    dailyName = dailyName.replace('Do', Do);
    dailyName = dailyName.replace('D', D);
    // Day of Year
    dailyName = dailyName.replace('DDDD', DDDD);
    dailyName = dailyName.replace('DDDo', DDDo);
    dailyName = dailyName.replace('DDD', DDD);
    // Day of Week
    dailyName = dailyName.replace('dddd', dddd);
    dailyName = dailyName.replace('ddd', ddd);
    dailyName = dailyName.replace('dd', dd);
    dailyName = dailyName.replace('do', doo);
    dailyName = dailyName.replace('d', d);
    // Day of Week (Locale)
    dailyName = dailyName.replace('e', e);
    // Day of Week (ISO)
    dailyName = dailyName.replace('E', E);
    // Quarter
    dailyName = dailyName.replace('Qo', Qo);
    dailyName = dailyName.replace('Q', Q);
    // Week of Year
    dailyName = dailyName.replace('wo', wo);
    dailyName = dailyName.replace('ww', ww);
    dailyName = dailyName.replace('w', w);
    // Week of Year (ISO)
    dailyName = dailyName.replace('Wo', Wo);
    dailyName = dailyName.replace('WW', WW);
    dailyName = dailyName.replace('W', W);
    // ** Time **
    // AM/PM
    dailyName = dailyName.replace('A', A);
    dailyName = dailyName.replace('a', a);
    // Hour
    dailyName = dailyName.replace('H', H);
    dailyName = dailyName.replace('HH', HH);
    dailyName = dailyName.replace('hh', hh);
    dailyName = dailyName.replace('h', h);
    dailyName = dailyName.replace('kk', kk);
    dailyName = dailyName.replace('k', k);
    // Minute
    dailyName = dailyName.replace('mm', mm);
    dailyName = dailyName.replace('m', m);
    // Second
    dailyName = dailyName.replace('ss', ss);
    dailyName = dailyName.replace('s', s);
    // Time Zone
    dailyName = dailyName.replace('ZZ', ZZ);
    dailyName = dailyName.replace('Z', Z);
    dailyNoteFilename = dailyName
    dailyNotePathFilename = path.join(defaultVaultPath, dailyData.folder, dailyName+'.md');
    fs.readFile(dailyNotePathFilename, 'utf-8', (err, data) => {
      if (err) {
        console.log('Warning: Unable to Load Todays Daily Note (Has it been created yet?)');
        throw err
      }
      let headerRegEx = /^#{1,6} +(.*)/gm
      while (headerMatch = headerRegEx.exec(data)) {
        headersDaily.push({label: headerMatch[1]});
      }
    })
  });

  // connectWithObsidian - Prompt User with Root Choices 
  let options = {
    placeHolder: "How would you like to connect to Obsidian?",
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
  };
  let rootLabels = [{label: 'Open in Obsidian...'},{label: 'Create New...'},{label: 'Daily Note...'},{label: `Send to default note: '${defaultNote}'...`},{label: `Open default note: '${defaultNote}' in VSCode`},{label: `Open vault: '${defaultVault}' in VSCode`},{label: `Verify/Delete Backlinks (Project)`},{label: `Verify/Delete Backlinks (Global)`}];
  const pick = await vscode.window.showQuickPick(rootLabels, options);

  // connectWithObsidian - User Canceled 
  if (!pick) {
    return;
  }
  if (pick.label === 'Open in Obsidian...') {
    commandOpen();
    return;
  } else if (pick.label === 'Create New...') {
    commandCreate();
    return;
  } else if (pick.label === 'Daily Note...') {
    commandDaily();
    return;
  } else if (pick.label === `Send to default note: '${defaultNote}'...`) {
    commandSendto();
    return;
  } else if (pick.label === `Open default note: '${defaultNote}' in VSCode`) {
    // connectWithObsidian - Open note: ${defaultNote} in VSCode 
    obURI = `vscode://file/${pathToNote}`;
    vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    return;
  } else if (pick.label === `Open default note: '${defaultNote}' in VSCode`) {
    // connectWithObsidian - Open vault: '${defaultVault}' in VSCode 
    obURI = `vscode://file/${defaultVaultPath}`;
    vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    return;
  } else if (pick.label === `Verify/Delete Backlinks (Project)`) {
    // connectWithObsidian - Verify/Delete Backlinks (Project) 
    commandVerifyDeleteBacklinks('Project');
    return;
  } else {
    // connectWithObsidian - Verify/Delete Backlinks (Global) 
    commandVerifyDeleteBacklinks('Global');
    return;
  }
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                           ● Function commandOpen ●                           │
//  │                                                                              │
//  │                          • Execute Open Commands •                           │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function commandOpen() {

  let openPicks = [];
  let pick;

  // commandOpen - Prompt User with Open Choices 
  openPicks.push({label: 'Open Obsidian'});
  openPicks.push({label: `Open default note '${defaultNote}'`});
  if (headers.length > 0) {
    openPicks.push({label: `Open to header in default note: '${defaultNote}'`});
  }
  if (bookmarked.length > 0) {
    openPicks.push({label: `Open default vault: '${defaultVault}' bookmarked note...`});
  }
  if (workspaces.length > 0) {
    openPicks.push({label: 'Open workspace...'});
  }
  
  let options = {
    placeHolder: "How would you like to open Obsidian?",
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
  };
  pick = await vscode.window.showQuickPick(openPicks, options);

  // commandOpen - User Canceled 
  if (!pick) {
    return;
  }

  // commandOpen - Execute Commands 
  let command = pick.label
  let obURI;
  switch (command) {
    // commandOpen - Open Obsidian 
    case 'Open Obsidian':
      obURI = `obsidian://advanced-uri?vault=${defaultVault}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;

    // commandOpen - Default Note 
    case `Open default note '${defaultNote}'`:
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;

    // commandOpen - Open to Header 
    case `Open to header in default note: '${defaultNote}'`:
      options = {
        placeHolder: "Select header to open in Obsidian",
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
      };
      pick = await vscode.window.showQuickPick(headers, options);
      // commandOpen - User Canceled 
      if (!pick) {
        break;
      }
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${pick.label}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;

    // commandOpen - Bookmarked Note 
    case `Open default vault: '${defaultVault}' bookmarked note...`:
      options = {
        placeHolder: "Select bookmarked note to open in Obsidian",
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
      };
      for (let i = 0; i < bookmarked.length; i++) {
        let newTitle = bookmarked[i].path.split(/[/\\]+/).pop();
        if (bookmarked[i].subpath.length > 0 ) {
          charIndex = bookmarked[i].subpath.charAt(1);
          // TODO: Add checks for other types
          if (charIndex == '^') {
            newTitle += ' [Block - '+bookmarked[i].subpath.substring(2, 8)+']'
          } else if (charIndex == '[') {
            newTitle += ' [Link - '+bookmarked[i].subpath.substring(bookmarked[i].subpath.indexOf("[") + 1, bookmarked[i].subpath.lastIndexOf("]"))+']'
          } else {
            newTitle += ' [Heading - '+bookmarked[i].subpath.substring(1)+']'
          };
        };
        let bookmarkFullPath = path.join(defaultVaultPath, bookmarked[i].path);
        if (fs.existsSync(bookmarkFullPath)) {
          if (bookmarked[i].title != "") {
            bookmarkedTitles.push(bookmarked[i].title);
          } else {
            bookmarkedTitles.push(newTitle);
          }
          bookmarkedValid.push(bookmarked[i]);
        };
      };
      pick = await vscode.window.showQuickPick(bookmarkedTitles, options);
      // commandOpen - User Canceled 
      if (!pick) {
        break;
      };
      for (let i = 0; i < bookmarked.length; i++) {
        if (pick == bookmarkedTitles[i]) {
          obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${bookmarkedValid[i].path+bookmarkedValid[i].subpath}`
          vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          break;
        };
      };
      break;

    // commandOpen - Workspace 
    case 'Open workspace...':
      options = {
        placeHolder: "Select workspace to open in Obsidian",
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
      };
      pick = await vscode.window.showQuickPick(workspaces, options);
      // commandOpen - User Canceled 
      if (!pick) {
        break;
      }
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&workspace=${pick}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;
      
  }
};
      

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                          ● Function commandCreate ●                          │
//  │                                                                              │
//  │                          • Execute Create Commands •                         │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function commandCreate() {

  let openPicks = [];
  let pick;
  let newName = "";
  let newClipName = "";

  // commandCreate - Prompt User with Open Choices 
  openPicks.push({label: 'Create new note'});
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    openPicks.push({label: 'Create new note from from current file or selection'});
  }

  let options = {
    placeHolder: "What would you like to create in Obsidian?",
    title: `---=== Vault: ${defaultVault} ===---`
  };
  pick = await vscode.window.showQuickPick(openPicks, options);

  // commandCreate - User Canceled 
  if (!pick) {
    return;
  }

  // commandCreate - Execute Commands 
  let command = pick.label
  let obURI;
  switch (command) {
    // commandCreate - Create new note 
    case 'Create new note':
      options = {
        placeHolder: "Enter new note name",
        prompt: "Relative paths accepted Eg. templates/NewNote",
        title: `---=== Vault: ${defaultVault} ===---`
      };
      newName = await vscode.window.showInputBox(options);
      if (newName != undefined) { 
        obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${newName}&mode=new`
        vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      }
      break;
    
    // commandCreate - Create new note from selected text or entire document 
    case 'Create new note from from current file or selection':
      options = {
        placeHolder: "Enter new note name",
        prompt: "Relative paths accepted Eg. templates/NewNote",
        title: `---=== Vault: ${defaultVault} ===---`
      };
      newClipName = await vscode.window.showInputBox(options);
      if (newClipName != undefined) { 
        if (currentSelection != "") {
          vscode.env.clipboard.writeText(currentSelection);
        } else {
          vscode.env.clipboard.writeText(currentDocument);
        }
      } else {
        break;
      }
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${newClipName}&clipboard=true&mode=new`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;
  }
};
  

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                          ● Function commandDaily ●                           │
//  │                                                                              │
//  │                       • Execute Daily Note Commands •                        │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function commandDaily() {

  let openPicks = [];
  let dailyPrependAppendCommands = [];
  let taskChoices = ['[ ] Unchecked', '[x] Checked/Completed', '[?] Need more info/Question', '[!] Important', '[<] Scheduled/In progress', '[>] Rescheduled/Deferred', '[+] Task group', '[-] Cancelled/Non-task', '[*] Star', '[n] Note', '[l] Location', '[i] Information', '[I] Idea', '[S] Amount/Savings', '[p] Pro', '[c] Con', '[b] Bookmark', '[f] Fire', '[k] Key', '[w] Win', '[u] Up', '[d] Down'];
  let calloutChoices = ["Abstract", "Attention", "Bug", "Caution", "Check", "Cite", "Danger", "Done", "Error", "Example", "Fail", "Failure", "FAQ", "Help", "Hint", "Important", "Info", "Missing","Note", "Question", "Quote", "Success", "Summary", "Tip", "TLDR", "Todo", "Warning"];
  let pick;
  let lineNumber = "";
  let columnNumber = "";
  let linkTitle = "";
  let buttonTitle = "";
  let docPath = "";
  let vscodeUri = "";

  // commandDaily - Initialize VSCode Backlinks 
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
      lineNumber = activeEditor.selection.active.line+1;
      columnNumber = activeEditor.selection.active.character+1;
      docPath = vscode.window.activeTextEditor.document.uri.path
      vscodeUri = `vscode://file${docPath}:${lineNumber}`
  }


  // commandDaily - Prompt User with Daily Choices 
  openPicks.push({label: `Create/Open daily note: ${dailyNoteFilename}`});
  if (headersDaily.length > 0) {
    openPicks.push({label: `Open to header in daily note: ${dailyNoteFilename}`});
    openPicks.push({label: 'Prepend to header...'});
    openPicks.push({label: 'Append to header...'});
  }

  // commandDaily - Prompt User with Daily Note Command Choices 
  dailyPrependAppendCommands.push('Insert text', );
  if (currentSelection != "") {
    dailyPrependAppendCommands.push('Insert selected text');
    dailyPrependAppendCommands.push('Insert selected text as inline code block');
    dailyPrependAppendCommands.push('Insert selected text as fenced code block');
  }
  dailyPrependAppendCommands.push('Insert Comment');
  dailyPrependAppendCommands.push('Insert Unnumbered list item');
  dailyPrependAppendCommands.push('Insert Numbered list item');
  dailyPrependAppendCommands.push('Insert Blockquote');
  dailyPrependAppendCommands.push('Insert task');
  dailyPrependAppendCommands.push('Insert Callout');
  if (lineNumber != "") {
    dailyPrependAppendCommands.push('Insert VSCode backlink');
    if (plugins.includes("buttons")) {
      dailyPrependAppendCommands.push('Insert VSCode backlink button');
    }
  };

  let options = {
    placeHolder: `Open Daily Note: ${dailyNoteFilename} in Obsidian`,
    title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
  };
  pick = await vscode.window.showQuickPick(openPicks, options);

  // commandDaily - User Canceled 
  if (!pick) {
    return;
  }

  // commandDaily - Execute Commands 
  let command = pick.label
  let obURI;
  switch (command) {
    // commandDaily - Create new daily note 
    case `Create/Open daily note: ${dailyNoteFilename}`:
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;
    // commandDaily - Open to header in daily note 
    case `Open to header in daily note: ${dailyNoteFilename}`:
      options = {
        placeHolder: "Select daily note header to open in Obsidian",
        title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
      };
      pick = await vscode.window.showQuickPick(headersDaily, options);
      // commandDaily - User Canceled 
      if (!pick) {
        break;
      }
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${pick.label}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;

    // commandDaily - Prepend & Append to daily note header 
    case 'Prepend to header...':
    case 'Append to header...':
      options = {
        placeHolder: "Select daily note header to insert item to",
        title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
      };
      let headerPick = await vscode.window.showQuickPick(headersDaily, options);
      // commandDaily - User Canceled 
      if (!headerPick) {
        break;
      }
      options = {
        placeHolder: `Select item to insert in daily note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
        title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
      };
      let dailyCommandPick = await vscode.window.showQuickPick(dailyPrependAppendCommands, options);
      // commandDaily - User Canceled 
      if (!dailyCommandPick) {
        break;
      }
      let command = dailyCommandPick
      switch (command) {
        // commandDaily - Insert text to daily note header 
        case 'Insert text':
          options = {
            placeHolder: `Enter text to insert in daily note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
            prompt: "Eg. # Heading 1",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newText = await vscode.window.showInputBox(options);
          if (newText != undefined) { 
            if (newText != "") {
              vscode.env.clipboard.writeText(newText);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
            break;
          }

        // commandDaily - Insert Selected Text to Daily note header 
        case 'Insert selected text':
          vscode.env.clipboard.writeText(currentSelection);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          break;

      // commandDaily - Insert Selected Text Inline Code Block to Daily note header 
      case 'Insert selected text as inline code block':
        let inlineCodeBlock = '`'+currentSelection+'`'
        vscode.env.clipboard.writeText(inlineCodeBlock);
          if (pick.label == 'Prepend to header...') {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          } else {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          }
        break;

      // commandDaily - Insert Selected Text Fenced Code Block to note ${defaultNote} header 
      case 'Insert selected text as fenced code block':
        options = {
          placeHolder: `Enter optional fenced code block language`,
          prompt: "Eg. 'js' for javascript, just hit enter for none",
          title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
        };
        let codeLanguage = await vscode.window.showInputBox(options);
        if (codeLanguage != undefined) { 
          let fencedCodeBlock = '\n```'+codeLanguage+'\n'+currentSelection+'\n```'
          vscode.env.clipboard.writeText(fencedCodeBlock);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
        }
        break;

        // commandDaily - Insert Comment to daily note header 
        case 'Insert Comment':
          options = {
            placeHolder: `Enter comment text to insert in daily note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
            prompt: "Eg. TODO Something",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newComment = await vscode.window.showInputBox(options);
          if (newComment != undefined) { 
            if (newComment != "") {
              newComment = '%% '+newComment+' %%'
              vscode.env.clipboard.writeText(newComment);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;

        // commandDaily - Insert Unnumbered list item to daily note header 
        case 'Insert Unnumbered list item':
          options = {
            placeHolder: `Enter list item text to insert in daily note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
            prompt: "The - is not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newUnnumList = await vscode.window.showInputBox(options);
          if (newUnnumList != undefined) { 
            if (newUnnumList != "") {
              newUnnumList = '- '+newUnnumList
              vscode.env.clipboard.writeText(newUnnumList);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
        
        // commandDaily - Insert Numbered list item to daily note header 
        case 'Insert Numbered list item':
          options = {
            placeHolder: `Enter list item text to insert in daily note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
            prompt: "The number is not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newNumList = await vscode.window.showInputBox(options);
          if (newNumList != undefined) { 
            if (newNumList != "") {
              newNumList = '1. '+newNumList
              vscode.env.clipboard.writeText(newNumList);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
                
        // commandDaily - Insert Blockquote to daily note header 
        case 'Insert Blockquote':
          options = {
            placeHolder: `Enter blockquote item text to insert in daily note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
            prompt: "The > symbol is not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newBlockQuote = await vscode.window.showInputBox(options);
          if (newBlockQuote != undefined) { 
            if (newBlockQuote != "") {
              newBlockQuote = '\n> '+newBlockQuote
              vscode.env.clipboard.writeText(newBlockQuote);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
        
        // commandDaily - Insert task to daily note header 
        case 'Insert task':
          options = {
            placeHolder: `Select task type to insert`,
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let taskPick = await vscode.window.showQuickPick(taskChoices, options);
          // commandDaily - User Canceled 
          if (!taskPick) {
            break;
          }
          taskPick = taskPick.slice(0, 3);
          options = {
            placeHolder: `Enter task item text to insert in Daily Note: '${dailyNoteFilename}', under header: '${headerPick.label}'`,
            prompt: "The '- [ ]' symbols are not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let taskText = await vscode.window.showInputBox(options);
          if (taskText != undefined) { 
            if (taskText != "") {
              let taskDef = `- ${taskPick} ${taskText}`
              vscode.env.clipboard.writeText(taskDef);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;

        // commandDaily - Insert Callout to daily note header 
        case 'Insert Callout':
          options = {
            placeHolder: `Select callout type to insert`,
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let calloutPick = await vscode.window.showQuickPick(calloutChoices, options);
          // commandDaily - User Canceled 
          if (!calloutPick) {
            break;
          }
          options = {
            placeHolder: `Select folding option`,
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let foldingPick = await vscode.window.showQuickPick(['None', 'Default Expanded', 'Default Collapsed'], options);
          // commandDaily - User Canceled 
          if (!foldingPick) {
            break;
          }
          let foldingOption = '';
          if (foldingPick == 'Default Expanded') {
            foldingOption = '+';
          }
          if (foldingPick == 'Default Collapsed') {
            foldingOption = '-';
          }
          options = {
            placeHolder: `Enter optional callout item title text`,
            prompt: "The optional title text for the callout, leave blank for default.",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let calloutTitle = await vscode.window.showInputBox(options);
          if (calloutTitle != undefined) { 
            calloutTitle = ' '+calloutTitle;
            options = {
              placeHolder: `Enter optional callout item content text`,
              prompt: "The optional content text for the callout, leave blank for no content.",
              title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
            };
            let calloutContent = await vscode.window.showInputBox(options);
            if (calloutContent != undefined) { 
              let calloutDef = '\n> [!'+calloutPick+']'+foldingOption+calloutTitle+'\n'
              if (calloutContent != '') {
                calloutDef = calloutDef+'> '+calloutContent+'\n';
              }
              calloutDef = calloutDef+'\n'; // Ensures a blank line below callout
              vscode.env.clipboard.writeText(calloutDef);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
          
        // commandDaily - Insert VSCode backlink to daily note header 
        case 'Insert VSCode backlink':
          if (lineNumber != "") {
            options = {
              placeHolder: `Select Backlink prefix, Esc for none`,
              title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
            };
            let backlinkTypePick = "";
            backlinkTypePick = await vscode.window.showQuickPick(BacklinkPrefix, options);
            // commandSendto - User Canceled 
            if (!backlinkTypePick) {
              backlinkTypePick = "";
            }
            options = {
              value: `${linkTitle}`,
              prompt: "Enter descriptive text to display in the backlink",
              title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
            };
            let unixTimestamp = Math.round(+new Date()/1000);
            let linkText = await vscode.window.showInputBox(options);
            if (linkText != undefined) { 
              if (linkText != "") {
                let linkDef = `\n[${backlinkTypePick} ${linkText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${unixTimestamp}](${vscodeUri})`
                vscode.env.clipboard.writeText(linkDef);
                if (pick.label == 'Prepend to header...') {
                  obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                  vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
                } else {
                  obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                  vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
                }
                const editor = vscode.window.activeTextEditor;
                await editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(lineNumber-1, columnNumber-1, lineNumber-1, columnNumber-1), `${backlinkSeparator} ${backlinkTypePick} ${linkText} ${backlinkSeparator} File: ${dailyNoteFilename} ${backlinkSeparator} ID: ${unixTimestamp} ${backlinkSeparator}`);
                }).catch(err => console.log(err));
                let backlinkText = `${backlinkTypePick} ${linkText}`;
                addBacklinkDataFile(unixTimestamp, "link", currentDocumentPathFilename, dailyNotePathFilename, lineNumber-1, backlinkText);
              }
            }
          }
          break;
          
        // commandDaily - Insert VSCode backlink button to daily note header 
        case 'Insert VSCode backlink button':
          if (lineNumber != "") {
            options = {
              placeHolder: `Select Backlink prefix, Esc for none`,
              title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
            };
            let backlinkTypePick = "";
            backlinkTypePick = await vscode.window.showQuickPick(BacklinkPrefix, options);
            // commandSendto - User Canceled 
            if (!backlinkTypePick) {
              backlinkTypePick = "";
            }
            options = {
              value: `${buttonTitle}`,
              prompt: "Enter descriptive text to display in the backlink button",
              title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
            };
            let unixTimestamp = Math.round(+new Date()/1000);
            let buttonText = await vscode.window.showInputBox(options);
            if (buttonText != undefined) {
              let buttonDef;
              if (buttonText != "") {
                if (buttonClass == "") {
                  buttonDef = `\n\`\`\`button\nname ${backlinkTypePick} ${buttonText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${unixTimestamp}\ntype link\naction ${vscodeUri}\n\`\`\`\n`
                } else {
                  buttonDef = `\n\`\`\`button\nname ${backlinkTypePick} ${buttonText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${unixTimestamp}\ntype link\nclass ${buttonClass}\naction ${vscodeUri}\n\`\`\`\n`
                };
                vscode.env.clipboard.writeText(buttonDef);
                if (pick.label == 'Prepend to header...') {
                  obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=prepend`
                  vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
                } else {
                  obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headerPick.label}&clipboard=true&mode=append`
                  vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
                };
                const editor = vscode.window.activeTextEditor;
                await editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(lineNumber-1, columnNumber-1, lineNumber-1, columnNumber-1), `${backlinkSeparator} ${backlinkTypePick} ${buttonText} ${backlinkSeparator} File: ${dailyNoteFilename} ${backlinkSeparator} ID: ${unixTimestamp} ${backlinkSeparator}`);
                }).catch(err => console.log(err));
                let backlinkText = `${backlinkTypePick} ${buttonText}`;
                addBacklinkDataFile(unixTimestamp, "button", currentDocumentPathFilename, dailyNotePathFilename, lineNumber-1, backlinkText);
              }
            }
          }
          break;
        }
      break;
    }
};
  

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                          ● Function commandSendto ●                          │
//  │                                                                              │
//  │                         • Execute Send to Commands •                         │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function commandSendto() {

  let openPicks = [];
  let defaultPrependAppendCommands = [];
  let taskChoices = ['[ ] Unchecked', '[x] Checked/Completed', '[?] Need more info/Question', '[!] Important', '[<] Scheduled/In progress', '[>] Rescheduled/Deferred', '[+] Task group', '[-] Cancelled/Non-task', '[*] Star', '[n] Note', '[l] Location', '[i] Information', '[I] Idea', '[S] Amount/Savings', '[p] Pro', '[c] Con', '[b] Bookmark', '[f] Fire', '[k] Key', '[w] Win', '[u] Up', '[d] Down'];
  let calloutChoices = ["Abstract", "Attention", "Bug", "Caution", "Check", "Cite", "Danger", "Done", "Error", "Example", "Fail", "Failure", "FAQ", "Help", "Hint", "Important", "Info", "Missing","Note", "Question", "Quote", "Success", "Summary", "Tip", "TLDR", "Todo", "Warning"];
  let pick;
  let lineNumber = "";
  let columnNumber = "";
  let linkTitle = "";
  let buttonTitle = "";
  let docPath = "";
  let vscodeUri = "";

  // commandSendto - Initialize VSCode Backlinks 
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
      lineNumber = activeEditor.selection.active.line+1;
      columnNumber = activeEditor.selection.active.character+1;
      docPath = vscode.window.activeTextEditor.document.uri.path
      vscodeUri = `vscode://file${docPath}:${lineNumber}`
  }

  // commandSendto - Prompt User with Default Note Choices 
  openPicks.push({label: `Append new header to default note: '${defaultNote}'`});
  if (headers.length > 0) {
    openPicks.push({label: 'Prepend to header...'});
    openPicks.push({label: 'Append to header...'});
  }

  // commandSendto - Prompt User with Default Note Command Choices 
  defaultPrependAppendCommands.push('Insert text');
  if (currentSelection != "") {
    defaultPrependAppendCommands.push('Insert selected text');
    defaultPrependAppendCommands.push('Insert selected text as inline code block');
    defaultPrependAppendCommands.push('Insert selected text as fenced code block');
  }
  defaultPrependAppendCommands.push('Insert Comment');
  defaultPrependAppendCommands.push('Insert Unnumbered list item');
  defaultPrependAppendCommands.push('Insert Numbered list item');
  defaultPrependAppendCommands.push('Insert Blockquote');
  defaultPrependAppendCommands.push('Insert task');
  defaultPrependAppendCommands.push('Insert Callout');
  if (lineNumber != "") {
    defaultPrependAppendCommands.push('Insert VSCode backlink');
    if (plugins.includes("buttons")) {
      defaultPrependAppendCommands.push('Insert VSCode backlink button');
    }
  };

  let options = {
    placeHolder: `Send to note '${defaultNote}' in Obsidian`,
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
  };
  pick = await vscode.window.showQuickPick(openPicks, options);
  // commandSendto - User Canceled 
  if (!pick) {
    return;
  }

  // commandSendto - Execute Commands 
  let command = pick.label
  let obURI;
  switch (command) {
    // commandSendto - Append new header to note ${defaultNote} 
    case `Append new header to default note: '${defaultNote}'`:
      options = {
        placeHolder: `Select new header size to create in note '${defaultNote}'`,
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
      };
    let headerSizePick = await vscode.window.showQuickPick(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'], options);
    // commandSendto - User Canceled 
    if (!headerSizePick) {
      break;
    }
    options = {
      placeHolder: `Enter new header text to insert in default note: '${defaultNote}'`,
      prompt: "Eg. Sent from VSCode (Do not include the #'s)",
      title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
    };
    let newHeaderText = await vscode.window.showInputBox(options);
    if (newHeaderText == undefined || "") {
      break;
    };
    let newHeaderString = "\n";
    switch (headerSizePick) {
      case 'H1':
        newHeaderString += '# '
        break;
      case 'H2':
        newHeaderString += '## '
        break;
      case 'H3':
        newHeaderString += '### '
        break;
      case 'H4':
        newHeaderString += '#### '
        break;
      case 'H5':
        newHeaderString += '##### '
        break;
      case 'H6':
        newHeaderString += '###### '
        break;
    };
    newHeaderString += newHeaderText;
    vscode.env.clipboard.writeText(newHeaderString);
    obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&clipboard=true&mode=append`
    vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    break;

    case 'Prepend to header...':
    case 'Append to header...':
    options = {
      placeHolder: `Select note '${defaultNote}' header to insert item to`,
      title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
    };
    let headerPick = await vscode.window.showQuickPick(headers, options);
    // commandSendto - User Canceled 
    if (!headerPick) {
      break;
    }
    options = {
      placeHolder: `Select item to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
      title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
    };
    let defaultCommandPick = await vscode.window.showQuickPick(defaultPrependAppendCommands, options);
    // commandSendto - User Canceled 
    if (!defaultCommandPick) {
      break;
    }
    let command = defaultCommandPick
    switch (command) {
      // commandSendto - Insert text to note ${defaultNote} header 
      case 'Insert text':
        options = {
          placeHolder: `Enter text to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
          prompt: "Eg. # Heading 1",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let newText = await vscode.window.showInputBox(options);
        if (newText != undefined) { 
          if (newText != "") {
            vscode.env.clipboard.writeText(newText);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
          break;
        }

      // commandSendto - Insert Selected Text to note ${defaultNote} header 
      case 'Insert selected text':
        vscode.env.clipboard.writeText(currentSelection);
          if (pick.label == 'Prepend to header...') {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          } else {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          }
        break;

      // commandSendto - Insert Selected Text Inline Code Block to note ${defaultNote} header 
      case 'Insert selected text as inline code block':
        let inlineCodeBlock = '`'+currentSelection+'`'
        vscode.env.clipboard.writeText(inlineCodeBlock);
          if (pick.label == 'Prepend to header...') {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          } else {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          }
        break;

      // commandSendto - Insert Selected Text Fenced Code Block to note ${defaultNote} header 
      case 'Insert selected text as fenced code block':
        options = {
          placeHolder: `Enter optional fenced code block language`,
          prompt: "Eg. 'js' for javascript, just hit enter for none",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let codeLanguage = await vscode.window.showInputBox(options);
        if (codeLanguage != undefined) { 
          let fencedCodeBlock = '\n```'+codeLanguage+'\n'+currentSelection+'\n```'
          vscode.env.clipboard.writeText(fencedCodeBlock);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
        }
        break;

      // commandSendto - Insert Comment to note ${defaultNote} header 
      case 'Insert Comment':
        options = {
          placeHolder: `Enter comment text to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
          prompt: "Eg. TODO Something",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let newComment = await vscode.window.showInputBox(options);
        if (newComment != undefined) { 
          if (newComment != "") {
            newComment = '%% '+newComment+' %%'
            vscode.env.clipboard.writeText(newComment);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;

      // commandSendto - Insert Unnumbered list item to note ${defaultNote} header 
      case 'Insert Unnumbered list item':
        options = {
          placeHolder: `Enter list item text to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
          prompt: "The - is not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let newUnnumList = await vscode.window.showInputBox(options);
        if (newUnnumList != undefined) { 
          if (newUnnumList != "") {
            newUnnumList = '- '+newUnnumList
            vscode.env.clipboard.writeText(newUnnumList);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
      
      // commandSendto - Insert Numbered list item to note ${defaultNote} header 
      case 'Insert Numbered list item':
        options = {
          placeHolder: `Enter list item text to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
          prompt: "The number is not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let newNumList = await vscode.window.showInputBox(options);
        if (newNumList != undefined) { 
          if (newNumList != "") {
            newNumList = '1. '+newNumList
            vscode.env.clipboard.writeText(newNumList);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
              
      // commandSendto - Insert Blockquote to note ${defaultNote} header 
      case 'Insert Blockquote':
        options = {
          placeHolder: `Enter blockquote item text to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
          prompt: "The > symbol is not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let newBlockQuote = await vscode.window.showInputBox(options);
        if (newBlockQuote != undefined) { 
          if (newBlockQuote != "") {
            newBlockQuote = '\n> '+newBlockQuote
            vscode.env.clipboard.writeText(newBlockQuote);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
      
      // commandSendto - Insert task to note ${defaultNote} header 
      case 'Insert task':
        options = {
          placeHolder: `Select task type to insert`,
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let taskPick = await vscode.window.showQuickPick(taskChoices, options);
        // commandSendto - User Canceled 
        if (!taskPick) {
          break;
        }
        taskPick = taskPick.slice(0, 3);
        options = {
          placeHolder: `Enter task item text to insert in default note: '${defaultNote}', under header: '${headerPick.label}'`,
          prompt: "The '- [ ]' symbols are not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let taskText = await vscode.window.showInputBox(options);
        if (taskText != undefined) { 
          if (taskText != "") {
            let taskDef = `- ${taskPick} ${taskText}`
            vscode.env.clipboard.writeText(taskDef);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;

      // commandSendto - Insert Callout to note ${defaultNote} header 
      case 'Insert Callout':
        options = {
          placeHolder: `Select callout type to insert`,
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let calloutPick = await vscode.window.showQuickPick(calloutChoices, options);
        // commandSendto - User Canceled 
        if (!calloutPick) {
          break;
        }
        options = {
          placeHolder: `Select folding option`,
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let foldingPick = await vscode.window.showQuickPick(['None', 'Default Expanded', 'Default Collapsed'], options);
        // commandSendto - User Canceled 
        if (!foldingPick) {
          break;
        }
        let foldingOption = '';
        if (foldingPick == 'Default Expanded') {
          foldingOption = '+';
        }
        if (foldingPick == 'Default Collapsed') {
          foldingOption = '-';
        }
        options = {
          placeHolder: `Enter optional callout item title text`,
          prompt: "The optional title text for the callout, leave blank for default.",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
        };
        let calloutTitle = await vscode.window.showInputBox(options);
        if (calloutTitle != undefined) { 
          calloutTitle = ' '+calloutTitle;
          options = {
            placeHolder: `Enter optional callout item content text`,
            prompt: "The optional content text for the callout, leave blank for no content.",
            title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
          };
          let calloutContent = await vscode.window.showInputBox(options);
          if (calloutContent != undefined) { 
            let calloutDef = '\n> [!'+calloutPick+']'+foldingOption+calloutTitle+'\n'
            if (calloutContent != '') {
              calloutDef = calloutDef+'> '+calloutContent+'\n';
            }
            calloutDef = calloutDef+'\n'; // Ensures a blank line below callout
            vscode.env.clipboard.writeText(calloutDef);
            if (pick.label == 'Prepend to header...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
        
      // commandSendto - Insert VSCode backlink to note ${defaultNote} header 
      case 'Insert VSCode backlink':
        if (lineNumber != "") {
          options = {
            placeHolder: `Select Backlink prefix, Esc for none`,
            title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
          };
          let backlinkTypePick = "";
          backlinkTypePick = await vscode.window.showQuickPick(BacklinkPrefix, options);
          // commandSendto - User Canceled 
          if (!backlinkTypePick) {
            backlinkTypePick = "";
          }
          options = {
            value: `${linkTitle}`,
            prompt: "Enter descriptive text to display in the backlink",
            title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
          };
          let unixTimestamp = Math.round(+new Date()/1000);
          let linkText = await vscode.window.showInputBox(options);
          if (linkText != undefined) { 
            if (linkText != "") {
              let linkDef = `\n[${backlinkTypePick} ${linkText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${unixTimestamp}](${vscodeUri})`
              vscode.env.clipboard.writeText(linkDef);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
              const editor = vscode.window.activeTextEditor;
              await editor.edit(editBuilder => {
                  editBuilder.replace(new vscode.Range(lineNumber-1, columnNumber-1, lineNumber-1, columnNumber-1), `${backlinkSeparator} ${backlinkTypePick} ${linkText} ${backlinkSeparator} File: ${defaultNote} ${backlinkSeparator} ID: ${unixTimestamp} ${backlinkSeparator}`);
              }).catch(err => console.log(err));
              let backlinkText = `${backlinkTypePick} ${linkText}`;
              addBacklinkDataFile(unixTimestamp, "link", currentDocumentPathFilename, defaultNotePathFilename, lineNumber-1, backlinkText);
            }
          }
        }
        break;
        
      // commandSendto - Insert VSCode backlink button to note ${defaultNote} header 
      case 'Insert VSCode backlink button':
        if (lineNumber != "") {
          options = {
            placeHolder: `Select Backlink prefix, Esc for none`,
            title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
          };
          let backlinkTypePick = "";
          backlinkTypePick = await vscode.window.showQuickPick(BacklinkPrefix, options);
          // commandSendto - User Canceled 
          if (!backlinkTypePick) {
            backlinkTypePick = "";
          }
          options = {
            value: `${buttonTitle}`,
            prompt: "Enter descriptive text to display in the backlink button",
            title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNote} ===---`
          };
          let unixTimestamp = Math.round(+new Date()/1000);
          let buttonText = await vscode.window.showInputBox(options);
          if (buttonText != undefined) { 
            if (buttonText != "") {
              let buttonDef;
              if (buttonClass == "") {
                buttonDef = `\n\`\`\`button\nname ${backlinkTypePick} ${buttonText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${unixTimestamp}\ntype link\naction ${vscodeUri}\n\`\`\`\n`
              } else {
                buttonDef = `\n\`\`\`button\nname ${backlinkTypePick} ${buttonText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${unixTimestamp}\ntype link\nclass ${buttonClass}\naction ${vscodeUri}\n\`\`\`\n`
              }
              vscode.env.clipboard.writeText(buttonDef);
              if (pick.label == 'Prepend to header...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headerPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
              const editor = vscode.window.activeTextEditor;
              await editor.edit(editBuilder => {
                  editBuilder.replace(new vscode.Range(lineNumber-1, columnNumber-1, lineNumber-1, columnNumber-1), `${backlinkSeparator} ${backlinkTypePick} ${buttonText} ${backlinkSeparator} File: ${defaultNote} ${backlinkSeparator} ID: ${unixTimestamp} ${backlinkSeparator}`);
              }).catch(err => console.log(err));
              let backlinkText = `${backlinkTypePick} ${buttonText}`;
              addBacklinkDataFile(unixTimestamp, "button", currentDocumentPathFilename, defaultNotePathFilename, lineNumber-1, backlinkText);
            }
          }
        }
        break;
    }
  }
};
  

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                           ● Function deactivate ●                            │
//  │                                                                              │
//  │                            • Extension Cleanup •                             │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function deactivate() {}