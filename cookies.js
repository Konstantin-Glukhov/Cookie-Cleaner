"use strict";

export async function removeCookies(domains) {
  // Accepts an array of domains
  // Returns an array of removed cookies
  if (!Array.isArray(domains)) throw "domains argument must be an array";

  // retrieve all domain cookies (current tab and optionally supplied)
  let cookieDetailsUniqueArray = await getCookiesDetails(domains);

  // Exit if no cookies to remove
  if (!cookieDetailsUniqueArray.length) return [];

  // Schedule tasks to remove cookies asynchronously
  let promises = cookieDetailsUniqueArray.map((cookieDetail) => {
    return chrome.cookies.remove(cookieDetail);
  });

  // Wait for all async tasks to complete and return results
  return await Promise.all(promises);
}

async function getCookiesDetails(domains) {
  // Accepts an array of domains
  // Returns a unique array of cookie details {name, url}

  // Schedule tasks to get cookies asynchronously
  let promises = domains.map((domain) => {
    return chrome.cookies.getAll({ domain: domain });
  });
  // Wait for all async tasks to complete
  let getAllResults = await Promise.all(promises);
  // Create and return a unique array of cookies details
  let cookieDetailsUniqueArray = [];
  for (let cookieArray of getAllResults)
    for (let cookie of cookieArray)
      addObjectToUniqueArray(cookieDetailsUniqueArray, cookieToCookieDetails(cookie));
  return cookieDetailsUniqueArray;
}

function addObjectToUniqueArray(objectUniqueArray, object) {
  // Adds an object to objectUniqueArray
  for (let element of objectUniqueArray)
    if (JSON.stringify(element) == JSON.stringify(object)) return;
  objectUniqueArray.push(object);
}

function cookieToCookieDetails(cookie) {
  // Accepts a cookie returned by chrome.cookie.get
  // Returns cookie details {url, name} object
  return {
    name: cookie.name,
    url:
      "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
  };
}
