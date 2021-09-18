"use strict";

export let persistentDomainsAttributes = ["includeDomains", "excludeDomains"];
export let options = [...persistentDomainsAttributes];

// Restores options stored in chrome.storage.
export async function refreshOptions() {
  let items = await getOptions();
  for (const item of options) {
    if (items[item] != null) document.getElementById(item).value = items[item];
  }
}

// Save options in chrome.storage.
export async function saveOptions() {
  let extensionOptions = {};
  // Get extension options from HTML form
  for (const item of options) {
    let value = document.getElementById(item).value;
    if (value != null) extensionOptions[item] = value;
  }
  // Save extension options to chrome.storage
  await chrome.storage.sync.set(extensionOptions);
  // Update status to let user know options were saved.
  let status = document.getElementById("status");
  status.textContent = "Options saved.";
  setTimeout(() => {
    status.textContent = "";
    window.close();
  }, 750);
}

export async function getOptions() {
  // Get extension options from chrome.storage
  let extensionOptions = {};
  // Read storage
  let items = await new Promise((resolve) => {
    chrome.storage.sync.get(
      null, // get all data
      (data) => {
        resolve(data);
      }
    );
  });
  // Init options object
  for (const item of options) {
    extensionOptions[item] = items[item];
  }

  return extensionOptions;
}

export async function getPersistentDomains() {
  // Create include/exclude domains arrays from chrome.storage
  let persistentDomains = {};
  let extensionOptions = await getOptions();
  // Convert text option persistentDomains into an array
  for (let attribute of persistentDomainsAttributes) {
    if (extensionOptions[attribute] == null) {
      persistentDomains[attribute] = [];
    } else {
      persistentDomains[attribute] = extensionOptions[attribute]
        .split(/\s+/)
        .filter(Boolean);
    }
  }

  return persistentDomains;
}
