<!--
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
### Updated
-->
# Release Notes

## [1.3.0] 2025-01-09
### Internal Changes
- Replace deprecated(?) obsidian.json usage with Obsidian URI protocol (internal change)
- Update vault connection logic to use URI-based interactions
- Use VS Code file dialogs for vault and note selection instead of reading obsidian.json
- No changes to available commands or user interface

<!-- ## [v-inc] ${YEAR4}-${MONTHNUMBER}-${DATE} -->

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


For a full list of changes, please see the projects [Changelog](CHANGELOG.md) file.

I hope you enjoy using the Extension, and if you find any bugs, or would like to see a certain feature added, please feel free to contact me.

Enjoy! William
