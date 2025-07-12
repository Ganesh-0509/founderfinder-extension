document.addEventListener('DOMContentLoaded', () => {
  const emailRegex = /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
  const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

  function renderLeads() {
    chrome.storage.local.get(['leads'], (result) => {
      const leads = result.leads || [];
      const tableBody = document.querySelector('#leadsTable tbody');
      tableBody.innerHTML = '';

      const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
      const platform = document.getElementById('platformFilter')?.value || 'all';
      const filterStrong = document.getElementById('filterStrongSocials')?.checked || false;
      const filterBusiness = document.getElementById('filterBusinessOnly')?.checked || false;

      leads.forEach(lead => {
        if (typeof lead !== 'object' || !lead.value) return;

        const { type, value, score, domain = '', tag = '' } = lead;
        const fullText = `${type} ${value} ${score} ${domain} ${tag}`.toLowerCase();

        if (query && !fullText.includes(query)) return;
        if (filterStrong && score < 5) return;
        if (filterBusiness && personalDomains.includes(domain)) return;

        const platformMatch =
          platform === 'all' ||
          (platform === 'email' && type === 'Email') ||
          (platform === 'linkedin' && type === 'LinkedIn') ||
          (platform === 'twitter' && type === 'Twitter') ||
          (platform === 'github' && type === 'GitHub') ||
          (platform === 'angellist' && type === 'AngelList');

        if (!platformMatch) return;

        const tr = document.createElement('tr');
        if (score >= 8) tr.style.backgroundColor = "#e6ffe6";

        const checkboxTd = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'leadCheckbox';
        checkbox.dataset.value = value;
        checkboxTd.appendChild(checkbox);
        tr.appendChild(checkboxTd);

        [type, value, score, domain, tag].forEach((txt, index) => {
  const td = document.createElement('td');

  // If Value column (index 1), inject favicon and link
  if (index === 1) {
    if (type === "Email") {
      const emailLink = document.createElement('span');
      emailLink.textContent = txt;
      td.appendChild(emailLink);
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
  } else {
    td.textContent = txt;
    if (index === 3) {
  const icon = document.createElement('img');
  icon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  icon.style.width = "14px";
  icon.style.height = "14px";
  icon.style.marginRight = "6px";
  icon.style.verticalAlign = "middle";

  td.textContent = txt; // Preserve clean text for export

  const wrapper = document.createElement('span');
  wrapper.style.display = "inline-flex";
  wrapper.style.alignItems = "center";

  wrapper.appendChild(icon);
  wrapper.appendChild(document.createTextNode(" " + txt));

  td.innerHTML = ''; // Clear any previous content
  td.appendChild(wrapper);
}
    if (index === 4) td.title = `Tag: ${tag} | Score: ${score}`;
  }

  tr.appendChild(td);
});

        tableBody.appendChild(tr);
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
    });
  }

  // 🧹 One-time migration
  chrome.storage.local.get(['leads'], (result) => {
    const leads = result.leads || [];
    const migrated = [];

    leads.forEach(item => {
      if (typeof item === 'object' && item.value) {
        migrated.push(item); // already structured
      } else if (typeof item === 'string') {
        const str = item.toLowerCase();
        let score = 0, tag = "", type = "", domain = "";

        if (emailRegex.test(str)) {
          const [user, dom] = str.split("@");
          domain = dom;
          type = "Email";
          if (/founder|ceo|owner|cofounder|startup/.test(user)) score += 7;
          if (!personalDomains.includes(domain)) score += 3;
          if (/\.(ai|tech|io)$/.test(domain)) score += 2;
          tag = score >= 10 ? "🎯 Founder (AI)" : score >= 5 ? "🔍 High-Value Lead" : "🧊 Low Signal";
        } else {
          type = "Social";
          if (str.includes("linkedin.com")) type = "LinkedIn", score += 3;
          else if (str.includes("twitter.com") || str.includes("x.com")) type = "Twitter", score += 2;
          else if (str.includes("github.com")) type = "GitHub", score += 1;
          else if (str.includes("angel.co") || str.includes("angellist.com")) type = "AngelList";

          if (/founder|ceo|startup/.test(str)) score += 6;
          if (/build|ai|tech|product/.test(str)) score += 4;
          tag = score >= 10 ? "🚀 Tech Founder (AI)" : score >= 5 ? "🔍 Relevant Profile" : "🧊 Low Signal";
        }

        migrated.push({ type, value: item, score, domain, tag });
      }
    });

    chrome.storage.local.set({ leads: migrated }, () => {
      if (leads.length !== migrated.length) {
        console.log("🧹 Migrated old leads to structured format.");
        location.reload();
      }
    });
  });
  chrome.storage.local.get(['leads'], (result) => {
  const leads = result.leads || [];
  let updated = false;

  const patchedLeads = leads.map(lead => {
    if (typeof lead === 'object' && !lead.hasOwnProperty('bookmark')) {
      updated = true;
      return { ...lead, bookmark: false };
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

  // 🎛️ Event Listeners
  document.getElementById('filterBusinessOnly')?.addEventListener('change', renderLeads);
  document.getElementById('filterStrongSocials')?.addEventListener('change', renderLeads);
  document.getElementById('searchInput')?.addEventListener('input', renderLeads);
  document.getElementById('platformFilter')?.addEventListener('change', renderLeads);

  document.getElementById('selectAll')?.addEventListener('change', function () {
    document.querySelectorAll('.leadCheckbox').forEach(cb => cb.checked = this.checked);
  });

  document.getElementById('copyBtn')?.addEventListener('click', () => {
    const selected = document.querySelectorAll('.leadCheckbox:checked');
    if (selected.length === 0) return alert("No rows selected.");
    let text = '';
    selected.forEach(cb => {
      const row = cb.closest('tr');
      const cells = row.querySelectorAll('td');
      const rowData = Array.from(cells).slice(1).map(td => td.textContent);
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
        tds[1].textContent,
        tds[2].textContent.replace(/,/g, '%2C'),
        tds[3].textContent,
        tds[4].textContent,
        tds[5].textContent
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
        type: tds[1].textContent,
        value: tds[2].textContent,
        score: Number(tds[3].textContent),
        domain: tds[4].textContent,
        tag: tds[5].textContent
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
          if (!personalDomains.includes(domain)) score += 3;
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
        location.reload();
      });
    });
  });

  document.getElementById('viewDashboardBtn')?.addEventListener('click', () => {
    const url = chrome.runtime.getURL("dashboard.html");
    chrome.tabs.create({ url: url });
  });

  // ✅ Initial render
  renderLeads();
});
