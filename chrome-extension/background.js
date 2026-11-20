// Opens Crisis Connection directly inside Chrome's Side Panel when clicking the toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[CrisisConnection Extension] SidePanel error:', error));
