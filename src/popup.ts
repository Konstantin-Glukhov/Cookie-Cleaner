import { Options, getPersistentOptions } from "./storage.js";

const isAndroid: boolean = /Android/.test(window.navigator.userAgent);

let cookies: chrome.cookies.Cookie[];
let domainsRecord: Record<string, { count: number; selected: boolean }>;
let selectionWhitelist: Set<string> = new Set();
let persistentWhitelist: string[];
let tab: chrome.tabs.Tab | undefined;

document.addEventListener("DOMContentLoaded", displayCookies);
const clearCookieButton = document.getElementById("Yes") as HTMLButtonElement;
const backToBrowsingButton = document.getElementById("No") as HTMLButtonElement;
const whitelistButton = document.getElementById("whitelist",) as HTMLButtonElement;
const reloadButton = document.getElementById("reload") as HTMLButtonElement;
const headerElement = document.getElementById("header") as HTMLSpanElement;
const msgElement = document.getElementById("message") as HTMLElement;
const hintElement = document.getElementById("hint") as HTMLSpanElement;
const optionsLink = document.getElementById("options") as HTMLAnchorElement;
const statusMsg = document.getElementById("status") as HTMLSpanElement;
const initialStatusMsg = statusMsg.textContent;

clearCookieButton.addEventListener("click", async () => {
  await removeThisTabCookies();
  window.localStorage.clear();
});

whitelistButton.addEventListener("click", async () => {
  whitelistButton.hidden = true;
  statusMsg.textContent = "Saving...";
  // Add persistentWhitelist to selectionWhitelist
  persistentWhitelist.forEach((element) => selectionWhitelist.add(element));
  // Create storage object
  let options: Options = { excludeDomains: [...selectionWhitelist].sort() };
  // Save storage object
  await chrome.storage.sync.set(options);
  // Remove whitelisted <li> children
  for (const childElement of msgElement.children) {
    if (childElement.tagName.toLowerCase() === 'li' && !childElement.classList.contains("checkmark")) {
      msgElement.removeChild(childElement);
    }
  }
  statusMsg.textContent = "Saved";
  setTimeout(() => {
    statusMsg.textContent = initialStatusMsg;
  }, 750);
});

reloadButton.addEventListener("click", () => {
  hideAll();
  headerElement.innerText = "Reloading tab...";
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (info.status === "complete" && tabId === tab?.id) {
      chrome.tabs.onUpdated.removeListener(listener);
      window.close();
    }
  });
  chrome.tabs.reload();
});

backToBrowsingButton.addEventListener("click", async () => {
  window.close();
});

optionsLink.addEventListener("click", async () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("options.html"));
  }
});

function hideAll(): void {
  clearCookieButton.hidden = true;
  backToBrowsingButton.hidden = true;
  whitelistButton.hidden = true;
  reloadButton.hidden = true;
  msgElement.hidden = true;
  hintElement.hidden = true;
  optionsLink.hidden = true;
}

interface TransformFunction {
  (value: any): string;
}

function countKey(objArray: object[], key: string, transform?: TransformFunction): Map<string, number> {
  let counter = new Map<string, number>();

  for (const obj of objArray) {
    if (obj.hasOwnProperty(key)) {
      const originalValue = obj[key as keyof typeof obj];
      const transformedValue = transform ? transform(originalValue) : originalValue;

      if (counter.has(transformedValue)) {
        counter.set(transformedValue, counter.get(transformedValue)! + 1);
      } else {
        counter.set(transformedValue, 1);
      }
    }
  }

  return counter;
}

export async function displayCookies(): Promise<void> {
  // get current tas's domain
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url as string).hostname;

  // Create include/exclude domains arrays of strings from chrome.storage
  try {
    cookies = await getCookies(hostname);
  } catch (error) {
    statusMsg.textContent = (error as string) ?? "";
    clearCookieButton.hidden = true;
    whitelistButton.hidden = true;
    reloadButton.hidden = true;
    headerElement.hidden = true;
    msgElement.hidden = true;
  }

  let numberOfCookies: number = cookies.length;

  if (numberOfCookies) {
    let counter = countKey(cookies, "domain");
    domainsRecord = {};
    for (let [key, value] of counter)
      domainsRecord[key] = { count: value, selected: true };
    let ds: string = "";
    let domains = Object.keys(domainsRecord).sort();
    if (domains.length > 1) ds = "s";
    let cs: string = "";
    let toBe: string = "is";
    if (numberOfCookies > 1) {
      cs = "s";
      toBe = "are";
    }
    headerElement.innerText = `There ${toBe} ${numberOfCookies} cookie${cs} in this tab for domain${ds}:`;
    // Show detected cookies as a list
    for (const domain of domains) {
      const listItem = document.createElement("li") as HTMLElement;
      let count = domainsRecord[domain].count;
      if (domains.length > 1) listItem.textContent = `${domain}(${count})`;
      else listItem.textContent = `${domain}`;
      listItem.classList.toggle("checkmark");
      // Add click event listener for item selection
      listItem.addEventListener("click", () => {
        domainsRecord[domain].selected = !domainsRecord[domain].selected;
        listItem.classList.toggle("checkmark");
        if (domainsRecord[domain].selected) selectionWhitelist.delete(domain);
        else selectionWhitelist.add(domain);
        if (selectionWhitelist.size > 0) {
          whitelistButton.hidden = false;
          whitelistButton.focus();
          clearCookieButton.hidden = selectionWhitelist.size === domains.length;
        } else {
          whitelistButton.hidden = true;
          clearCookieButton.hidden = false;
          clearCookieButton.focus();
        }
      });
      msgElement.appendChild(listItem);
    }
    document.body.style.width = getMaxOffsetWidth() + 100 + "px";
    clearCookieButton.hidden = false;
  } else {
    clearCookieButton.hidden = true;
    msgElement.hidden = true;
    hintElement.hidden = true;
    headerElement.innerText = "No cookies in this tab\n";
    document.body.style.width = getMaxOffsetWidth() + "px";
  }
  clearCookieButton.focus();
}

async function removeThisTabCookies(): Promise<void> {
  whitelistButton.hidden = true;
  clearCookieButton.hidden = true;
  hintElement.hidden = true;
  headerElement.innerText = "Removing cookies...";

  let cookiesToRemove: chrome.cookies.Cookie[] = [];
  let cookie: chrome.cookies.Cookie;
  for (cookie of cookies) {
    if (domainsRecord[cookie.domain]?.selected) cookiesToRemove.push(cookie);
  }
  // Remove selected cookies
  const removedCookies: chrome.cookies.CookieDetails[] =
    await removeCookies(cookiesToRemove);

  backToBrowsingButton.hidden = false;

  // Report the tasks statistics
  headerElement.innerText = `Deleted ${removedCookies.length} cookies for:`;
  if (removedCookies.length) {
    let counter: Map<string, number> = countKey(removedCookies, "url", key => new URL(key).hostname.replace(/^\./, ""));
    msgElement.innerText = Array.from(counter, ([key, value]) => `${key}(${value})`).sort().join("\n");
    if (isAndroid)
      reloadButton.hidden = true;
    else {
      reloadButton.hidden = false;
      reloadButton.focus();
    }
  }
  document.body.style.width = getMaxOffsetWidth() - 150 + "px";
}

function getMaxOffsetWidth(): number {
  let maxOffsetWidth = 0;

  // Get all elements in the document
  const allElements = document.getElementsByTagName(
    "*",
  ) as HTMLCollectionOf<HTMLElement>;

  // Iterate through each element
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];

    // Check if the element has an offsetWidth property
    if (element.offsetWidth !== undefined) {
      // Update maxOffsetWidth if the current element's offsetWidth is greater
      maxOffsetWidth = Math.max(maxOffsetWidth, element.offsetWidth);
    }
  }
  return maxOffsetWidth;
}

async function removeCookies(
  cookies: chrome.cookies.Cookie[],
): Promise<chrome.cookies.CookieDetails[]> {
  // Accepts an array of domains
  // Returns an array of removed cookies

  // Return an empty array if no cookies provided
  if (!cookies.length) return [];

  // Schedule tasks to remove cookies asynchronously
  let promises = cookies.map(cookie => {
    return chrome.cookies.remove(cookieDetails(cookie));
  });

  // Wait for all async tasks to complete and return results
  return await Promise.all(promises);
}

async function getCookies(domain: string): Promise<chrome.cookies.Cookie[]> {
  persistentWhitelist = (await getPersistentOptions())?.excludeDomains ?? [];
  const cookies: chrome.cookies.Cookie[] = [];
  let cookie: chrome.cookies.Cookie;
  for (cookie of await chrome.cookies.getAll({ domain: getBaseDomain(domain) })) {
    if (cookie.domain.startsWith("."))
      cookie.domain = cookie.domain.substring(1);
    if (persistentWhitelist.some(exclude => domainToRegExp(exclude).test(cookie.domain)))
      continue;
    cookies.push(cookie);
  }
  return cookies;
}

function domainToRegExp(domain: string): RegExp {
  let pattern = domain.replace(/\.(?![*+?{])/g, "\\$&");
  if (RegExp(/^[a-z]/i).test(pattern))
    pattern = "^" + pattern;
  if (RegExp(/[a-z]$/i).test(pattern))
    pattern += "$";
  return RegExp(pattern, "i");
}

function cookieDetails(cookie: chrome.cookies.Cookie): chrome.cookies.CookieDetails {
  // Accepts a cookie returned by chrome.cookie.get
  // Returns cookie details object: {url, name}
  return {
    name: cookie.name,
    url: "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
  };
}

function getBaseDomain(url: string) {
  // Remove protocol and www. (if present)
  let domain = url.replace(/^(https?:\/\/)?(www\.)?/, "");

  // Split the domain into parts using dots
  const domainParts = domain.split(".");

  // Check if the domain has at least two parts
  if (domainParts.length > 2) {
    // Extract the last two parts to form the base domain
    return (domainParts[domainParts.length - 2] + "." + domainParts[domainParts.length - 1]);
  } else {
    // If there are not enough parts, return the original domain
    return domain;
  }
}
