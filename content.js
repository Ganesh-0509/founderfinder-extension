function extractLeads() {
  try {
    const pageText = document.body.innerText;
    const anchors = Array.from(document.querySelectorAll('a'));

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
    const rawEmails = pageText.match(emailPattern) || [];

    const emails = rawEmails.map(email => ({
      type: "Email",
      value: email.trim().toLowerCase()
    }));

    const socialLinks = anchors
      .map(a => a.href.trim().split('?')[0].split('#')[0].replace(/\/+$/, ""))
      .filter(href => {
        if (!href.startsWith("http")) return false;

        const url = href.toLowerCase();

        const bannedKeywords = [
          "/home", "/feed", "/settings", "/about", "/privacy", "/security",
          "/help", "/terms", "/jobs", "/marketplace", "/features", "/topics",
          "/notifications", "/explore", "/site", "/copilot", "/dashboard", "/messages"
        ];
        if (bannedKeywords.some(bad => url.includes(bad))) return false;

        if (url.includes("linkedin.com/in/")) {
          return !url.includes("/edit") && !url.includes("/overlay") && url.split("/").length <= 5;
        }

        if (url.includes("twitter.com/") || url.includes("x.com/")) {
          return /^https:\/\/(x|twitter)\.com\/[^\/]+$/.test(url);
        }

        if (url.includes("github.com/")) {
          const parts = url.split("/");
          const username = parts[3];
          const disallowed = [
            "about", "features", "contact", "pricing", "security", "marketplace",
            "dashboard", "settings", "notifications", "site", "explore", "topics",
            "collections", "events", "apps", "pulls", "issues", "discussions",
            "projects", "codespaces", "copilot", "sponsors"
          ];
          return parts.length === 4 && username && !disallowed.includes(username.toLowerCase());
        }

        if (url.includes("angel.co/") || url.includes("angellist.com/")) return true;

        return false;
      })
      .map(link => {
        let type = "Social";
        if (link.includes("linkedin.com")) type = "LinkedIn";
        else if (link.includes("twitter.com") || link.includes("x.com")) type = "Twitter";
        else if (link.includes("github.com")) type = "GitHub";
        else if (link.includes("angel.co") || link.includes("angellist.com")) type = "AngelList";
        return { type, value: link.trim().toLowerCase() };
      });

    const combinedLeads = [...emails, ...socialLinks];

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ leads: combinedLeads }, () => {
        if (chrome.runtime?.lastError) {
          console.warn("❌ Storage error:", chrome.runtime.lastError.message);
        } else {
          console.log("✅ Structured leads stored:", combinedLeads);
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
