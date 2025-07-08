// 📍 dashboard.js
const filterCheckbox = document.getElementById('filterBusinessOnly');
const filterStrongSocials = document.getElementById('filterStrongSocials');
const searchInput = document.getElementById('searchInput');
const selectAllCheckbox = document.getElementById('selectAll');
const platformFilter = document.getElementById('platformFilter');
const emailRegex = /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
const uniqueLinks = new Set();  // This was missing and would throw error on second call

function renderLeads() {
  chrome.storage.local.get(['leads'], function (result) {
    const leads = result.leads || [];
    const emails = [], socials = [];

    leads.forEach(item => {
      if (emailRegex.test(item)) emails.push(item);
      else socials.push(item);
    });

    const tableBody = document.querySelector('#leadsTable tbody');
    tableBody.innerHTML = '';
    const query = searchInput?.value.toLowerCase() || '';
    const platform = platformFilter?.value || 'all';

    function addRow(type, value, score, domain, tag) {
      const fullText = `${type} ${value} ${score} ${domain} ${tag}`.toLowerCase();
      if (query && !fullText.includes(query)) return;

      const tr = document.createElement('tr');

      const tdCheck = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'leadCheckbox';
      checkbox.dataset.value = value;
      tdCheck.appendChild(checkbox);
      tr.appendChild(tdCheck);

      [type, value, score, domain || '', tag || ''].forEach(txt => {
        const td = document.createElement('td');
        td.textContent = txt;
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    }

    // 📧 Emails
    emails.forEach(email => {
      let score = 0, tag = '';
      const user = email.split('@')[0].toLowerCase();
      const domain = email.split('@')[1].toLowerCase();

      if (/ceo|founder|owner|cofounder|md|director/.test(user)) {
        score += 10;
        tag = 'Founder Email';
      }
      if (!personalDomains.includes(domain)) score += 5;
      if (/\.(io|ai|tech)$/.test(domain)) score += 5;

      if (!tag && score >= 10) tag = "Likely Founder";
      if (!tag && score <= 4) tag = "Low Signal";

      if (filterStrongSocials.checked && score < 5) return;
      if (filterCheckbox.checked && personalDomains.includes(domain)) return;
      if (platform !== 'all' && platform !== 'email') return;
      addRow("Email", email, score, domain, tag);
    });

    // 🔗 Socials
    socials.forEach(link => {
      let score = 0, tag = "", type = "Social";
      const url = link.toLowerCase().replace("https://x.com", "https://twitter.com");
      const normalized = link.toLowerCase().split('?')[0].split('#')[0].replace(/\/+$/, "");
      if (uniqueLinks.has(normalized)) return;
      uniqueLinks.add(normalized);

      if (url.includes("linkedin.com")) {
        type = "LinkedIn"; score += 5;
        if (/founder|ceo|startup/.test(url)) {
          score += 5;
          tag = "Founder Profile";
        }
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
          type = "Twitter"; score += 3;
          if (/build|tech|founder/.test(url)) {
            score += 2;
            tag = "Tech Profile";
          }
      }else if (url.includes("github.com")) {
        type = "GitHub";
      } else if (url.includes("angel.co") || url.includes("angellist.com")) {
        type = "AngelList";
      } else {
        return; // Skip other socials like youtube, insta
      }

      if (!tag && score >= 10) tag = "Likely Founder";
      if (!tag && score <= 4) tag = "Low Signal";

      if (filterStrongSocials.checked && score < 5) return;

      if (
        (platform === 'linkedin' && type !== 'LinkedIn') ||
        (platform === 'twitter' && type !== 'Twitter') ||
        (platform === 'github' && type !== 'GitHub') ||
        (platform === 'angellist' && type !== 'AngelList') ||
        (platform === 'email')
      ) return;

      addRow(type, link, score, "", tag);
    });
    // 🟢 If no rows added, show a message
    if (tableBody.children.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = "❗ No leads found on this page.";
      td.style.textAlign = "center";
      td.style.color = "#999";
      td.style.fontStyle = "italic";
      tr.appendChild(td);
      tableBody.appendChild(tr);
    }
  });
}

// ✅ Filter and search
filterCheckbox?.addEventListener('change', renderLeads);
filterStrongSocials?.addEventListener('change', renderLeads);
searchInput?.addEventListener('input', renderLeads);
selectAllCheckbox?.addEventListener('change', () => {
  const boxes = document.querySelectorAll('.leadCheckbox');
  boxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
});
platformFilter?.addEventListener('change', renderLeads);


// ✅ Copy
document.getElementById('copyBtn')?.addEventListener('click', () => {
  const selected = document.querySelectorAll('.leadCheckbox:checked');
  if (selected.length === 0) return alert("No rows selected.");

  let text = '';
  selected.forEach(cb => {
    const cells = cb.closest('tr').querySelectorAll('td');
    const row = Array.from(cells).slice(1).map(td => td.textContent);
    text += row.join(" | ") + "\n";
  });

  navigator.clipboard.writeText(text)
    .then(() => alert("Copied!"))
    .catch(err => alert("Copy failed: " + err));
});

// ✅ CSV
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

// ✅ JSON
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

// 🧠 Sorting logic
let currentSort = { column: null, asc: true };

document.querySelectorAll("#leadsTable th").forEach((th, index) => {
  if (index === 0) return; // skip checkbox column

  th.style.cursor = "pointer";

  th.addEventListener("click", () => {
    if (document.querySelectorAll("#leadsTable tbody tr td[colspan]").length > 0) return;

    const rows = Array.from(document.querySelectorAll("#leadsTable tbody tr"));

    rows.sort((a, b) => {
      const valA = a.children[index].textContent.toLowerCase();
      const valB = b.children[index].textContent.toLowerCase();

      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      const isNumeric = !isNaN(numA) && !isNaN(numB);

      let result = isNumeric
        ? numA - numB
        : valA.localeCompare(valB);

      return currentSort.asc ? result : -result;
    });

    // Flip direction
    currentSort.column = index;
    currentSort.asc = !currentSort.asc;

    // Append sorted rows
    const tbody = document.querySelector("#leadsTable tbody");
    tbody.innerHTML = "";
    rows.forEach(row => tbody.appendChild(row));
  });
});

// 🟢 Initial
renderLeads();
setTimeout(addSortingListeners, 100); // Give DOM time to render

function addSortingListeners() {
  const headers = document.querySelectorAll("#leadsTable th");
  let currentSort = { column: null, asc: true };

  headers.forEach((th, index) => {
    if (index === 0) return; // Skip checkbox

    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
      const rows = Array.from(document.querySelectorAll("#leadsTable tbody tr"));

      rows.sort((a, b) => {
        const valA = a.children[index].textContent.toLowerCase();
        const valB = b.children[index].textContent.toLowerCase();

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const isNumeric = !isNaN(numA) && !isNaN(numB);

        let result = isNumeric ? numA - numB : valA.localeCompare(valB);
        return currentSort.asc ? result : -result;
      });

      currentSort.column = index;
      currentSort.asc = !currentSort.asc;

      const tbody = document.querySelector("#leadsTable tbody");
      tbody.innerHTML = "";
      rows.forEach(row => tbody.appendChild(row));
    });
  });
}

