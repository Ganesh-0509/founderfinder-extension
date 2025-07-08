const filterCheckbox = document.getElementById('filterBusinessOnly');
const emailRegex = /^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/;

function renderLeads() {
  chrome.storage.local.get(['leads'], function (result) {
    const emails = [];
    const socials = [];
    const leads = result.leads || [];

    leads.forEach(item => {
      if (emailRegex.test(item)) {
          emails.push(item);
        } else {
          socials.push(item);
        }
            });

    const tableBody = document.querySelector('#leadsTable tbody');
    tableBody.innerHTML = '';
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || "";

    const showOnlyBusiness = filterCheckbox?.checked || false;
    const filterStrongSocials = document.getElementById('filterStrongSocials')?.checked || false;
    const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
    function addRow(type, value, score, domain, tag) {
      const fullText = `${type} ${value} ${score} ${domain} ${tag}`.toLowerCase();
      if (searchQuery && !fullText.includes(searchQuery)) return;

      const tr = document.createElement('tr');

      const checkboxTd = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.classList.add('leadCheckbox');
      checkbox.dataset.value = value;
      checkboxTd.appendChild(checkbox);
      tr.appendChild(checkboxTd);

      const rowData = [type, value, score, domain || "", tag || ""];
      rowData.forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    }

    // 📧 Email Rendering
    emails.forEach(email => {
      let score = 0;
      let tag = "";
      const user = email.split('@')[0].toLowerCase();
      const domain = email.split('@')[1].toLowerCase();

      if (user.includes("ceo") || user.includes("founder") || user.includes("owner") || user.includes("cofounder") || user.includes("md") || user.includes("director")) {
        score += 10;
        tag = "Founder Email";
      }

      if (!personalDomains.includes(domain)) {
        score += 5;
      }

      if (domain.endsWith(".io") || domain.endsWith(".ai") || domain.endsWith(".tech")) {
        score += 5;
      }

      if (!tag && score >= 10) tag = "Likely Founder";
      if (!tag && score <= 4) tag = "Low Signal";
      if (filterStrongSocials && score < 5) return;
      if (showOnlyBusiness && personalDomains.includes(domain)) return;

      addRow("Email", email, score, domain, tag);
    });

    // 🔗 Social Rendering
    socials.forEach(link => {
      let score = 0;
  let tag = "";
  const url = link.toLowerCase();

  let isRelevant = false;

  if (url.includes("linkedin.com")) {
    score += 5;
    isRelevant = true;
    if (url.includes("founder") || url.includes("ceo") || url.includes("startup")) {
      score += 5;
      tag = "Founder Profile";
    }
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
  score += 3;
  isRelevant = true;
  if (url.includes("build") || url.includes("tech") || url.includes("founder")) {
    score += 2;
    tag = "Tech Profile";
  }
}
  else if (url.includes("github.com") || url.includes("angel.co") || url.includes("angellist.com")) {
    isRelevant = true;
  }

  if (!isRelevant) return;

  if (!tag && score >= 10) tag = "Likely Founder";
  if (!tag && score <= 4) tag = "Low Signal";

  // ✅ Now apply your filter correctly
  if (filterStrongSocials && score < 5) return;

 let type = "Social";
if (url.includes("linkedin.com")) type = "LinkedIn";
else if (url.includes("twitter.com")) type = "Twitter";
else if (url.includes("github.com")) type = "GitHub";
else if (url.includes("angel.co") || url.includes("angellist.com")) type = "AngelList";

addRow(type, link, score, "", tag);
    });
  });
}

// 🔁 Filter Toggle
filterCheckbox?.addEventListener('change', renderLeads);
document.getElementById('filterStrongSocials')?.addEventListener('change', renderLeads);
document.getElementById('searchInput')?.addEventListener('input', renderLeads);

document.getElementById('selectAll')?.addEventListener('change', function () {
  const checkboxes = document.querySelectorAll('.leadCheckbox');
  checkboxes.forEach(cb => cb.checked = this.checked);
});

// 📝 Copy Button
document.getElementById('copyBtn').addEventListener('click', () => {
  const selected = document.querySelectorAll('.leadCheckbox:checked');
  if (selected.length === 0) {
    alert("No rows selected.");
    return;
  }

  let text = '';
  selected.forEach(cb => {
    const row = cb.closest('tr');
    const cells = row.querySelectorAll('td');
    const rowData = Array.from(cells).slice(1).map(td => td.textContent); // skip checkbox
    text += rowData.join(' | ') + '\n';
  });

  navigator.clipboard.writeText(text)
    .then(() => alert('Selected leads copied to clipboard!'))
    .catch(err => alert('Copy failed: ' + err));
});


// 📥 CSV Export
document.getElementById('downloadBtn').addEventListener('click', () => {
  const rows = [["#", "Type", "Value", "Score", "Domain", "Tag"]];
  const selected = document.querySelectorAll('.leadCheckbox:checked');

  if (selected.length === 0) {
    alert("No rows selected.");
    return;
  }

  selected.forEach((checkbox, index) => {
    const row = checkbox.closest('tr');
    const cells = row.querySelectorAll('td');
    const type = cells[1].textContent;
    const value = cells[2].textContent.replace(/,/g, "%2C");
    const score = cells[3].textContent;
    const domain = cells[4].textContent;
    const tag = cells[5].textContent;

    rows.push([index + 1, type, value, score, domain, tag]);
  });

  const csvContent = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'selected_leads.csv';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('viewDashboardBtn')?.addEventListener('click', () => {
  const url = chrome.runtime.getURL("dashboard.html");
  chrome.tabs.create({ url: url });
});

document.getElementById('downloadJsonBtn')?.addEventListener('click', () => {
  const selected = document.querySelectorAll('.leadCheckbox:checked');
  if (selected.length === 0) {
    alert("No rows selected.");
    return;
  }
  const jsonData = [];

  selected.forEach(cb => {
    const row = cb.closest('tr');
    const cells = row.querySelectorAll('td');

    jsonData.push({
      type: cells[1].textContent,
      value: cells[2].textContent,
      score: Number(cells[3].textContent),
      domain: cells[4].textContent,
      tag: cells[5].textContent
    });
  });

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'selected_leads.json';
  a.click();
  URL.revokeObjectURL(url);
});

// 🟢 Initial render
renderLeads();
