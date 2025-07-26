# Change Log

<!-- ## [v-inc] ${YEAR4}-${MONTHNUMBER}-${DATE} -->

## [1.3.0] 2025-07-26
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

## [1.2.1] 2023-12-18
### Fixed
- Typos in the manifest file

## [1.2.0] 2023-12-11
### Updated
- The backlinks data file used by the extension has added the backlink description text to its data file
  - Note: Your existing backlinks data file will automatically be updated
  - You will need to edit the description text as the process will capture more text than intended
    - Sorry for any convenience but it is necessary to make this change in order to be able to add more features
  - You will be shown a notification when this is completed
- Regular expressions have been updated, should be more accurate

### Added
- If link description is edited in VSCode it will now be updated in the Obsidian files link on file saved
- New setting `BackLink Seperator` - You can now choose between ` | ~ • · ° ¦ § ¥ ¤ º — ¡ « » `
  - Note: Only the `| and ~` are available from the keyboard, the rest are high ASCII characters
- New command `Verify/Delete Backlinks (Project)`
  - Will prompt you with a list of backlinks to current projects files which you can then delete selected backlinks
  - Will delete the backlink from both the VSCode file and the Obsidian file
  - Invalid links (if link text in VSCode or link in Obsidian is deleted/missing) then the prompt item will have `*** Link is Invalid ***` appended - You should delete these when this occurs as the backlink will no longer function
  - You can select multiple backlinks to delete
- New command `Verify/Delete Backlinks (Global)`
  - Will prompt you with a list of all backlinks to all projects files which you can then delete selected backlinks
  - Will delete the backlink from both the VSCode file and the Obsidian file
  - Invalid links (if link text in VSCode or link in Obsidian is deleted/missing) then the prompt item will have `*** Link is Invalid ***` appended - You should delete these when this occurs as the backlink will no longer function
  - You can select multiple backlinks to delete

### Fixed
- Renaming a VSCode file with backlinks to another folder was not handled
- Issue with images not show up in the Marketplace

## [1.1.0] 2023-12-05
### Fixed
- Will no longer allow setting a default note outside of the selected vault
- Default note in subfolders was not fully supported
- Default note file picker selection being cancelled is now handled properly
- Now handles default notes without headers (See added, new command)

### Added
- New Command `Append new header to default note: (Default Note)`


## [1.0.0] 2023-12-02
- Initial release