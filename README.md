![](https://img.shields.io/visual-studio-marketplace/v/willasm.obsidian-md-vsc)
![](https://img.shields.io/visual-studio-marketplace/d/willasm.obsidian-md-vsc)
![](https://img.shields.io/visual-studio-marketplace/r/willasm.obsidian-md-vsc)
![](https://img.shields.io/visual-studio-marketplace/release-date/willasm.obsidian-md-vsc)
![](https://img.shields.io/visual-studio-marketplace/last-updated/willasm.obsidian-md-vsc)

# Obsidian MD for VSCode
Connect to Obsidian directly from within Visual Studio Code.

> Obsidian is a powerful and extensible knowledge base
that works on top of your local folder of plain text files. You can get more information and download it from [here](https://obsidian.md/)

## Whats New v1.3.0
This is a much improved version with complete rewrites of most of the code. The update fixes some issues and adds some new features and improves overall performance.

### List of significant changes
- Added - Menu command "Create PDF from default note: ${defaultNote}"
- Added - Menu command "Create PDF from daily note: ${dailyNoteFilename}"
- Added - Now supports Meta Bind Buttons as well as Buttons plugins for Obsidian
- Changed - Multiple selectable classes now supported for buttons
- Changed - All 'header' text references to more proper 'heading'
- Changed - Backlinks are stored on a per project basis
  - These are automatically created with project backlinks from the old data file
  - Menu command `Verify/Delete Backlinks (Project)` and `Verify/Delete Backlinks (Global)` combined to `Verify/Delete project '${ProjectName}' backlinks`
- Changed - Backlinks json data file expanded for future updates
- Removed - Enumeration of characters for backlink separator
  - The extra characters could possibly not render on all systems
  - Now uses a single character configured in extension settings (Default | pipe character)
- Fixed - Incorrect handling of Obsidian json settings files that didn't exist (bookmarks.json, daily-notes.json, etc)
- Fixed - Menu item "Open vault (Default vault) in VSCode executing wrong command"
- Fixed - Menu item `Insert selected text as inline code block` was accepting mult-line text
- Updated - README.md (this document)

## Features
- Open Obsidian saved Workspaces.
- Open your vaults Bookmarked notes.
- Settings can be saved to workspace which overrides the global settings
- Send information directly to your defined default note.
- Send information directly to your daily note.
- Send Text, Selected text, Selected text as inline code block, Selected text as fenced code block, Comment, Unnumbered list item, Numbered list item, Blockquotes, Tasks, Callouts, VSCode backlink, VSCode backlink button (Buttons plugin), VSCode backlink button (Meta Bind plugin), to your Default and Daily notes.
- Open your default note in Visual Studio Code.
- Open your entire vault in Visual Studio Code.
- Send [Backlinks](#backlinks) to your projects code files.

## Requirements

- [Obsidian.MD](https://obsidian.md/) A second brain, for you, forever.

- [Obsidian Advanced Uri](https://github.com/Vinzent03/obsidian-advanced-uri) Plugin, you can find the documentation [here](https://vinzent03.github.io/obsidian-advanced-uri/). This is required to communicate with Obsidian from Visual Studio Code.

- [The Core plugin - Daily notes](https://help.obsidian.md/plugins/daily-notes) must have its setting `New file location` set to the folder where you keep your daily notes. This is required by the plugin to find todays daily note. If the `Date format` is not set it will default to `YYYY-MM-DD`.

## Not required but recommended
- [Obsidian Buttons](https://github.com/shabegom/buttons) Plugin. For creating Visual Studio Code backlink buttons.

and/or

- [Obsidian Meta Bind](https://github.com/mProjectsCode/obsidian-meta-bind-plugin) Plugin. For creating Visual Studio Code backlink buttons.

## Settings.json

- Default Obsidian Vault to Use - Sets the default vault to connect with.
- Path to Default Obsidian Vault to Use - Path to your default vault
- Default Obsidian Note to Use - The default note within the default vault to connect with.
- Prefix for Backlink Description - Optional prefix for backlinks description
  - Feel free to add, edit or remove the defaults to suit your needs
  - Tip: Adding `//` to the start of the prefix will insert a commented backlink (language dependant) Eg `// TODO:`
- Button classes for use with Buttons plugin (optional) - Classes to use with the Buttons plugin
- Button classes for use with Meta Bind plugin (optional) - Classes to use with the Meta Bind plugin
- Default seperator character used in Backlinks - Backlink text separator (Default is `|` pipe character)

## Commands
The following commands are available from the command pallette: (Windows: CTRL+Shift+P or F1) (Mac: CMD+Shift+P)

#### Obsidian MD: Connect with Obsidian (Default Hotkey - ALT+O)
This is the command to open the menu system to communicate with Obsidian. See the [The command Structure Outline](#the-command-structure-outline) for details. If this is the first time it is run, and the default vault and default note are not defined in the settings, the command `Obsidian MD: Set Default Vault and Note (Global)` will be run prompting you for the default vault and default note. These are required by the extension to operate so please set them when prompted.

#### Obsidian MD: Set Default Vault and Note (Global)
Sets your default vault and the default note within that vault in your global settings.json file.

#### Obsidian MD: Set Default Vault and Note (Workspace)
Sets your default vault and the default note within that vault in your workspace settings.json file. This will override your global settings allowing you to define a specific vault and default note on a per project basis.

## Backlinks
Backlinks are links created in your default note or daily note in Obsidian that link back to a specific line within any file in your Visual Studio Code project. When inserting a backlink you will first be prompted for a decription prefix (These can be edited in the extensions settings). You can press Esc for no prefix if you wish. Next you will be prompted for a text desription which will be used as the text for the backlink (This is required). The backlinks should be placed inside a comment so as to not cause code errors.

- Backlink buttons are supported if you have the Buttons or Meta Bind plugins installed
  - You can add multiple classes to choose from for the buttons in the extensions settings
- Backlinks in Obsidian are automatically updated when saving a file in Visual Studio Code
  - The line number is updated to the correct location if it has moved to a new line
  - The text description is updated if it has changed
- Backlinks are automatically removed from your default note and/or daily note in Obsidian when deleting a file in Visual Studio Code that had backlinks
- Backlinks in Obsidian are automatically updated when renaming a file in Visual Studio Code
  - The File: "filename" in the backlink text will be updated to the new file name

#### Example of Backlinks Text Inserted Into Obsidian Default/Daily Note Files

Link:

`[NOTE: Some Description | File: Example.txt | ID: 1701328121](vscode://file/c:/programming/code/my_code/vscode/test-folder/Example.txt:1)`

Button:

```button
name NOTE: Some Description | File: Example.txt | ID: 1701325515
type link
action vscode://file/c:/programming/code/my_code/vscode/test-folder/Example.txt:1
```
Button with Class Defined:

```button
name NOTE: Some Description | File: Example.txt | ID: 1701325515
type link
class buttonclassname
action vscode://file/c:/programming/code/my_code/vscode/test-folder/Example.txt:1
```

In the examples you are free to edit the prefix (NOTE:) and the description (Some Description).

Do **Not** edit the `File: Example.txt` portion. That will be updated automatically if the file is renamed.

Do **Not** edit the `ID: 1701328121` portion. This is a unique Identifier used by the extension to maintain the Backlink.

Do **Not** edit the `File: vscode://file...` portion. This is the actual link to the Visual Studio Code files line for the Backlink. This is maintained by the extension.

#### Examples of Backlinks Text Inserted Into Visual Studio Code Files

`| NOTE: Some Description | File: obsidian-md-vsc | ID: 1701328992 |` (Default Note)

`| NOTE: Some Description | File: 2025-07-26 | ID: 1701330039 |` (Daily Note)

#### Example Backlinks Screenshot from Obsidian

![Backlink Examples](/images/BacklinkExamples.png)

## Status Bar Button Screenshots
Without Default Vault and Note set... (will run the command `Obsidian MD: Set Default Vault and Note (Global)`)

![Status Bar Button No Vault Set](/images/StatusBarButtonNoVault.jpg)

With Default Vault and Note set... (will run the command `Obsidian MD: Connect with Obsidian` (Default Hotkey - ALT+O))

![Status Bar Button With Vault Set](/images/StatusBarButtonWithVault.jpg)

## Command Menu Screenshots
Command Menu Home... To activate, run the command `Obsidian MD: Connect with Obsidian` (Default Hotkey - ALT+O)

![Command Menu Home](/images/ObsidianConnectMenu1.png)

Open in Obsidian Submenu...

![Open in Obsidian Submenu](/images/ObsidianConnectMenu2.jpg)

Daily Note Submenu...

![Daily Note Submenu](/images/ObsidianConnectMenu3.jpg)

Daily Note Prepend/Append to Header Submenu...

![Daily Note Prepend/Append Submenu](./images/ObsidianConnectMenu4.jpg)

## The Command Structure Outline

Note: Some menu commands will only appear under specific conditions, for example...

All the `Insert selected text...` items will not be shown when no text is selected

- Open in Obsidian...
	- Open Obsidian
	- Open default note (Default Note)
	- Open to heading in default note: (Default Note)
	- Open default: (Default Vault) bookmarked note...
	- Open workspace...
- Create New...
	- Create new note
	- Create new note from from current file or selection
	- Create PDF from default note: (Default note)
	- Create PDF from daily note: (Daily note)
- Daily Notes...
	- Create/Open daily note: (Daily note name)
	- Open to header in daily note: (Daily note name)
	- Prepend to heading...
	  - (Select heading)
  		- Insert text
  		- Insert selected text (Will only appear when text is selected)
  		- Insert selected text as inline code block (Will only appear when text is selected)
  		- Insert selected text as fenced code block (Will only appear when text is selected)
  		- Insert comment
  		- Insert unnumbered list item
  		- Insert numbered list item
  		- Insert blockquote
  		- Insert task
  		- Insert Callout
  		- Insert VSCode backlink
  		- Insert VSCode backlink button (Buttons Plugin) (Will only appear when Buttons plugin is installed)
  		- Insert VSCode backlink button (Meta Bind Plugin) (Will only appear when Meta Bind plugin is installed)
	- Append to heading...
	  - (Select heading)
  		- Insert text
  		- Insert selected text (Will only appear when text is selected)
  		- Insert selected text as inline code block (Will only appear when text is selected)
  		- Insert selected text as fenced code block (Will only appear when text is selected)
  		- Insert comment
  		- Insert unnumbered list item
  		- Insert numbered list item
  		- Insert blockquote
  		- Insert task
  		- Insert Callout
  		- Insert VSCode backlink
  		- Insert VSCode backlink button (Buttons Plugin) (Will only appear when Buttons plugin is installed)
  		- Insert VSCode backlink button (Meta Bind Plugin) (Will only appear when Meta Bind plugin is installed)
- Send to note (Default Note)...
  - Append new heading to default note: (Default Note)
  - Prepend to heading...
    - (Select heading)
  		- Insert text
  		- Insert selected text (Will only appear when text is selected)
  		- Insert selected text as inline code block (Will only appear when text is selected)
  		- Insert selected text as fenced code block (Will only appear when text is selected)
  		- Insert comment
  		- Insert unnumbered list item
  		- Insert numbered list item
  		- Insert blockquote
  		- Insert task
  		- Insert Callout
  		- Insert VSCode backlink
  		- Insert VSCode backlink button (Buttons Plugin) (Will only appear when Buttons plugin is installed)
  		- Insert VSCode backlink button (Meta Bind Plugin) (Will only appear when Meta Bind plugin is installed)
  - Append to header...
    - (Select heading)
  		- Insert text
  		- Insert selected text (Will only appear when text is selected)
  		- Insert selected text as inline code block (Will only appear when text is selected)
  		- Insert selected text as fenced code block (Will only appear when text is selected)
  		- Insert comment
  		- Insert unnumbered list item
  		- Insert numbered list item
  		- Insert blockquote
  		- Insert task
  		- Insert Callout
  		- Insert VSCode backlink
  		- Insert VSCode backlink button (Buttons Plugin) (Will only appear when Buttons plugin is installed)
  		- Insert VSCode backlink button (Meta Bind Plugin) (Will only appear when Meta Bind plugin is installed)
- Open default note: (Default Note) in VSCode
- Open vault: (Default Vault) in VSCode
- Verify/Delete project ProjectName backlinks

## Release Notes
See the [Release Notes](RELEASE.md) for details.










