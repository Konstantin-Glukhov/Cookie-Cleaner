import { getPersistentOptions } from "./storage.js";
let storageOptions;
let formOptions;
let storageValues = {};
let htmlOptions = {};
var noChange = true;
let optoinsSaved = false;
const saveButton = document.getElementById("save");
const cancelButton = document.getElementById("cancel");
const statusMsg = document.getElementById("status");
const initialStatusMsg = statusMsg.textContent;
document.addEventListener("DOMContentLoaded", initInputForm);
window.addEventListener("beforeunload", saveOrWarn);
saveButton.addEventListener("click", saveOptions);
cancelButton.addEventListener("click", () => { window.close(); });
function highlightSaveButton() {
    if (compareInputWithStorage()) {
        saveButton.classList.remove('highlight');
        noChange = true;
        return;
    }
    noChange = false;
    saveButton.classList.add('highlight');
}
// Update extension options HTML form from chrome.storage.
async function initInputForm() {
    // Populate global variable with storage values to detect changes at a later time
    storageOptions = await getPersistentOptions();
    for (const option in storageOptions) {
        // save HTML input forms as a map
        let inputElement = document.getElementById(option);
        // update input form with the storage value
        const optionValue = storageOptions[option];
        inputElement.value = Array.from(optionValue).join("\n");
        // Preserver input and storage option value as a string
        htmlOptions[option] = inputElement;
        storageValues[option] = inputElement.value;
        // Detect a change in the form and highlight the Save button
        inputElement.addEventListener("input", highlightSaveButton, { once: false });
    }
}
function compareInputWithStorage() {
    for (let [option, input] of Object.entries(htmlOptions))
        if (input.value === storageValues[option])
            return true;
    return false;
}
function saveOrWarn(e) {
    if (optoinsSaved)
        return;
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
async function saveOptions() {
    if (noChange) {
        statusMsg.textContent = "No change";
        setTimeout(() => {
            statusMsg.textContent = initialStatusMsg;
        }, 750);
        return;
    }
    // Convert HTML input form to Options
    let options = {};
    for (const option in htmlOptions) {
        options[option] = wordsToUniqueArray(htmlOptions[option].value);
        // Check for validity of manually entered exclusion regex
        for (let exclude of options[option]) {
            try {
                RegExp(exclude);
            }
            catch (error) {
                statusMsg.textContent = error ?? "";
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
function wordsToUniqueArray(s, cmp) {
    // Split string by white space into an array of unique elements
    return [...new Set(s.split(/\s+/).filter(Boolean))].sort(cmp);
}
function areSetsEqual(a, b) {
    return a.size === b.size && [...a].every(value => b.has(value));
}
function areArraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
