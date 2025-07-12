// 📍 dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  const emailRegex = /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
  const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  let uniqueLinks = new Set();

  function renderLeads() {
  chrome.storage.local.get(['leads'], (result) => {
    const leads = result.leads || [];
    const tableBody = document.querySelector('#leadsTable tbody');
    tableBody.innerHTML = '';
    const countLabel = document.getElementById('leadCountLabel');
    let totalCount = leads.length;
    let visibleCount = 0;


    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const platform = document.getElementById('platformFilter')?.value || 'all';
    const filterStrong = document.getElementById('filterStrongSocials')?.checked || false;
    const filterBusiness = document.getElementById('filterBusinessOnly')?.checked || false;
    const filterBookmarked = document.getElementById('filterBookmarkedOnly')?.checked || false;

    leads.forEach(lead => {
      
      if (typeof lead !== 'object' || !lead.value) return;

      const { type, value, score, domain = '', tag = '' } = lead;
      const lowerValue = value.toLowerCase();
      const fullText = `${type} ${value} ${score} ${domain} ${tag}`.toLowerCase();
      if (query && !fullText.includes(query)) return;
      if (filterStrong && score < 5) return;
      if (filterBusiness && ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) return;

      const platformMatch =
        platform === 'all' ||
        (platform === 'email' && type === 'Email') ||
        (platform === 'linkedin' && type === 'LinkedIn') ||
        (platform === 'twitter' && type === 'Twitter') ||
        (platform === 'github' && type === 'GitHub') ||
        (platform === 'angellist' && type === 'AngelList');

      if (!platformMatch) return;
      if (filterBookmarked && !lead.bookmarked) return;
      const tr = document.createElement('tr');

      const checkboxTd = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'leadCheckbox';
      checkbox.dataset.value = value;
      checkboxTd.appendChild(checkbox);
      tr.appendChild(checkboxTd);
      
      const bookmarkTd = document.createElement('td');
const star = document.createElement('span');
star.innerHTML = lead.bookmarked ? "⭐" : "☆";
star.style.cursor = "pointer";
star.style.fontSize = "16px";
star.title = "Click to toggle bookmark";

star.addEventListener("click", () => {
  // Toggle bookmark state
  lead.bookmarked = !lead.bookmarked;
  star.innerHTML = lead.bookmarked ? "⭐" : "☆";

  // Save updated bookmark state in chrome.storage
  chrome.storage.local.get(['leads'], (res) => {
    const leadsArr = res.leads || [];
    const updated = leadsArr.map(l => 
      l.value === lead.value ? { ...l, bookmarked: lead.bookmarked } : l
    );
    chrome.storage.local.set({ leads: updated });
  });
});

bookmarkTd.appendChild(star);
tr.appendChild(bookmarkTd);

      [type, value, score, domain, tag].forEach((txt, index) => {
      const td = document.createElement('td');

      if (index === 1) {
  if (type === "Email") {
    const emailSpan = document.createElement('span');
    emailSpan.textContent = txt;
    td.appendChild(emailSpan);
  } else {
    const link = document.createElement('a');
    link.href = txt;
    link.textContent = txt;
    link.target = "_blank";
    link.style.marginLeft = "6px";

    const favicon = document.createElement('img');
    try {
      const url = new URL(txt);
      const base = url.hostname;
      favicon.src = `https://www.google.com/s2/favicons?sz=24&domain=${base}`;
      favicon.style.width = "16px";
      favicon.style.height = "16px";
      favicon.style.verticalAlign = "middle";
    } catch (e) {
      favicon.src = "";
    }

    td.appendChild(favicon);
    td.appendChild(link);
  }
}
    else {
        td.textContent = txt;
        if (index === 3 && domain) {
      const icon = document.createElement('img');
      icon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
      icon.style.width = "14px";
      icon.style.height = "14px";
      icon.style.marginRight = "6px";
      icon.style.verticalAlign = "middle";

      td.textContent = txt; // Keep clean text for CSV/JSON

      const wrapper = document.createElement('span');
      wrapper.style.display = "inline-flex";
      wrapper.style.alignItems = "center";

      wrapper.appendChild(icon);
      wrapper.appendChild(document.createTextNode(" " + txt));

      td.innerHTML = '';
      td.appendChild(wrapper);
    }
        if (index === 4) td.title = `Tag: ${tag} | Score: ${score}`;
      }

      tr.appendChild(td);
    });

      tableBody.appendChild(tr);
      visibleCount++;
    });

    if (!tableBody.children.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = "❗ No leads match your filters.";
      td.style.textAlign = "center";
      td.style.color = "#999";
      td.style.fontStyle = "italic";
      tr.appendChild(td);
      tableBody.appendChild(tr);
    }
    if (countLabel) {
  countLabel.textContent = `📊 Total: ${totalCount} | Showing: ${visibleCount}`;
}
  });
}

chrome.storage.local.get(['leads'], (result) => {
  const leads = result.leads || [];
  const migrated = [];

  const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

  leads.forEach(item => {
    if (typeof item === 'object' && item.value) {
      migrated.push(item); // already structured
    } else if (typeof item === 'string') {
      const str = item.toLowerCase();
      let score = 0, tag = "", type = "", domain = "";

      if (/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(str)) {
        const [user, dom] = str.split("@");
        domain = dom;
        type = "Email";
        if (/founder|ceo|owner|cofounder|startup/.test(user)) score += 7;
        if (!personalDomains.includes(domain)) score += 3;
        if (/\.(ai|tech|io)$/.test(domain)) score += 2;
        tag = score >= 10 ? "🎯 Founder (AI)" : score >= 5 ? "🔍 High-Value Lead" : "🧊 Low Signal";
      } else {
        type = "Social";
        if (str.includes("linkedin.com")) {
          type = "LinkedIn";
          score += 3;
        } else if (str.includes("twitter.com") || str.includes("x.com")) {
          type = "Twitter";
          score += 2;
        } else if (str.includes("github.com")) {
          type = "GitHub";
          score += 1;
        } else if (str.includes("angel.co") || str.includes("angellist.com")) {
          type = "AngelList";
        }

        if (/founder|ceo|startup/.test(str)) score += 6;
        if (/build|ai|tech|product/.test(str)) score += 4;
        tag = score >= 10 ? "🚀 Tech Founder (AI)" : score >= 5 ? "🔍 Relevant Profile" : "🧊 Low Signal";
      }

      migrated.push({ type, value: item, score, domain, tag });
    }
  });

  // Save updated leads and refresh
  chrome.storage.local.set({ leads: migrated }, () => {
    if (leads.length !== migrated.length) {
      console.log("🧹 Migrated old leads to structured format.");
      location.reload(); // refresh popup to re-render cleanly
    }
  });
});
chrome.storage.local.get(['leads'], (result) => {
  const leads = result.leads || [];
  let updated = false;

  const patchedLeads = leads.map(lead => {
    if (typeof lead === 'object' && !lead.hasOwnProperty('bookmarked')) {
  updated = true;
  return { ...lead, bookmarked: false };
}

    return lead;
  });

  if (updated) {
    chrome.storage.local.set({ leads: patchedLeads }, () => {
      console.log("⭐ Bookmark field added to existing leads.");
      location.reload(); // Reload UI
    });
  }
});

  // 🧠 Sorting
  let currentSort = { column: null, asc: true };
  document.querySelectorAll("#leadsTable th").forEach((th, index) => {
    if (index === 0) return; // skip checkbox
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
      const rows = Array.from(document.querySelectorAll("#leadsTable tbody tr"))
        .filter(r => !r.querySelector("td[colspan]"));

      rows.sort((a, b) => {
        const valA = a.children[index].textContent.toLowerCase();
        const valB = b.children[index].textContent.toLowerCase();
        const numA = parseFloat(valA), numB = parseFloat(valB);
        const isNumeric = !isNaN(numA) && !isNaN(numB);
        const result = isNumeric ? numA - numB : valA.localeCompare(valB);
        return currentSort.asc ? result : -result;
      });

      currentSort = { column: index, asc: !currentSort.asc };
      const tbody = document.querySelector("#leadsTable tbody");
      tbody.innerHTML = "";
      rows.forEach(row => tbody.appendChild(row));
    });
  });

  // ✅ Filter listeners
  document.getElementById('filterBusinessOnly')?.addEventListener('change', renderLeads);
  document.getElementById('filterStrongSocials')?.addEventListener('change', renderLeads);
  document.getElementById('searchInput')?.addEventListener('input', renderLeads);
  document.getElementById('platformFilter')?.addEventListener('change', renderLeads);
  document.getElementById('selectAll')?.addEventListener('change', function () {
    const boxes = document.querySelectorAll('.leadCheckbox');
    boxes.forEach(cb => cb.checked = this.checked);
  });
  document.getElementById('filterBookmarkedOnly')?.addEventListener('change', renderLeads);


  // ✅ Copy/Download listeners
  document.getElementById('copyBtn')?.addEventListener('click', () => {
    const selected = document.querySelectorAll('.leadCheckbox:checked');
    if (selected.length === 0) return alert("No rows selected.");
    let text = '';
    selected.forEach(cb => {
      const row = cb.closest('tr');
      const cells = row.querySelectorAll('td');
      const rowData = [
  cells[2].textContent,  // Type
  cells[3].textContent,  // Value
  cells[4].textContent,  // Score
  cells[5].textContent,  // Domain
  cells[6].textContent   // Tag
];

      text += rowData.join(' | ') + '\n';
    });
    navigator.clipboard.writeText(text).then(() => alert("Copied!")).catch(err => alert("Copy failed: " + err));
  });

  document.getElementById('downloadBtn')?.addEventListener('click', () => {
    const selected = document.querySelectorAll('.leadCheckbox:checked');
    if (selected.length === 0) return alert("No rows selected.");
    const csv = [["#", "Type", "Value", "Score", "Domain", "Tag"]];
    selected.forEach((cb, index) => {
      const tds = cb.closest('tr').querySelectorAll('td');
      csv.push([
        index + 1,
        tds[2].textContent, // Type
        tds[3].textContent.replace(/,/g, '%2C'), // Value
        tds[4].textContent, // Score
        tds[5].textContent, // Domain
        tds[6].textContent  // Tag
      ]);

    });
    const blob = new Blob([csv.map(r => r.join(",")).join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('downloadJsonBtn')?.addEventListener('click', () => {
    const selected = document.querySelectorAll('.leadCheckbox:checked');
    if (selected.length === 0) return alert("No rows selected.");
    const data = [];
    selected.forEach(cb => {
      const tds = cb.closest('tr').querySelectorAll('td');
      data.push({
        type: tds[2].textContent,
        value: tds[3].textContent,
        score: Number(tds[4].textContent),
        domain: tds[5].textContent,
        tag: tds[6].textContent
      });

    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_leads.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('tagWithAiBtn')?.addEventListener('click', () => {
  chrome.storage.local.get(['leads'], (result) => {
    const leads = result.leads || [];

    const updatedLeads = leads.map(item => {
      const { type, value } = item;
      const val = value.toLowerCase();

      let score = 0, tag = "";

      if (type === "Email") {
        const [user, domain] = val.split("@");
        if (/founder|ceo|owner|cofounder|startup|admin/.test(user)) score += 7;
        if (!["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)) score += 3;
        if (/\.(ai|tech|io)$/.test(domain)) score += 2;
        tag = score >= 10 ? "🎯 Founder (AI)" : score >= 5 ? "🔍 High-Value Lead" : "🧊 Low Signal";
      }

      else if (["LinkedIn", "Twitter", "GitHub", "AngelList"].includes(type)) {
        if (/founder|ceo|startup/.test(val)) score += 6;
        if (/build|ai|tech|product/.test(val)) score += 4;

        if (type === "LinkedIn") score += 3;
        if (type === "Twitter") score += 2;
        if (type === "GitHub") score += 1;

        tag = score >= 10 ? "🚀 Tech Founder (AI)" : score >= 5 ? "🔍 Relevant Profile" : "🧊 Low Signal";
      }

      return { ...item, score, tag };
    });

    chrome.storage.local.set({ leads: updatedLeads }, () => {
      alert("🤖 AI Tagging applied to all leads!");
      location.reload(); // Refresh popup/dashboard UI
    });
  });
});

  // 🟢 Initial render
  renderLeads();
});
