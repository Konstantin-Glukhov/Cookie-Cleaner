export async function getPersistentOptions() {
    let options = {
        "excludeDomains": []
    };
    options = await chrome.storage.sync.get(options);
    for (let key in options)
        if (!Array.isArray(options[key])) // Garbage is returned if storage corrupted
            options[key] = [];
    return options;
}
