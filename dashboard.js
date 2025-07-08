// 📍 dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  const emailRegex = /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
  const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  let uniqueLinks = new Set();

  function renderLeads() {
    chrome.storage.local.get(['leads'], (result) => {
      const leads = result.leads || [];
      const emails = [], socials = [];

      leads.forEach(item => {
        if (emailRegex.test(item)) emails.push(item);
        else socials.push(item);
      });

      const tableBody = document.querySelector('#leadsTable tbody');
      tableBody.innerHTML = '';
      uniqueLinks = new Set(); // reset for every render

      const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
      const platform = document.getElementById('platformFilter')?.value || 'all';
      const filterStrong = document.getElementById('filterStrongSocials')?.checked || false;
      const filterBusiness = document.getElementById('filterBusinessOnly')?.checked || false;

      function addRow(type, value, score, domain, tag) {
        const fullText = `${type} ${value} ${score} ${domain} ${tag}`.toLowerCase();
        if (query && !fullText.includes(query)) return;

        const tr = document.createElement('tr');

        const checkboxTd = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'leadCheckbox';
        checkbox.dataset.value = value;
        checkboxTd.appendChild(checkbox);
        tr.appendChild(checkboxTd);

        [type, value, score, domain || '', tag || ''].forEach(txt => {
          const td = document.createElement('td');
          td.textContent = txt;
          tr.appendChild(td);
        });

        tableBody.appendChild(tr);
      }

      // 📧 Emails
      emails.forEach(email => {
        let score = 0, tag = "";
        const [user, domain] = email.toLowerCase().split('@');

        if (/ceo|founder|owner|cofounder|md|director/.test(user)) {
          score += 10;
          tag = "Founder Email";
        }

        if (!personalDomains.includes(domain)) score += 5;
        if (/\.(io|ai|tech)$/.test(domain)) score += 5;

        if (!tag && score >= 10) tag = "Likely Founder";
        if (!tag && score <= 4) tag = "Low Signal";

        if (filterStrong && score < 5) return;
        if (filterBusiness && personalDomains.includes(domain)) return;
        if (platform !== 'all' && platform !== 'email') return;

        addRow("Email", email, score, domain, tag);
      });

      // 🔗 Socials
      socials.forEach(link => {
        let score = 0, tag = "", type = "Social";
        const url = link.toLowerCase().replace("https://x.com", "https://twitter.com");
        const normalized = url.split('?')[0].split('#')[0].replace(/\/+$/, "");

        if (uniqueLinks.has(normalized)) return;
        uniqueLinks.add(normalized);

        if (url.includes("linkedin.com")) {
          type = "LinkedIn"; score += 5;
          if (/founder|ceo|startup/.test(url)) {
            score += 5;
            tag = "Founder Profile";
          }
        } else if (url.includes("twitter.com")) {
          type = "Twitter"; score += 3;
          if (/build|tech|founder/.test(url)) {
            score += 2;
            tag = "Tech Profile";
          }
        } else if (url.includes("github.com")) {
          type = "GitHub";
        } else if (url.includes("angel.co") || url.includes("angellist.com")) {
          type = "AngelList";
        } else {
          return; // skip YouTube/Instagram/etc.
        }

        if (!tag && score >= 10) tag = "Likely Founder";
        if (!tag && score <= 4) tag = "Low Signal";

        if (filterStrong && score < 5) return;
        if (
          (platform === 'linkedin' && type !== 'LinkedIn') ||
          (platform === 'twitter' && type !== 'Twitter') ||
          (platform === 'github' && type !== 'GitHub') ||
          (platform === 'angellist' && type !== 'AngelList') ||
          (platform === 'email')
        ) return;

        addRow(type, link, score, "", tag);
      });

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

  // ✅ Copy/Download listeners
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

  // 🟢 Initial render
  renderLeads();
});
