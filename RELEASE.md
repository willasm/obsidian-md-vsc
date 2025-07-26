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
