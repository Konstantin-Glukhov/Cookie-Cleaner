"use strict";

import { removeCookies } from "./cookies.js";
import { getPersistentDomains } from "./storage.js";

let notAndroid = !/Android/.test(window.navigator.userAgent);
let clearCookieButton = document.getElementById("Yes");
let backToBrowsingButton = document.getElementById("No");
let reloadButton = document.getElementById("reload");
let headerElement = document.getElementById("header");
let msgElement = document.getElementById("message");
let tab;

clearCookieButton.addEventListener("click", async () => {
  await removeThisTabCookies();
  window.localStorage.clear();
});

reloadButton.addEventListener("click", () => {
  msgElement.innerHTML = "";
  reloadButton.hidden = true;
  backToBrowsingButton.hidden = true;
  headerElement.innerHTML = "Reloading tab...";
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (info.status === "complete" && tabId === tab.id) {
      chrome.tabs.onUpdated.removeListener(listener);
      window.close();
    }
  });
  chrome.tabs.reload();
});

backToBrowsingButton.addEventListener("click", async () => {
  window.close();
});

async function removeThisTabCookies() {
  clearCookieButton.hidden = true;
  backToBrowsingButton.hidden = true;
  headerElement.innerHTML = "Removing cookies...";

  let { includeDomains, excludeDomains } = await getPersistentDomains();
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url = new URL(tab.url).hostname;
  if (!excludeDomains.includes(url))
    includeDomains.push(new URL(tab.url).hostname);

  let removedCookiesArray = await removeCookies(includeDomains);

  backToBrowsingButton.hidden = false;
  backToBrowsingButton.focus();
  if (!removedCookiesArray.length) {
    let msg = "No cookies to remove";
    console.log(msg);
    headerElement.innerHTML = msg + "<br><br>";
    return;
  }

  // Report the tasks statistics
  for (let cookie of removedCookiesArray) {
    console.log("Cleared cookie for", cookie.url, cookie.name);
  }
  let msg = `Deleted ${removedCookiesArray.length} cookies`;
  console.log(msg);
  headerElement.innerHTML = msg + " for:";
  let uniqueURL = [
    ...new Set(
      removedCookiesArray.map((cookie) =>
        new URL(cookie.url).hostname.replace(/^\./, "")
      )
    ),
  ];
  msgElement.innerHTML = uniqueURL.join("<br>");

  if (notAndroid) reloadButton.hidden = false;
}
