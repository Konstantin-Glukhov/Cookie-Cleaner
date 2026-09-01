import { Options, getPersistentOptions } from "./storage.js";

let storageOptions: Options;
let formOptions: Options;

let storageValues: {[key: string]: string} = {};
let htmlOptions: {[key: string]: HTMLInputElement} = {};
var noChange: boolean = true;
let optoinsSaved: boolean = false;

const saveButton = document.getElementById("save") as HTMLButtonElement;
const cancelButton = document.getElementById("cancel") as HTMLButtonElement;
const statusMsg = document.getElementById("status") as HTMLSpanElement;
const initialStatusMsg = statusMsg.textContent;

document.addEventListener("DOMContentLoaded", initInputForm);
window.addEventListener("beforeunload", saveOrWarn);
saveButton.addEventListener("click", saveOptions);
cancelButton.addEventListener("click", () => { window.close(); });

function highlightSaveButton(): void {
  if (compareInputWithStorage()) {
    saveButton.classList.remove('highlight');
    noChange = true;
    return;
  }
  noChange = false;
  saveButton.classList.add('highlight');
}

// Update extension options HTML form from chrome.storage.
async function initInputForm(): Promise<void> {
  // Populate global variable with storage values to detect changes at a later time
  storageOptions = await getPersistentOptions();
  for (const option in storageOptions) {
    // save HTML input forms as a map
    let inputElement = document.getElementById(option) as HTMLInputElement;
    // update input form with the storage value
    const optionValue: string[] = storageOptions[option];
    inputElement.value = Array.from(optionValue).join("\n");
    // Preserver input and storage option value as a string
    htmlOptions[option] = inputElement;
    storageValues[option] = inputElement.value;
    // Detect a change in the form and highlight the Save button
    inputElement.addEventListener("input", highlightSaveButton, {once: false});
  }
}

function compareInputWithStorage(): boolean {
  for (let [option, input] of Object.entries(htmlOptions))
    if (input.value === storageValues[option])
      return true;
  return false;
}

function saveOrWarn(e: BeforeUnloadEvent): void {
  if (optoinsSaved) return;
  if (noChange)
    return;
  // Compare input forms values with storage values
  if (!compareInputWithStorage()) {
    // The browser ignores the actual value of e.returnValue
    // for security reason, so it can be set to anything.
    e.returnValue = "OK";
    return;
  }
}

// Save extension options HTML form to chrome.storage.
async function saveOptions(): Promise<void> {
  if (noChange) {
    statusMsg.textContent = "No change";
    setTimeout(() => {
      statusMsg.textContent = initialStatusMsg;
    }, 750);
    return;
  }
  // Convert HTML input form to Options
  let options: Options = {};
  for (const option in htmlOptions) {
    options[option] = wordsToUniqueArray(htmlOptions[option].value);
    // Check for validity of manually entered exclusion regex
    for (let exclude of options[option]) {
      try {
        RegExp(exclude);
      } catch(error) {
        statusMsg.textContent = error as string ?? "";
        return;
      }
    }
  }
  statusMsg.textContent = "Saving...";
  // Save extension options to chrome.storage
  await chrome.storage.sync.set(options);
  // Update status to let user know options were saved.
  optoinsSaved = true;
  setTimeout(() => {
    statusMsg.textContent = "Saved";
    window.close();
  }, 750);
}

function wordsToUniqueArray(s: string, cmp?: (a: string, b: string) => number): string[] {
  // Split string by white space into an array of unique elements
  return [...new Set(s.split(/\s+/).filter(Boolean))].sort(cmp);
}

function areSetsEqual(a: Set<any>, b: Set<any>): boolean {
  return a.size === b.size && [...a].every(value => b.has(value));
}

function areArraysEqual(a: any[], b: any[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
