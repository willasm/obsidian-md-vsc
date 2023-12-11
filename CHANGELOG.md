# Change Log

<!-- ## [v-inc] ${YEAR4}-${MONTHNUMBER}-${DATE} -->

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