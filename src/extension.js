const vscode = require("vscode");
const os = require('os');
const { readFile } = require('fs/promises')
const { join } = require('path');
const { getAppDataPath } = require("appdata-path");
const path = require("path");
const fs = require("fs");
const moment = require('moment');
const { error } = require("console");

module.exports = {
    activate,
    deactivate,
};

let myContext;
let currentVersion;
let myStatusBarItem;
let obVaultsJsonPath;
let defaultVault;
let defaultVaultPath;
let defaultNote;
let defaultNoteShort;
let defaultNotePathFilename;
let dailyNoteFilename;
let dailyNotePathFilename;
let buttonClass = [];
let metabuttonClass = [];
let backlinkSeparator;
// Note: seperator regex - Just using or to match both
//let separatorsRegexString = ' ?\\| ?| ?~ ?| ?• ?| ?· ?| ?° ?| ?¦ ?| ?§ ?| ?¥ ?| ?¤ ?| ?º ?| ?— ?| ?¡ ?| ?« ?| ?» ?'
let globalStoragePath;
let globalStorageFilename = "Backlinks.json";
let globalStorageProjectFilename = vscode.workspace.name+".json";
let globalStorageProjectFilenamePath;
let globalStorageFilenamePath;
let currentDocumentName;
let currentDocumentPathFilename;
let useGlobalSettings;
let BacklinkPrefix = [];
let headings = [];
let bookmarked = [];
let bookmarkedTitles = [];
let bookmarkedValid = [];
let workspaces = [];
let plugins = [];
let currentDocument;
let currentSelection;
//--- Console CSS
const consoleErrorCSS = 'background: #FF0000; color: #f8e3f9ff; padding: 2px 3px; border-top: 1px solid #FFC800; border-right: 1px solid #FFC800; border-bottom: 1px solid #FFC800; border-radius: 0px 12px 12px 0px; line-height: 16px;';
const consoleWarningCSS = 'background: #878700ff; color: #E1FF74; padding: 2px 3px; border-top: 1px solid #FFC800; border-right: 1px solid #FFC800; border-bottom: 1px solid #FFC800; border-radius: 0px 12px 12px 0px; line-height: 16px;';
const consoleInfoCSS = 'background: #0000FF; color: #FFFFFF; padding: 2px 3px; border-top: 1px solid #FFC800; border-right: 1px solid #FFC800; border-bottom: 1px solid #FFC800; border-radius: 0px 12px 12px 0px; line-height: 16px;';
const consoleTitleCSS = 'background: #004D45; color: #F2FF00; padding: 2px 3px; border-top: 1px solid #FFC800; border-left: 1px solid #FFC800; border-bottom: 1px solid #FFC800; border-radius: 12px 0px 0px 12px; line-height: 16px;';

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
  // Adds Backlink Text
  let extensionInfo =vscode.extensions.getExtension('willasm.obsidian-md-vsc');
  let extensionPackage = extensionInfo.packageJSON;
  currentVersion = extensionPackage.version;
  console.log('%c Obsidian MD VSC v'+ currentVersion+' %c Extension has been activated ',consoleTitleCSS,consoleInfoCSS);
  // if (currentVersion == '1.2.0' || currentVersion == '1.1.0' || currentVersion == '1.0.4' || currentVersion == '1.0.3' || currentVersion == '1.0.2' || currentVersion == '1.0.1' || currentVersion == '1.0.0') {
  //   updateOldDataFile();
  // };

  // Activate - Split Backlinks.json into separate projectName.json files 
  // Also adds future key/value pairs
  globalStoragePath = myContext.globalStoragePath;
  globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  globalStorageProjectFilenamePath = path.join(globalStoragePath, globalStorageProjectFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
  } else {
    if (fs.existsSync(globalStorageFilenamePath)) {
      splitOldBacklinksJson();
    };
  };

  // Activate - Get Default Vault & Note from Settings 
  let settings = vscode.workspace.getConfiguration("obsidian-md-vsc");
  defaultVault = settings.get("defaultVault");
  defaultVaultPath = settings.get("defaultVaultPath");
  defaultNote = settings.get("defaultNote");
  defaultNoteShort = defaultNote;
  if (defaultNote.indexOf(path.sep) != -1) {
    defaultNoteShort = defaultNote.substring(defaultNote.lastIndexOf(path.sep) + 1)
  }
  buttonClass = settings.get("buttonClass");
  metabuttonClass = settings.get("metabuttonClass");
  backlinkSeparator = settings.get("backlinkSeparator");
  defaultNotePathFilename = path.join(defaultVaultPath, defaultNote);
  defaultNotePathFilename += '.md'
  BacklinkPrefix = settings.get("BacklinkPrefix");
  // Activate - Get OS, Possible return values are 'aix', 'darwin', 'freebsd','linux', 'openbsd', 'sunos', and 'win32' 
  osPlatform = os.platform();
  if (osPlatform === 'win32') {
    //console.log("Win32");
    obVaultsJsonPath = path.join(getAppDataPath(),'obsidian','obsidian.json');
    //console.log(getAppDataPath());
    //obVaultsJsonPath = '%appdata%/obsidian/obsidian.json'
  } else if (osPlatform === 'darwin') {
    //console.log("Mac");
    obVaultsJsonPath = path.join(os.homedir(),'Library','Application Support','obsidian','obsidian.json');
  } else {
    //console.log("linux");
    obVaultsJsonPath = path.join(os.homedir(),'.config','obsidian','obsidian.json');
    //console.log('%cPath: '+obVaultsJsonPath,consoleInfoCSS);
  };
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
  updateStatusBarItem();
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                        ● Function updateOldDataFile ●                        │
//  │                                                                              │
//  │                  • Update old version backlinks data file •                  │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
// function updateOldDataFile() {

//   // updateOldDataFile - Create Extensions Global Storage Folder if it Does Not Exist 
//   globalStoragePath = myContext.globalStoragePath;
//   globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
//   if (!fs.existsSync(globalStoragePath)) {
//     fs.mkdirSync(globalStoragePath, { recursive: true });
//     return; // No need to continue if backlinks data does not exist
//   };

//   // updateOldDataFile - Load Json Data File From Extensions Global Storage Folder if it Exists 
//   let fileJsonObject = [];
//   let newFileJsonObject = [];
//   if (fs.existsSync(globalStorageFilenamePath)) {
//     let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
//     fileJsonObject = JSON.parse(file);
//   } else {
//     // No need to continue if data file does not exist
//     return;
//   };
//   // No need to continue if data file contains no data
//   if (fileJsonObject.length == 0 || null || undefined) {
//     return;
//   };

//   // updateOldDataFile - Create a Backup of the Backlinks Data File 
//   let backupFile = path.join(globalStoragePath, globalStorageFilename + ".BKP");
//   if (!fs.existsSync(backupFile)) {
//     fs.writeFileSync(backupFile, JSON.stringify(fileJsonObject,null,2));
//   } else {
//     // Can return here since the backup is created then the data file has already been updated
//     return;
//   }
  
//   // updateOldDataFile - Process Data File Contains Backlinks 
//   for (let i = 0; i < fileJsonObject.length; i++) {
//     let id = fileJsonObject[i].id;
//     let type = fileJsonObject[i].type;
//     let vscodePath = fileJsonObject[i].vscodePath;
//     let obsidianPath = fileJsonObject[i].obsidianPath;
//     let lineNumber = fileJsonObject[i].lineNumber;
//     let newBacklinkText;
//     let vscodeFile = fs.readFileSync(vscodePath,"utf-8");
//     let idRegExVscode = new RegExp(`(.*?)( ?\\| ?)(File: ?)(.+?)( ?\\| ?)(ID: ?)(${id})`);
//     let match = idRegExVscode.exec(vscodeFile);
//     idRegExVscode.lastIndex = 0;
//     if (match != null) {
//       newBacklinkText = match[1];
//       let backlinkTextSearch = vscodeFile.replace(idRegExVscode, `| $1$2$3$4$5$6$7 |`);
//       idRegExVscode.lastIndex = 0;
//       let newDataItem = {
//         "id": id,
//         "type": type,
//         "vscodePath": vscodePath,
//         "obsidianPath": obsidianPath,
//         "lineNumber": lineNumber,
//         "backlinkText": newBacklinkText
//       };

//       // updateOldDataFile - Push the Updated Json Data File Item and Update this VSCode File 
//       newFileJsonObject.push(newDataItem);

//       // updateOldDataFile - Write this Backlink to the Updated VSCode File 
//       fs.writeFileSync(vscodePath, backlinkTextSearch);
//     };
//   };

//   // updateOldDataFile - Write the Updated Json Data File to Extensions Global Storage Folder 
//   fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(newFileJsonObject,null,2));
//   vscode.window.showInformationMessage('Successfully Updated Backlinks Data File!', 'OK');

// };


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function addBacklinkDataFile ●                       │
//  │                                                                              │
//  │                 • Add new item to the backlinks data file •                  │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function addBacklinkDataFile(id, type, vscodePath, obsidianPath, lineNumber, columnNumber, backlinkText) {

  // addBacklinkDataFile - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageProjectFilenamePath = path.join(globalStoragePath, globalStorageProjectFilename)
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
    columnNumber: columnNumber,
    backlinkText: backlinkText,
    futureOne: "",
    futureTwo: "",
    futureThree: 0,
    futureFour: 0
  };

  // addBacklinkDataFile - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageProjectFilenamePath)) {
    let file = fs.readFileSync(globalStorageProjectFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  };

  // addBacklinkDataFile - Add Json Data to File Buffer 
  fileJsonObject.push(newBacklink);
  
  // addBacklinkDataFile - Write the Json Data File to Extensions Global Storage Folder 
  fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(fileJsonObject,null,2));

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                  ● Function commandVerifyDeleteBacklinks ●                   │
//  │                                                                              │
//  │          • Validate All VSCode Backlinks and Prompt for Deletion •           │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function commandVerifyDeleteBacklinks() {

  let fileJsonObject;

  // commandVerifyDeleteBacklinks - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    vscode.window.showInformationMessage('No backlinks Data Available...','OK');
    return; // No need to continue if backlinks data does not exist
  };

  // commandVerifyDeleteBacklinks - Load Json Data File From Extensions Global Storage Folder if it Exists 
  if (fs.existsSync(globalStorageProjectFilenamePath)) {
    let file = fs.readFileSync(globalStorageProjectFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
    //console.log("📢fileJsonObject: ", fileJsonObject);
  } else {
    vscode.window.showInformationMessage('No backlinks Data Available...','OK');
    // No need to continue if data file does not exist
    return;
  };
  if (fileJsonObject.length == 0 || null || undefined) {
    vscode.window.showInformationMessage('No backlinks Data Available...','OK');
    // No need to continue if data file contains no data
    return;
  };

  // commandVerifyDeleteBacklinks - Loop through projects backlinks 
  let validItems = [];
  
  for (let i = 0; i < fileJsonObject.length; i++) {
    validItems[i] = true; // Default to valid
    let obsidianFilename = fileJsonObject[i].obsidianPath;
    let vscFilename = fileJsonObject[i].vscodePath;
    let fileObs;
    let fileVSC;
    let fileObsSplit;
    let fileVSCSplit;
    let id = fileJsonObject[i].id;
    let idRegEx = new RegExp(`ID: ?${id}`,'gm');

    // commandVerifyDeleteBacklinks - Verify VSCode file exists 
    if (fs.existsSync(vscFilename)) {
      fileVSC = fs.readFileSync(vscFilename,"utf-8");
      fileVSCSplit = fileVSC.split('\n'); // vscodeFileLines = vscodeFile.split('\n');
      //console.log("📢fileVSCSplit: ", fileVSCSplit);
    } else {
      validItems[i] = false;
    };
    // commandVerifyDeleteBacklinks - Verify Obsidian file exists 
    if (fs.existsSync(obsidianFilename)) {
      fileObs = fs.readFileSync(obsidianFilename,"utf-8");
      fileObsSplit = fileObs.split('\n');  // document.fileName,"utf-8"
      //console.log("📢fileObsSplit: ", fileObsSplit);
    } else {
      validItems[i] = false;
    };

    // commandVerifyDeleteBacklinks - Verify VSCode file contains backlinks ID 
    if (!idRegEx.test(fileVSC)) {
      validItems[i] = false;
    };
    // commandVerifyDeleteBacklinks - Verify Obsidian file contains backlinks ID 
    if (!idRegEx.test(fileObs)) {
      validItems[i] = false;
    };

  };

//// commandVerifyDeleteBacklinks - Validate backlinks line numbers and text 
//// This is done on save

  // commandVerifyDeleteBacklinks - Create a List of Backlinks to Delete 
  let projectBacklinksList = [];
  for (let i = 0; i < fileJsonObject.length; i++) {
    if (validItems[i]) {
      projectBacklinksList.push({label: `${fileJsonObject[i].backlinkText}`, description: `${fileJsonObject[i].id} $(check)`});
    } else {
      projectBacklinksList.push({label: `${fileJsonObject[i].backlinkText}`, description: `${fileJsonObject[i].id} $(error)    { Backlink is Invalid }`});
    };
  };

  // commandVerifyDeleteBacklinks - Prompt User With a List of Backlinks to Delete 
  options = {
    placeHolder: "Select any backlinks you wish to delete",
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} - Daily Note: ${dailyNoteFilename} ===---`,
    canPickMany: true
  };

  let pick;
  if (projectBacklinksList.length == 0) {
    vscode.window.showInformationMessage('No Project Backlinks Available...','OK');
    return;
  };
  pick = await vscode.window.showQuickPick(projectBacklinksList, options);

  // commandVerifyDeleteBacklinks - User Canceled 
  if (!pick || pick.length == 0) {
    return;
  };

  // commandVerifyDeleteBacklinks - Loop through all selected backlinks 
  for (let idx = 0; idx < pick.length; idx++) {
    let idPick = pick[idx].description.substring(0,10);
    for (let j = 0; j < fileJsonObject.length; j++) {
      let type = fileJsonObject[j].type;
      let obsidianFilename = fileJsonObject[j].obsidianPath;
      let vscFilename = fileJsonObject[j].vscodePath;
      let fileObs;
      let fileVSC;
      let fileObsSplit;
      let fileVSCSplit;
      let id = fileJsonObject[j].id;

      // commandVerifyDeleteBacklinks - Is this a selected backlink? 
      if (idPick == id) {
        
        // commandVerifyDeleteBacklinks - Remove backlink text from VSCode file 
        if (fs.existsSync(vscFilename)) {
          fileVSC = fs.readFileSync(vscFilename, "utf-8");
          fileVSCSplit = fileVSC.split('\n');
          for (let k = 0; k < fileVSCSplit.length; k++) {
            if (fileVSCSplit[k].indexOf(id) > -1) {
              fileVSCSplit.splice(k, 1);
              let newFile = fileVSCSplit.join("\n");
              fs.writeFileSync(vscFilename, newFile, "utf-8");
            };
          };
        };

        // commandVerifyDeleteBacklinks - Remove backlink text from Obsidian file 
        if (fs.existsSync(obsidianFilename)) {
          fileObs = fs.readFileSync(obsidianFilename,"utf-8");
          fileObsSplit = fileObs.split('\n');
          for (let l = 0; l < fileObsSplit.length; l++) {
            if (type === "link") {
              if (fileObsSplit[l].indexOf(id) > -1) {
                fileObsSplit.splice(l, 1);
                let newFile = fileObsSplit.join("\n");
                fs.writeFileSync(obsidianFilename, newFile, "utf-8");
              };
            } else if (type === "button") {
              if (fileObsSplit[l].indexOf("```button") > -1 && fileObsSplit[l+1].indexOf(id) > -1) {
                while (fileObsSplit[l] != "```") {
                  fileObsSplit.splice(l, 1);
                };
                fileObsSplit.splice(l, 1);
                let newFile = fileObsSplit.join("\n");
                fs.writeFileSync(obsidianFilename, newFile, "utf-8");
              };
            } else {  // type = "metabutton"
              if (fileObsSplit[l].indexOf("```meta-bind-button") > -1 && fileObsSplit[l+1].indexOf(id) > -1) {
                while (fileObsSplit[l] != "```") {
                  fileObsSplit.splice(l, 1);
                };
                fileObsSplit.splice(l, 1);
                let newFile = fileObsSplit.join("\n");
                fs.writeFileSync(obsidianFilename, newFile, "utf-8");
              };
            };
          };
        };

        // commandVerifyDeleteBacklinks - Remove backlink item from projectName.json file 
        fileJsonObject.splice(j, 1);
        fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(fileJsonObject,null,2));

      };
    };
  };
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                      ● Function updateBacklinksOnSave ●                      │
//  │                                                                              │
//  │        • Update All VSCode and Obsidian Backlinks After File Saved •         │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateBacklinksOnSave(document) {

  // updateBacklinksOnSave - Create extensions global storage folder if it does not exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageProjectFilenamePath = path.join(globalStoragePath, globalStorageProjectFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateBacklinksOnSave - Load Json data file from extensions global storage folder if it exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageProjectFilenamePath)) {
    let file = fs.readFileSync(globalStorageProjectFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  if (fileJsonObject.length == 0 || null || undefined) {
    // No need to continue if data file contains no data
    return;
  };

  // updateBacklinksOnSave - Check if data file contains saved files backlinks 
  let savedFileNamePath = document.uri.fsPath;
  let savedFileName = savedFileNamePath.substring(savedFileNamePath.lastIndexOf(path.sep) + 1);
  let fileVSC = fs.readFileSync(savedFileNamePath,"utf-8");
  let fileVSCSplit = fileVSC.split('\n');
  let fileOBS;
  let fileObsSplit;
  let id;
  let type;
  let oldLineNumber;
  let newLineNumber;
  let oldDescText;
  let newDescText;
  let textRegEx = new RegExp(`\\${backlinkSeparator}\\s*(.+?)\\s*\\${backlinkSeparator}`);
  let linkRegEx = new RegExp(`\\[\\s*(.+?)\\s*\\${backlinkSeparator}`);
  let linkLineRegEx = new RegExp(`:(\\d+)\\)`);
  let buttonTextRegEx = new RegExp(`name\\s+(.*?)\\s*\\${backlinkSeparator}`);
  let buttonLineRegEx = new RegExp(`action.+:(\\d+)`);
  let metaTextRegEx = new RegExp(`label:\\s*"(.+?)\\s*\\${backlinkSeparator}`);
  let metaLineRegEx = new RegExp(`link:\\s*.+:(\\d+)`);
  //| DEBUG: Link Test Delete | File: obsidian-md-vsc | ID: 1753391454 |

  // updateBacklinksOnSave - Search for backlinks 
  for (let i = 0; i < fileJsonObject.length; i++) {
    let obsidianFilename = fileJsonObject[i].obsidianPath;

    // updateBacklinksOnSave - Found backlink 
    if (savedFileNamePath === fileJsonObject[i].vscodePath) {
      id = fileJsonObject[i].id;
      type = fileJsonObject[i].type;
      oldLineNumber = fileJsonObject[i].lineNumber;
      oldDescText = fileJsonObject[i].backlinkText;
      fileOBS = fs.readFileSync(fileJsonObject[i].obsidianPath,"utf-8");
      fileObsSplit = fileOBS.split('\n');

      // updateBacklinksOnSave - Get possibly new text and line number 
      for (let j = 0; j < fileVSCSplit.length; j++) {
        if (fileVSCSplit[j].indexOf(id) > -1) {
          newLineNumber = j+1;
          fileJsonObject[i].lineNumber = newLineNumber;
          let txtMatch = textRegEx.exec(fileVSCSplit[j]);
          newDescText = txtMatch[1];
          fileJsonObject[i].backlinkText = newDescText;

          // updateBacklinksOnSave - Update backlink from Obsidian 
          for (let k = 0; k < fileObsSplit.length; k++) {
            if (type === "link") {
              if (fileObsSplit[k].indexOf(id) > -1) {
                let linkMatch = linkRegEx.exec(fileObsSplit[k]);
                fileObsSplit[k] = fileObsSplit[k].replace(linkMatch[1], newDescText);
                let linkLineMatch = linkLineRegEx.exec(fileObsSplit[k]);
                fileObsSplit[k] = fileObsSplit[k].replace(':'+linkLineMatch[1]+')', ':'+newLineNumber+')');
                let newFile = fileObsSplit.join("\n");
                fs.writeFileSync(obsidianFilename, newFile, "utf-8");
              };
            } else if (type === "button") {
              if (fileObsSplit[k].indexOf("```button") > -1 && fileObsSplit[k+1].indexOf(id) > -1) {
                let buttonMatch = buttonTextRegEx.exec(fileObsSplit[k+1]);
                fileObsSplit[k+1] = fileObsSplit[k+1].replace(buttonMatch[1], newDescText);
                index = 3;
                if (buttonClass.length > 0) {
                  index = 4;
                };
                let buttonLineMatch = buttonLineRegEx.exec(fileObsSplit[k+index]);
                fileObsSplit[k+index] = fileObsSplit[k+index].replace(':'+buttonLineMatch[1], ':'+newLineNumber);
                let newFile = fileObsSplit.join("\n");
                fs.writeFileSync(obsidianFilename, newFile, "utf-8");
              };
            } else {  // Meta Button
              if (fileObsSplit[k].indexOf("```meta-bind-button") > -1 && fileObsSplit[k+1].indexOf(id) > -1) {
                let buttonMatch = metaTextRegEx.exec(fileObsSplit[k+1]);
                fileObsSplit[k+1] = fileObsSplit[k+1].replace(buttonMatch[1], newDescText);
                index = 5;
                if (metabuttonClass.length > 0) {
                  index = 6;
                };
                let buttonLineMatch = metaLineRegEx.exec(fileObsSplit[k+index]);
                fileObsSplit[k+index] = fileObsSplit[k+index].replace(':'+buttonLineMatch[1], ':'+newLineNumber);
                let newFile = fileObsSplit.join("\n");
                fs.writeFileSync(obsidianFilename, newFile, "utf-8");
              };
            };
          };
        };
      };

      // updateBacklinksOnSave - Update projectName.json with new filename 
      fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(fileJsonObject,null,2));
    };
  };

  return;

  // // updateBacklinksOnSave - Create Extensions Global Storage Folder if it Does Not Exist 
  // globalStoragePath = myContext.globalStoragePath;
  // globalStorageFilenamePath = path.join(globalStoragePath, globalStorageFilename);
  // if (!fs.existsSync(globalStoragePath)) {
  //   fs.mkdirSync(globalStoragePath, { recursive: true });
  //   return; // No need to continue if backlinks data does not exist
  // };

  // // updateBacklinksOnSave - Load Json data file from extensions global storage folder if it exists 
  // let fileJsonObject = [];
  // if (fs.existsSync(globalStorageFilenamePath)) {
  //   let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
  //   fileJsonObject = JSON.parse(file);
  // } else {
  //   // No need to continue if data file does not exist
  //   return;
  // };
  // // No need to continue if data file contains no data
  // if (fileJsonObject.length == 0 || null || undefined) {
  //   return;
  // };

  // // updateBacklinksOnSave - Check if Data File Contains Saved Files Backlinks 
  // for (let i = 0; i < fileJsonObject.length; i++) {
  //   if (document.fileName == fileJsonObject[i].vscodePath) {
  //     let id = fileJsonObject[i].id;
  //     let type = fileJsonObject[i].type;
  //     let oldBacklinkText = fileJsonObject[i].backlinkText;
  //     let vscodeFile = fs.readFileSync(document.fileName,"utf-8");
  //     let vscodeFileLines = vscodeFile.split('\n');
  //     let newLineNumber;
  //     let idRegExVscode = new RegExp(`(.*?)(${separatorsRegexString})(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})( ?)(${separatorsRegexString})`);
  //     let idRegExTypeLink = new RegExp(`(\\[)(.+?)(${separatorsRegexString})(File: ?)(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\]\\()(vscode:\\/\\/file)(.+)(:)(\\d+)(\\))`);
  //     let idRegExTypeButton = new RegExp(`(\`\`\`button\\r?\\n)(name )(.+?)(${separatorsRegexString})(File: )(.+?)(${separatorsRegexString})(ID: ?)(${id})(\\r?\\ntype link)(\\r?\\nclass .+|)?(\\r?\\naction )(vscode:\\/\\/file\\/)(.+?)(:)(\\d+)(\\r?\\n\`\`\`)`);
  //     for (let idx = 0; idx < vscodeFileLines.length; idx++) {
  //       idRegExVscode.lastIndex = 0;
  //       let test = idRegExVscode.exec(vscodeFileLines[idx]);
  //       idRegExVscode.lastIndex = 0;
  //       if (test != null) {
  //         newLineNumber = idx;
  //         let oldLineNumber = fileJsonObject[i].lineNumber;
  //         let newBacklinkText = test[3];
  //         if (newLineNumber != oldLineNumber || newBacklinkText != oldBacklinkText) {
  //           // updateBacklinksOnSave - Save the updated data file 
  //           fileJsonObject[i].lineNumber = newLineNumber;
  //           fileJsonObject[i].backlinkText = newBacklinkText;
  //           fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(fileJsonObject,null,2));
  //           // updateBacklinksOnSave - Load and update the obsidian file then save it 
  //           newLineNumber++;
  //           let obsidianFilename = fileJsonObject[i].obsidianPath;
  //           // updateBacklinksOnSave - Update Obsidian File Only if it Exists 
  //           if (fs.existsSync(obsidianFilename)) {
  //             let file = fs.readFileSync(obsidianFilename,"utf-8");
  //             let match;
  //             if (type == 'link') {
  //               match = file.replace(idRegExTypeLink, `$1${newBacklinkText}$3$4$5$6$7$8$9$10$11$12${newLineNumber}$14`);
  //             } else {
  //               match = file.replace(idRegExTypeButton, `$1$2${newBacklinkText}$4$5$6$7$8$9$10$11$12$13$14$15${newLineNumber}$17`);
  //             };
  //             fs.writeFileSync(obsidianFilename, match);
  //           };
  //         }
  //       };
  //     };
  //   };
  // };
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                     ● Function updateBacklinksOnDelete ●                     │
//  │                                                                              │
//  │             • Update All VSCode Backlinks After File Deletion •              │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateBacklinksOnDelete(deletedFiles) {

  // updateBacklinksOnDelete - Create Extensions Global Storage Folder if it Does Not Exist 
  globalStoragePath = myContext.globalStoragePath;
  globalStorageProjectFilenamePath = path.join(globalStoragePath, globalStorageProjectFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateBacklinksOnDelete - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageProjectFilenamePath)) {
    let file = fs.readFileSync(globalStorageProjectFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  if (fileJsonObject.length == 0 || null || undefined) {
    // No need to continue if data file contains no data
    return;
  };

  // updateBacklinksOnDelete - Get All Deleted Files (Full Path) 
  let deletedFilesList = [];
  let deletedFilesfsPathList = [];
  deletedFilesList = [...deletedFiles.files];
  deletedFilesfsPathList = deletedFilesList.map(({fsPath:value}) => value);

  // updateBacklinksOnDelete - Loop through all deleted files 
  for (let i = 0; i < deletedFilesfsPathList.length; i++) {
    let fileJsonObject = [];
    let file = fs.readFileSync(globalStorageProjectFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
    let filterStr = deletedFilesfsPathList[i];
    let backlinkObjectsToDelete = [];
    backlinkObjectsToDelete = fileJsonObject.filter(obj => obj.vscodePath === filterStr);
    let backlinkObjectsTokeep = [];
    backlinkObjectsToKeep = fileJsonObject.filter(obj => obj.vscodePath !== filterStr);

    // updateBacklinksOnDelete - Delete backlinks from Obsidian files 
    for (let j = 0; j < backlinkObjectsToDelete.length; j++) {
      let fileObsPathName = backlinkObjectsToDelete[j].obsidianPath;
      let type = backlinkObjectsToDelete[j].type;
      let id = backlinkObjectsToDelete[j].id;
      if (fs.existsSync(fileObsPathName)) {
        let fileObs = fs.readFileSync(fileObsPathName,"utf-8");
        let fileObsSplit = fileObs.split('\n');
        for (let l = 0; l < fileObsSplit.length; l++) {
          if (type === "link") {
            if (fileObsSplit[l].indexOf(id) > -1) {
              fileObsSplit.splice(l, 1);
              let newFile = fileObsSplit.join("\n");
              fs.writeFileSync(fileObsPathName, newFile, "utf-8");
            };
          } else if (type === "button") {
            if (fileObsSplit[l].indexOf("```button") > -1 && fileObsSplit[l+1].indexOf(id) > -1) {
              while (fileObsSplit[l] != "```") {
                fileObsSplit.splice(l, 1);
              };
              fileObsSplit.splice(l, 1);
              let newFile = fileObsSplit.join("\n");
              fs.writeFileSync(fileObsPathName, newFile, "utf-8");
            };
          } else {  // type = "metabutton"
            if (fileObsSplit[l].indexOf("```meta-bind-button") > -1 && fileObsSplit[l+1].indexOf(id) > -1) {
              while (fileObsSplit[l] != "```") {
                fileObsSplit.splice(l, 1);
              };
              fileObsSplit.splice(l, 1);
              let newFile = fileObsSplit.join("\n");
              fs.writeFileSync(fileObsPathName, newFile, "utf-8");
            };
          };
        };
      };
    };

    // updateBacklinksOnDelete - Update projectName.json with backlinks to keep 
    fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(backlinkObjectsToKeep,null,2));
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
  globalStorageProjectFilenamePath = path.join(globalStoragePath, globalStorageProjectFilename);
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    return; // No need to continue if backlinks data does not exist
  };

  // updateBacklinksOnRename - Load Json Data File From Extensions Global Storage Folder if it Exists 
  let fileJsonObject = [];
  if (fs.existsSync(globalStorageProjectFilenamePath)) {
    let file = fs.readFileSync(globalStorageProjectFilenamePath,"utf-8");
    fileJsonObject = JSON.parse(file);
  } else {
    // No need to continue if data file does not exist
    return;
  };
  if (fileJsonObject.length == 0 || null || undefined) {
    // No need to continue if data file contains no data
    return;
  };

  // updateBacklinksOnRename - Get All Renamed Files Old and New Uri's (Full Path) 
  let renamedNewUriListfsPath = [];
  let renamedOldUriListfsPath = [];
  for (let i = 0; i < newUriOldUriArray.files.length; i++) {
    renamedNewUriListfsPath.push(newUriOldUriArray.files[i].newUri.fsPath);
    renamedOldUriListfsPath.push(newUriOldUriArray.files[i].oldUri.fsPath);
  };

  // updateBacklinksOnRename - Check if Data File Contains Renamed Files (Full Path) 
  for (let j = 0; j < renamedOldUriListfsPath.length; j++) {
    for (let k = 0; k < fileJsonObject.length; k++) {
      let id = fileJsonObject[k].id;
      let type = fileJsonObject[k].type;
      let obsidianFilename = fileJsonObject[k].obsidianPath;
      if (fileJsonObject[k].vscodePath === renamedOldUriListfsPath[j]) {
        fileJsonObject[k].vscodePath = renamedNewUriListfsPath[j];
        let oldFileName = renamedOldUriListfsPath[j].substring(renamedOldUriListfsPath[j].lastIndexOf(path.sep) + 1);
        let newFileName = renamedNewUriListfsPath[j].substring(renamedNewUriListfsPath[j].lastIndexOf(path.sep) + 1);
        let fileObs = fs.readFileSync(obsidianFilename,"utf-8");
        let fileObsSplit = fileObs.split('\n');
        for (let l = 0; l < fileObsSplit.length; l++) {
          if (type === "link") {
            if (fileObsSplit[l].indexOf(oldFileName) > -1 && fileObsSplit[l].indexOf(id) > -1) {
              fileObsSplit[l] = fileObsSplit[l].replaceAll(oldFileName, newFileName);
              let newFile = fileObsSplit.join("\n");
              fs.writeFileSync(obsidianFilename, newFile, "utf-8");
            };
          } else if (type === "button") {
            if (fileObsSplit[l].indexOf("```button") > -1 && fileObsSplit[l+1].indexOf(id) > -1) {
              let index = 3;
              if (buttonClass.length > 0) {
                index = 4;
              };
              fileObsSplit[l+1] = fileObsSplit[l+1].replace(oldFileName, newFileName);
              fileObsSplit[l+index] = fileObsSplit[l+index].replace(oldFileName, newFileName);
              let newFile = fileObsSplit.join("\n");
              fs.writeFileSync(obsidianFilename, newFile, "utf-8");
            };
          } else {  // type = "metabutton"
            if (fileObsSplit[l].indexOf("```meta-bind-button") > -1 && fileObsSplit[l+1].indexOf(id) > -1) {
              let index = 4;
              if (metabuttonClass.length > 0) {
                index = 6;
              };
              fileObsSplit[l+1] = fileObsSplit[l+1].replace(oldFileName, newFileName);
              fileObsSplit[l+index] = fileObsSplit[l+index].replace(oldFileName, newFileName);
              let newFile = fileObsSplit.join("\n");
              fs.writeFileSync(obsidianFilename, newFile, "utf-8");
            };
          };
        };

        // updateBacklinksOnDelete - Update projectName.json with new filename 
        fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(fileJsonObject,null,2));
      };
    };
  };

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
  };
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function updateStatusBarItem ●                       │
//  │                                                                              │
//  │                        • Update the Status Bar Item •                        │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function updateStatusBarItem() {
  if (defaultVault === "" || defaultVault === undefined) {
    myStatusBarItem.text = `$(notebook) Set Default Vault/Note`;
    myStatusBarItem.tooltip = 'Configure Obsidian Default Vault and Note';
    myStatusBarItem.command = 'obsidian-md-vsc.set-defaults-global';
  } else {
    myStatusBarItem.text = `$(notebook) ${defaultVault} - ${defaultNoteShort}`;
    myStatusBarItem.tooltip = `Connect to Obsidian\nVault: ${defaultVault}\nNote: ${defaultNoteShort}`;
    myStatusBarItem.command = 'obsidian-md-vsc.connect-with-vault';
  };
  if (vscode.window.activeTextEditor === undefined) {
    myStatusBarItem.hide();
  } else {
    myStatusBarItem.show();
  };
};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                       ● Function setDefaultVaultNote ●                       │
//  │                                                                              │
//  │                       • Set the Default Vault & Note •                       │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function setDefaultVaultNote() {
  
  let vaultNames = [];                                        // Vault Names Array

  // setDefaultVaultNote - Get Obsidian.json Data 
  let vaultDataFile = await readFile(obVaultsJsonPath);       // Read file into memory
  let vaultDataObj = JSON.parse(vaultDataFile.toString());    // Parse json

  // setDefaultVaultNote - Cacheing Map 
  var objMap = new Map(Object.entries(vaultDataObj.vaults));

  // setDefaultVaultNote - Get Vault Selection from User 
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

  // setDefaultVaultNote - Get Vault Selection from User 
  quickpick.onDidAccept(async () => {
    // setDefaultVaultNote - Get Default Obsidian Note From Selected Vault Folder 
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
    // setDefaultVaultNote - Save the Selected Default Vault & Note to Settings 
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
  
  // setDefaultVaultNote - Show the Quickpick 
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
  };

  // connectWithObsidian - Initialize Variables 
  headings = [];   // Need to Clear any Previous Data
  bookmarked = [];
  bookmarkedTitles = [];
  bookmarkedValid = [];
  workspaces = [];
  plugins = [];
  headingsDaily = [];
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
    let message = `Default note '${defaultNoteShort}' was not found. Set Default Vault and Note Now?`;
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
  };
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

  // connectWithObsidian - Get headings From Default Note 
  if (fs.existsSync(pathToNote)) {
    let file = fs.readFileSync(pathToNote,"utf-8");
    let headingRegEx = /^#{1,6} +(.*)$/gm
    while (headingMatch = headingRegEx.exec(file)) {
      headings.push({label: headingMatch[1]});
    };
  } else {
    console.log('%c Obsidian MD VSC v'+ currentVersion+' %c Default note was not found ',consoleTitleCSS,consoleWarningCSS);
    headings=[];
  };

  // connectWithObsidian - Get Bookmarked Notes From Default Vault 
  if (fs.existsSync(pathToBookmarks)) {
    let file = fs.readFileSync(pathToBookmarks,"utf-8");
    const data = JSON.parse(file);
    for (let i = 0; i < data.items.length; i++) {
      // TODO Check for other types here maybe???
      if (data.items[i].type == 'file') {
        let cleanTitle = data.items[i].path.split(/[/\\]+/).pop();
        bookmarked.push({title: data.items[i].title || cleanTitle, path: data.items[i].path, subpath: data.items[i].subpath || '', ctime: data.items[i].ctime});
      };
    };
  } else {
    console.log('%c Obsidian MD VSC v'+ currentVersion+' %c No bookmarked files were found ',consoleTitleCSS,consoleWarningCSS);
    bookmarked=[];
  };

  // connectWithObsidian - Get Workspaces From Default Vault 
  if (fs.existsSync(pathToWorkspaces)) {
    let file = fs.readFileSync(pathToWorkspaces,"utf-8");
    const data = JSON.parse(file);
    workspaces.push(Object.keys(data.workspaces));
    workspaces = workspaces[0];
  } else {
    console.log('%c Obsidian MD VSC v'+ currentVersion+' %c No workspaces were found ',consoleTitleCSS,consoleWarningCSS);
    workspaces=[];
  };

  // connectWithObsidian - Get Plugins From Default Vault 
  if (fs.existsSync(pathToPlugins)) {
    let file = fs.readFileSync(pathToPlugins,"utf-8");
    const data = JSON.parse(file);
    for (let i = 0; i < data.length; i++) {
      plugins.push(data[i]);
    };
  } else {
    console.log('%c Obsidian MD VSC v'+ currentVersion+' %c No plugins were found ',consoleTitleCSS,consoleWarningCSS);
   plugins=[];
  };

  // connectWithObsidian - Get Daily Note Name Format 
  let dailyName = "YYYY-MM-DD";
  let dailyFolder = "Daily";
  if (fs.existsSync(pathToDailyJson)) {
    let file = fs.readFileSync(pathToDailyJson,"utf-8");
    let dailyData = JSON.parse(file);
    dailyName = dailyData.format || "YYYY-MM-DD";
    dailyFolder = dailyData.folder || "Daily";
  };
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
  dailyNotePathFilename = path.join(defaultVaultPath, dailyFolder, dailyName+'.md');

  // connectWithObsidian - Get headings From Daily Note 
  if (fs.existsSync(dailyNotePathFilename)) {
    let file = fs.readFileSync(dailyNotePathFilename,"utf-8");
    let headingRegEx = /^#{1,6} +(.*)$/gm
    while (headingMatch = headingRegEx.exec(file)) {
      headingsDaily.push({label: headingMatch[1]});
    };
  } else {
    console.log('%c Obsidian MD VSC v'+ currentVersion+' %c Todays daily note not found ',consoleTitleCSS,consoleWarningCSS);
    headingsDaily=[];
  };

  // connectWithObsidian - Prompt User with Root Choices 
  let options = {
    placeHolder: "How would you like to connect to Obsidian?",
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
  };
  let rootLabels = [{label: 'Open in Obsidian...'},{label: 'Create New...'},{label: 'Daily Note...'},{label: `Send to default note: '${defaultNoteShort}'...`},{label: `Open default note: '${defaultNoteShort}' in VSCode`},{label: `Open vault: '${defaultVault}' in VSCode`},{label: `Verify/Delete project '${vscode.workspace.name}' backlinks`}];
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
  } else if (pick.label === `Send to default note: '${defaultNoteShort}'...`) {
    commandSendto();
    return;
  } else if (pick.label === `Open default note: '${defaultNoteShort}' in VSCode`) {
    // connectWithObsidian - Open note: ${defaultNote} in VSCode 
    obURI = `vscode://file/${pathToNote}`;
    vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    return;
  } else if (pick.label === `Open vault: '${defaultVault}' in VSCode`) {
    // connectWithObsidian - Open vault: '${defaultVault}' in VSCode 
    obURI = `vscode://file/${defaultVaultPath}/`;
    vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    return;
  } else {
    // connectWithObsidian - Verify/Delete project 'ProjectName' backlinks 
    commandVerifyDeleteBacklinks();
    return;
  };
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
  openPicks.push({label: `Open default note '${defaultNoteShort}'`});
  if (headings.length > 0) {
    openPicks.push({label: `Open to heading in default note: '${defaultNoteShort}'`});
  }
  if (bookmarked.length > 0) {
    openPicks.push({label: `Open default vault: '${defaultVault}' bookmarked note...`});
  }
  if (workspaces.length > 0) {
    openPicks.push({label: 'Open workspace...'});
  }
  
  let options = {
    placeHolder: "How would you like to open Obsidian?",
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
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
    case `Open default note '${defaultNoteShort}'`:
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;

    // commandOpen - Open to heading 
    case `Open to heading in default note: '${defaultNoteShort}'`:
      options = {
        placeHolder: "Select heading to open in Obsidian",
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
      };
      pick = await vscode.window.showQuickPick(headings, options);
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
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
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
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
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
  };
  if (fs.existsSync(defaultNotePathFilename)) {
    openPicks.push({label: `Create PDF from default note: ${defaultNoteShort}`});
  };
  if (fs.existsSync(dailyNotePathFilename)) {
    openPicks.push({label: `Create PDF from daily note: ${dailyNoteFilename}`});
  };

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

    // commandCreate - Create new note 
    case `Create PDF from default note: ${defaultNoteShort}`:
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&commandid=workspace%253Aexport-pdf`;
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));

    // commandCreate - Create new note 
    case `Create PDF from daily note: ${dailyNoteFilename}`:
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${dailyNoteFilename}&commandid=workspace%253Aexport-pdf`;
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));

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
//  let linkTitle = "";
//  let buttonTitle = "";
  let docPath = "";
  let vscodeUri = "";

  // commandDaily - Initialize VSCode Backlinks 
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    lineNumber = activeEditor.selection.active.line+1;
    columnNumber = activeEditor.selection.active.character+1;
    docPath = vscode.window.activeTextEditor.document.uri.path;
    vscodeUri = `vscode://file${docPath}:${lineNumber}`;
  }


  // commandDaily - Prompt User with Daily Choices 
  openPicks.push({label: `Create/Open daily note: ${dailyNoteFilename}`});
  if (headingsDaily.length > 0) {
    openPicks.push({label: `Open to heading in daily note: ${dailyNoteFilename}`});
    openPicks.push({label: 'Prepend to heading...'});
    openPicks.push({label: 'Append to heading...'});
  }

  // commandDaily - Prompt User with Daily Note Command Choices 
  dailyPrependAppendCommands.push('Insert text', );
  if (currentSelection != "") {
    dailyPrependAppendCommands.push('Insert selected text');
    dailyPrependAppendCommands.push('Insert selected text as inline code block');
    dailyPrependAppendCommands.push('Insert selected text as fenced code block');
  }
  dailyPrependAppendCommands.push('Insert comment');
  dailyPrependAppendCommands.push('Insert unnumbered list item');
  dailyPrependAppendCommands.push('Insert numbered list item');
  dailyPrependAppendCommands.push('Insert blockquote');
  dailyPrependAppendCommands.push('Insert task');
  dailyPrependAppendCommands.push('Insert Callout');
  if (lineNumber != "") {
    dailyPrependAppendCommands.push('Insert VSCode backlink');
    if (plugins.includes("buttons")) {
      dailyPrependAppendCommands.push('Insert VSCode backlink button (Buttons plugin)');
    }
    if (plugins.includes("obsidian-meta-bind-plugin")) {
      dailyPrependAppendCommands.push('Insert VSCode backlink button (Meta Bind plugin)');
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
    // commandDaily - Open to heading in daily note 
    case `Open to heading in daily note: ${dailyNoteFilename}`:
      options = {
        placeHolder: "Select daily note heading to open in Obsidian",
        title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
      };
      pick = await vscode.window.showQuickPick(headingsDaily, options);
      // commandDaily - User Canceled 
      if (!pick) {
        break;
      }
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${pick.label}`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
      break;

    // commandDaily - Prepend & Append to daily note heading 
    case 'Prepend to heading...':
    case 'Append to heading...':
      options = {
        placeHolder: "Select daily note heading to insert item to",
        title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
      };
      let headingPick = await vscode.window.showQuickPick(headingsDaily, options);
      // commandDaily - User Canceled 
      if (!headingPick) {
        break;
      }
      options = {
        placeHolder: `Select item to insert in daily note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
        title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
      };
      let dailyCommandPick = await vscode.window.showQuickPick(dailyPrependAppendCommands, options);
      // commandDaily - User Canceled 
      if (!dailyCommandPick) {
        break;
      }
      let command = dailyCommandPick
      switch (command) {
        // commandDaily - Insert text to daily note heading 
        case 'Insert text':
          options = {
            placeHolder: `Enter text to insert in daily note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
            prompt: "Eg. # Heading 1",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newText = await vscode.window.showInputBox(options);
          if (newText != undefined) { 
            if (newText != "") {
              vscode.env.clipboard.writeText(newText);
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
            break;
          }

        // commandDaily - Insert Selected Text to Daily note heading 
        case 'Insert selected text':
          vscode.env.clipboard.writeText(currentSelection);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          break;

      // commandDaily - Insert Selected Text Inline Code Block to Daily note heading 
      case 'Insert selected text as inline code block':
        let inlineCodeBlock = '`'+currentSelection+'`'
        vscode.env.clipboard.writeText(inlineCodeBlock);
          if (pick.label == 'Prepend to heading...') {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          } else {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          }
        break;

      // commandDaily - Insert Selected Text Fenced Code Block to note ${defaultNote} heading 
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
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
        }
        break;

        // commandDaily - Insert comment to daily note heading 
        case 'Insert comment':
          options = {
            placeHolder: `Enter comment text to insert in daily note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
            prompt: "Eg. TODO Something",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newComment = await vscode.window.showInputBox(options);
          if (newComment != undefined) { 
            if (newComment != "") {
              newComment = '%% '+newComment+' %%'
              vscode.env.clipboard.writeText(newComment);
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;

        // commandDaily - Insert unnumbered list item to daily note heading 
        case 'Insert unnumbered list item':
          options = {
            placeHolder: `Enter list item text to insert in daily note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
            prompt: "The - is not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newUnnumList = await vscode.window.showInputBox(options);
          if (newUnnumList != undefined) { 
            if (newUnnumList != "") {
              newUnnumList = '- '+newUnnumList
              vscode.env.clipboard.writeText(newUnnumList);
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
        
        // commandDaily - Insert numbered list item to daily note heading 
        case 'Insert numbered list item':
          options = {
            placeHolder: `Enter list item text to insert in daily note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
            prompt: "The number is not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newNumList = await vscode.window.showInputBox(options);
          if (newNumList != undefined) { 
            if (newNumList != "") {
              newNumList = '1. '+newNumList
              vscode.env.clipboard.writeText(newNumList);
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
                
        // commandDaily - Insert blockquote to daily note heading 
        case 'Insert blockquote':
          options = {
            placeHolder: `Enter blockquote item text to insert in daily note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
            prompt: "The > symbol is not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let newBlockQuote = await vscode.window.showInputBox(options);
          if (newBlockQuote != undefined) { 
            if (newBlockQuote != "") {
              newBlockQuote = '\n> '+newBlockQuote
              vscode.env.clipboard.writeText(newBlockQuote);
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
        
        // commandDaily - Insert task to daily note heading 
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
            placeHolder: `Enter task item text to insert in Daily Note: '${dailyNoteFilename}', under heading: '${headingPick.label}'`,
            prompt: "The '- [ ]' symbols are not required",
            title: `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`
          };
          let taskText = await vscode.window.showInputBox(options);
          if (taskText != undefined) { 
            if (taskText != "") {
              let taskDef = `- ${taskPick} ${taskText}`
              vscode.env.clipboard.writeText(taskDef);
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;

        // commandDaily - Insert Callout to daily note heading 
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
              if (pick.label == 'Prepend to heading...') {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=prepend`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              } else {
                obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick.label}&clipboard=true&mode=append`
                vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
              }
            }
          }
          break;
          
        // commandDaily - Insert VSCode text backlink to daily note heading 
        case 'Insert VSCode backlink':
          addBacklink(pick.label,headingPick.label,"link","daily",lineNumber,columnNumber,docPath,vscodeUri);
          break;
          
        // commandDaily - Insert VSCode backlink Buttons button to daily note heading 
        case 'Insert VSCode backlink button (Buttons plugin)':
          addBacklink(pick.label,headingPick.label,"button","daily",lineNumber,columnNumber,docPath,vscodeUri);
          break;

          // commandDaily - Insert VSCode backlink Meta Bind button to daily note heading 
        case 'Insert VSCode backlink button (Meta Bind plugin)':
          addBacklink(pick.label,headingPick.label,"metabutton","daily",lineNumber,columnNumber,docPath,vscodeUri);
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
  let docPath = "";
  let vscodeUri = "";

  // commandSendto - Initialize VSCode backlinks 
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
      lineNumber = activeEditor.selection.active.line+1;
      columnNumber = activeEditor.selection.active.character+1;
      docPath = vscode.window.activeTextEditor.document.uri.path
      vscodeUri = `vscode://file${docPath}:${lineNumber}`
  }

  // commandSendto - Prompt user with default note choices 
  openPicks.push({label: `Append new heading to default note: '${defaultNoteShort}'`});
  if (headings.length > 0) {
    openPicks.push({label: 'Prepend to heading...'});
    openPicks.push({label: 'Append to heading...'});
  }

  // commandSendto - Prompt user with default note command choices 
  defaultPrependAppendCommands.push('Insert text');
  if (currentSelection != "") {
    defaultPrependAppendCommands.push('Insert selected text');
    defaultPrependAppendCommands.push('Insert selected text as inline code block');
    defaultPrependAppendCommands.push('Insert selected text as fenced code block');
  }
  defaultPrependAppendCommands.push('Insert comment');
  defaultPrependAppendCommands.push('Insert unnumbered list item');
  defaultPrependAppendCommands.push('Insert numbered list item');
  defaultPrependAppendCommands.push('Insert blockquote');
  defaultPrependAppendCommands.push('Insert task');
  defaultPrependAppendCommands.push('Insert Callout');
  if (lineNumber != "") {
    defaultPrependAppendCommands.push('Insert VSCode backlink');
    if (plugins.includes("buttons")) {
      defaultPrependAppendCommands.push('Insert VSCode backlink button (Buttons plugin)');
    };
    if (plugins.includes("obsidian-meta-bind-plugin")) {
      defaultPrependAppendCommands.push('Insert VSCode backlink button (Meta Bind plugin)');
    };
  };

  let options = {
    placeHolder: `Send to note '${defaultNoteShort}' in Obsidian`,
    title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
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
    // commandSendto - Append new heading to default note 
    case `Append new heading to default note: '${defaultNoteShort}'`:
      options = {
        placeHolder: `Select new heading size to create in note '${defaultNoteShort}'`,
        title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
      };
    let headingSizePick = await vscode.window.showQuickPick(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'], options);
    // commandSendto - User Canceled 
    if (!headingSizePick) {
      break;
    }
    options = {
      placeHolder: `Enter new heading text to insert in default note: '${defaultNoteShort}'`,
      prompt: "Eg. Sent from VSCode (Do not include the #'s)",
      title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
    };
    let newHeadingText = await vscode.window.showInputBox(options);
    if (newHeadingText == undefined || "") {
      break;
    };
    let newHeadingString = "\n";
    switch (headingSizePick) {
      case 'H1':
        newHeadingString += '# '
        break;
      case 'H2':
        newHeadingString += '## '
        break;
      case 'H3':
        newHeadingString += '### '
        break;
      case 'H4':
        newHeadingString += '#### '
        break;
      case 'H5':
        newHeadingString += '##### '
        break;
      case 'H6':
        newHeadingString += '###### '
        break;
    };
    newHeadingString += newHeadingText;
    vscode.env.clipboard.writeText(newHeadingString);
    obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&clipboard=true&mode=append`
    vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    break;

    case 'Prepend to heading...':
    case 'Append to heading...':
    options = {
      placeHolder: `Select note '${defaultNoteShort}' heading to insert item to`,
      title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
    };
    let headingPick = await vscode.window.showQuickPick(headings, options);
    // commandSendto - User Canceled 
    if (!headingPick) {
      break;
    }
    options = {
      placeHolder: `Select item to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
      title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
    };
    let defaultCommandPick = await vscode.window.showQuickPick(defaultPrependAppendCommands, options);
    // commandSendto - User Canceled 
    if (!defaultCommandPick) {
      break;
    }
    let command = defaultCommandPick
    switch (command) {
      // commandSendto - Insert text to default note heading 
      case 'Insert text':
        options = {
          placeHolder: `Enter text to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
          prompt: "Eg. # Heading 1",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let newText = await vscode.window.showInputBox(options);
        if (newText != undefined) { 
          if (newText != "") {
            vscode.env.clipboard.writeText(newText);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
          break;
        }

      // commandSendto - Insert Selected Text to default note heading 
      case 'Insert selected text':
        vscode.env.clipboard.writeText(currentSelection);
          if (pick.label == 'Prepend to heading...') {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          } else {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          }
        break;

      // commandSendto - Insert Selected Text Inline Code Block to default note heading 
      case 'Insert selected text as inline code block':
        let inlineCodeBlock = '`'+currentSelection+'`'
        if (inlineCodeBlock.indexOf("\n") !== -1){
          await vscode.window.showWarningMessage("Selection is multi-line text. Use insert fenced code block instead","Ok")
          return;
        }
        vscode.env.clipboard.writeText(inlineCodeBlock);
          if (pick.label == 'Prepend to heading...') {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          } else {
            obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
            vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
          }
        break;

      // commandSendto - Insert Selected Text Fenced Code Block to default note heading 
      case 'Insert selected text as fenced code block':
        options = {
          placeHolder: `Enter optional fenced code block language`,
          prompt: "Eg. 'js' for javascript, just hit enter for none",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let codeLanguage = await vscode.window.showInputBox(options);
        if (codeLanguage != undefined) { 
          let fencedCodeBlock = '\n```'+codeLanguage+'\n'+currentSelection+'\n```'
          vscode.env.clipboard.writeText(fencedCodeBlock);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
        }
        break;

      // commandSendto - Insert comment to default note heading 
      case 'Insert comment':
        options = {
          placeHolder: `Enter comment text to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
          prompt: "Eg. TODO Something",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let newComment = await vscode.window.showInputBox(options);
        if (newComment != undefined) { 
          if (newComment != "") {
            newComment = '%% '+newComment+' %%'
            vscode.env.clipboard.writeText(newComment);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;

      // commandSendto - Insert unnumbered list item to default note heading 
      case 'Insert unnumbered list item':
        options = {
          placeHolder: `Enter list item text to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
          prompt: "The - is not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let newUnnumList = await vscode.window.showInputBox(options);
        if (newUnnumList != undefined) { 
          if (newUnnumList != "") {
            newUnnumList = '- '+newUnnumList
            vscode.env.clipboard.writeText(newUnnumList);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
      
      // commandSendto - Insert numbered list item to default note heading 
      case 'Insert numbered list item':
        options = {
          placeHolder: `Enter list item text to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
          prompt: "The number is not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let newNumList = await vscode.window.showInputBox(options);
        if (newNumList != undefined) { 
          if (newNumList != "") {
            newNumList = '1. '+newNumList
            vscode.env.clipboard.writeText(newNumList);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
              
      // commandSendto - Insert blockquote to defaily note heading 
      case 'Insert blockquote':
        options = {
          placeHolder: `Enter blockquote item text to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
          prompt: "The > symbol is not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let newBlockQuote = await vscode.window.showInputBox(options);
        if (newBlockQuote != undefined) { 
          if (newBlockQuote != "") {
            newBlockQuote = '\n> '+newBlockQuote
            vscode.env.clipboard.writeText(newBlockQuote);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
      
      // commandSendto - Insert task to default note heading 
      case 'Insert task':
        options = {
          placeHolder: `Select task type to insert`,
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let taskPick = await vscode.window.showQuickPick(taskChoices, options);
        // commandSendto - User Canceled 
        if (!taskPick) {
          break;
        }
        taskPick = taskPick.slice(0, 3);
        options = {
          placeHolder: `Enter task item text to insert in default note: '${defaultNoteShort}', under heading: '${headingPick.label}'`,
          prompt: "The '- [ ]' symbols are not required",
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let taskText = await vscode.window.showInputBox(options);
        if (taskText != undefined) { 
          if (taskText != "") {
            let taskDef = `- ${taskPick} ${taskText}`
            vscode.env.clipboard.writeText(taskDef);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;

      // commandSendto - Insert Callout to default note heading 
      case 'Insert Callout':
        options = {
          placeHolder: `Select callout type to insert`,
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let calloutPick = await vscode.window.showQuickPick(calloutChoices, options);
        // commandSendto - User Canceled 
        if (!calloutPick) {
          break;
        }
        options = {
          placeHolder: `Select folding option`,
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
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
          title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
        };
        let calloutTitle = await vscode.window.showInputBox(options);
        if (calloutTitle != undefined) { 
          calloutTitle = ' '+calloutTitle;
          options = {
            placeHolder: `Enter optional callout item content text`,
            prompt: "The optional content text for the callout, leave blank for no content.",
            title: `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`
          };
          let calloutContent = await vscode.window.showInputBox(options);
          if (calloutContent != undefined) { 
            let calloutDef = '\n> [!'+calloutPick+']'+foldingOption+calloutTitle+'\n'
            if (calloutContent != '') {
              calloutDef = calloutDef+'> '+calloutContent+'\n';
            }
            calloutDef = calloutDef+'\n'; // Ensures a blank line below callout
            vscode.env.clipboard.writeText(calloutDef);
            if (pick.label == 'Prepend to heading...') {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=prepend`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            } else {
              obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick.label}&clipboard=true&mode=append`
              vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
            }
          }
        }
        break;
        
      // commandSendto - Insert VSCode backlink to default note heading 
      case 'Insert VSCode backlink':
        addBacklink(pick.label,headingPick.label,"link","default",lineNumber,columnNumber,docPath,vscodeUri);
        break;
        
      // commandSendto - Insert VSCode backlink Buttons button to default note heading 
      case 'Insert VSCode backlink button (Buttons plugin)':
        addBacklink(pick.label,headingPick.label,"button","default",lineNumber,columnNumber,docPath,vscodeUri);
        break;

        // commandSendto - Insert VSCode backlink Meta Bind button to default note heading 
      case 'Insert VSCode backlink button (Meta Bind plugin)':
        addBacklink(pick.label,headingPick.label,"metabutton","default",lineNumber,columnNumber,docPath,vscodeUri);
        break;
    }
  }
};
  

//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                           ● Function addBacklink ●                           │
//  │                                                                              │
//  │             • Add backlink to VSCode source file and Obsidian •              │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
async function addBacklink(prependappend, headingPick, type, destinationFile, lineNumber, columnNumber, docPath, vscodeUri) {

  let ID = Math.round(+new Date()/1000);
  let titleDestDaily = `---=== Vault: ${defaultVault}  -  Daily Note: ${dailyNoteFilename} ===---`;
  let titleDestDef = `---=== Vault: ${defaultVault}  -  Default Note: ${defaultNoteShort} ===---`;
  let titleText = "";
  let backlinkPrefixPick = "";
  let backlinkText = "";
  let options = {};
  let vscLinkText = ``;
  let obsLinkText = ``;
  let obsDocShort = "";

  // addBacklink - Set title text 
  if (destinationFile === "daily") {
    titleText = titleDestDaily;
    obsDocShort = dailyNoteFilename;
  } else if (destinationFile === "default") {
    titleText = titleDestDef;
    obsDocShort = defaultNoteShort;
  } else {
    return; // Cancel if destination file not set
  };

  // addBacklink - Get button class 
  buttonClassPick = "none"; // Default to "none"
  if (type === "button" && buttonClass.length > 0) {
    options = {
      placeHolder: `Select button class to use, Esc for none`,
      title: `${titleText}`
    };
    buttonClassPick = await vscode.window.showQuickPick(buttonClass, options);
    if (buttonClassPick === undefined || buttonClassPick === "") {
      buttonClassPick = "none";
    };
  };

  // addBacklink - Get meta bind button class 
  metabuttonClassPick = "none"; // Default to "none"
  if (type === "metabutton" && metabuttonClass.length > 0) {
    options = {
      placeHolder: `Select button class to use, Esc for none`,
      title: `${titleText}`
    };
    metabuttonClassPick = await vscode.window.showQuickPick(metabuttonClass, options);
    if (metabuttonClassPick === undefined || metabuttonClassPick === "") {
      metabuttonClassPick = "none";
    };
  };

  // addBacklink - Get text prefix 
  options = {
    placeHolder: `Select Backlink prefix, Esc for none`,
    title: `${titleText}`
  };
  backlinkPrefixPick = await vscode.window.showQuickPick(BacklinkPrefix, options);
  if (backlinkPrefixPick === undefined) {
    backlinkPrefixPick = "";
  };

  // addBacklink - Get backlink description text 
  options = {
    placeHolder: "Enter descriptive text for backlink, Esc or leave blank to cancel",
    title: `${titleText}`
  };
  backlinkText = await vscode.window.showInputBox(options);
  if (backlinkText === undefined || backlinkText === "") {
    return;
  };

  // addBacklink - Type "link" 
  if (type === "link") {
      vscLinkText = `${backlinkSeparator} ${backlinkPrefixPick} ${backlinkText} ${backlinkSeparator} File: ${obsDocShort} ${backlinkSeparator} ID: ${ID} ${backlinkSeparator}`;
      obsLinkText = `[${backlinkPrefixPick} ${backlinkText} ${backlinkSeparator} File: ${currentDocumentName} ${backlinkSeparator} ID: ${ID} ${backlinkSeparator}](${vscodeUri})`;

  // addBacklink - Type "button" 
  } else if (type === "button") {
      vscLinkText = `${backlinkSeparator} ${backlinkPrefixPick} ${backlinkText} ${backlinkSeparator} File: ${obsDocShort} ${backlinkSeparator} ID: ${ID} ${backlinkSeparator}`;
      if (buttonClassPick === "none") {
      obsLinkText = `
\`\`\`button
name ${backlinkPrefixPick} ${backlinkText} | File: ${currentDocumentName} | ID: ${ID}
type link
action ${vscodeUri}
\`\`\`
`;
      } else {
      obsLinkText = `
\`\`\`button
name ${backlinkPrefixPick} ${backlinkText} | File: ${currentDocumentName} | ID: ${ID}
type link
class ${buttonClassPick}
action ${vscodeUri}
\`\`\`
`;
      };

  // addBacklink - Type "metabutton" 
  } else if (type === "metabutton") {
      vscLinkText = `${backlinkSeparator} ${backlinkPrefixPick} ${backlinkText} ${backlinkSeparator} File: ${obsDocShort} ${backlinkSeparator} ID: ${ID} ${backlinkSeparator}`;
      if (metabuttonClassPick === "none") {
      obsLinkText = `
\`\`\`meta-bind-button
label: "${backlinkPrefixPick} ${backlinkText} | File: ${currentDocumentName} | ID: ${ID}"
style: primary
action:
  type: open
  link: ${vscodeUri}
\`\`\`
`;
      } else {
      obsLinkText = `
\`\`\`meta-bind-button
label: "${backlinkPrefixPick} ${backlinkText} | File: ${currentDocumentName} | ID: ${ID}"
class: ${metabuttonClassPick}
style: primary
action:
  type: open
  link: ${vscodeUri}
\`\`\`
`;
      };

  // addBacklink - Cancel if type is not defined 
  } else {
    return;
  };

  // • addBacklink - Add the links to Obsidian and info line to VSCode file • 

  // addBacklink - Write Obsidian or default note link text to Clipboard 
  vscode.env.clipboard.writeText(obsLinkText);

  // addBacklink - Write backlink to Obsidian or default note 
  if (destinationFile === "daily") {
    if (prependappend == 'Prepend to heading...') {
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick}&clipboard=true&mode=prepend`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    } else {
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&daily=true&heading=${headingPick}&clipboard=true&mode=append`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    };
  } else {
    if (prependappend == 'Prepend to heading...') {
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick}&clipboard=true&mode=prepend`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    } else {
      obURI = `obsidian://advanced-uri?vault=${defaultVault}&filepath=${defaultNote}&heading=${headingPick}&clipboard=true&mode=append`
      vscode.env.openExternal(vscode.Uri.parse(obURI.replaceAll('#','%23'), true));
    };
  };

  // addBacklink - Write backlink to VSCode 
  const editor = vscode.window.activeTextEditor;
  await editor.edit(editBuilder => {
    editBuilder.replace(new vscode.Range(lineNumber-1, columnNumber-1, lineNumber-1, columnNumber-1), vscLinkText);
    }).catch(err => console.log(`%c Obsidian MD VSC  v'+ currentVersion+' %c ${err} `,consoleTitleCSS,consoleErrorCSS));
  let activeEditor = vscode.window.activeTextEditor;
  activeEditor.document.save();
  
  // addBacklink - Add the backlink to json data file 
  let linkText = `${backlinkPrefixPick} ${backlinkText}`;
  let obsDocPath = "";
  if (destinationFile === "daily") {
    obsDocPath = dailyNotePathFilename;
  } else {
    obsDocPath = defaultNotePathFilename;
  };
  addBacklinkDataFile(ID, type, docPath, obsDocPath, lineNumber-1, columnNumber-1, linkText);

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                      ● Function splitOldBacklinksJson ●                      │
//  │                                                                              │
//  │                • Split Backlinks.json into projectName.json •                │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function splitOldBacklinksJson() {

  // splitOldBacklinksJson - Return if projectName.json already generated 
  if (fs.existsSync(globalStorageProjectFilenamePath)) {
    return;
  };

  // splitOldBacklinksJson - Initialize Json/variables and load old data file 
  let projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  let dataFileJsonArray = [];
  let dataFileJsonArrayReduced = [];
  let projectFileJsonArray = [];
  let projectFileJsonArrayAmmended = [];
  let file = fs.readFileSync(globalStorageFilenamePath,"utf-8");
  dataFileJsonArray = JSON.parse(file);

  // splitOldBacklinksJson - Filter out this projects backlinks 
  dataFileJsonArrayReduced = dataFileJsonArray.filter(item=>item.vscodePath.indexOf(projectPath) === -1);
  projectFileJsonArray = dataFileJsonArray.filter(item=>item.vscodePath.indexOf(projectPath) !== -1);
  if (projectFileJsonArray.length === 0) {
    fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(projectFileJsonArray,null,2));
    return; // Nothing else to do if no backlinks
  };

  // splitOldBacklinksJson - Update Json keys/values for future use 
  for (let i = 0; i < projectFileJsonArray.length; i++) {
    let updatedObject = {
      "id": 0,
      "type": "",
      "vscodePath": "",
      "obsidianPath": "",
      "lineNumber": 0,
      "columnNumber": 0,
      "backlinkText": "",
      "futureOne": "",
      "futureTwo": "",
      "futureThree": 0,
      "futureFour": 0
    };
    updatedObject.id = projectFileJsonArray[i].id;
    updatedObject.type = projectFileJsonArray[i].type;
    updatedObject.vscodePath = projectFileJsonArray[i].vscodePath;
    updatedObject.obsidianPath = projectFileJsonArray[i].obsidianPath;
    updatedObject.lineNumber = projectFileJsonArray[i].lineNumber;
    updatedObject.columnNumber = 0;
    updatedObject.backlinkText = projectFileJsonArray[i].backlinkText;
    updatedObject.futureOne = "";
    updatedObject.futureTwo = "";
    updatedObject.futureThree = 0;
    updatedObject.futureFour = 0;
    projectFileJsonArrayAmmended.push(updatedObject);
  };

  // splitOldBacklinksJson - Save the updated Json files 
  fs.writeFileSync(globalStorageProjectFilenamePath, JSON.stringify(projectFileJsonArrayAmmended,null,2));
  fs.writeFileSync(globalStorageFilenamePath, JSON.stringify(dataFileJsonArrayReduced,null,2));
  if (dataFileJsonArrayReduced.length === 0) {
    fs.unlink(globalStorageFilenamePath, (err) => {
      if (err) console.log(`%c Obsidian MD VSC  v'+ currentVersion+' %c ${err} `,consoleTitleCSS,consoleErrorCSS);
    });
  };

};


//  ╭──────────────────────────────────────────────────────────────────────────────╮
//  │                           ● Function deactivate ●                            │
//  │                                                                              │
//  │                            • Extension Cleanup •                             │
//  ╰──────────────────────────────────────────────────────────────────────────────╯
function deactivate() {}
