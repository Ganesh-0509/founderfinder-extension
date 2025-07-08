function extractLeads() {
  try {
    // ✅ Extract text + links
    const pageText = document.body.innerText;
    const anchors = Array.from(document.querySelectorAll('a'));

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
    const emails = pageText.match(emailPattern) || [];

    const socialLinks = anchors
      .map(a => a.href.trim().split('?')[0].split('#')[0].replace(/\/+$/, ""))
      .filter(href => {
        if (!href.startsWith("http")) return false;
        const url = href.toLowerCase();

        if (url.includes("linkedin.com/in/")) {
          return !url.includes("/edit") && !url.includes("/overlay") && url.split("/").length <= 5;
        }
        if (url.includes("twitter.com/") || url.includes("x.com/")) {
          return /^https:\/\/(x|twitter)\.com\/[^\/]+$/.test(url);
        }
        if (url.includes("github.com/")) {
          const parts = url.split("/");
          const isProfile = parts.length === 4 && parts[3]; // github.com/username
          const disallowed = [
            "about", "features", "contact", "pricing", "security", "marketplace",
            "dashboard", "settings", "notifications", "site", "explore",
            "topics", "collections", "events", "apps", "pulls", "issues", "discussions",
            "projects", "codespaces", "copilot", "sponsors"
          ];
          return isProfile && !disallowed.includes(parts[3].toLowerCase());
        }
        if (url.includes("angel.co/") || url.includes("angellist.com/")) return true;

        return false;
      });

    const combinedLeads = [...new Set([...emails, ...socialLinks])];

    // ✅ Try saving leads only if extension context is valid
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ leads: combinedLeads }, () => {
        if (chrome.runtime?.lastError) {
          console.warn("❌ Storage error:", chrome.runtime.lastError.message);
        } else {
          console.log("✅ Leads captured:", combinedLeads);
        }
      });
    }
  } catch (err) {
    console.error("❌ extractLeads failed:", err);
  }
}
// ✅ Initial run
extractLeads();

let debounceTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    extractLeads();
  }, 600); // Adjust as needed (600ms is good for X.com)
});


observer.observe(document.body, {
  childList: true,
  subtree: true,
});
