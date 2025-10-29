// ===== Teacher Mode Panel =====
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const tabSections = document.querySelectorAll('.tab');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      tabSections.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Reference Search
  const refBtn = document.getElementById('searchRef');
  const refQuery = document.getElementById('refQuery');
  const refResults = document.getElementById('refResults');
  const apiField = document.getElementById('teacherApiUrl');

  refBtn.addEventListener('click', async () => {
    const api = apiField.value.trim();
    const q = refQuery.value.trim();
    if (!api || !q) return alert('Enter API URL and query.');
    refResults.innerHTML = `<li>Searching...</li>`;
    try {
      const resp = await fetch(`${api}/api/reference?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      refResults.innerHTML = data.map(d => `<li>${escapeHtml(d.text)}</li>`).join('');
      if (!data.length) refResults.innerHTML = `<li>No references found.</li>`;
    } catch (err) {
      refResults.innerHTML = `<li>Error: ${escapeHtml(err.message)}</li>`;
    }
  });

  // Auto-Grader
  const gradeBtn = document.getElementById('gradeBtn');
  const question = document.getElementById('question');
  const expected = document.getElementById('expected');
  const studentAns = document.getElementById('studentAns');
  const gradeResult = document.getElementById('gradeResult');

  gradeBtn.addEventListener('click', async () => {
    const api = apiField.value.trim();
    if (!api) return alert('Enter backend API URL.');
    const body = {
      question: question.value.trim(),
      expected: expected.value.trim(),
      student: studentAns.value.trim()
    };
    if (!body.question || !body.expected || !body.student)
      return alert('Please fill all fields.');

    gradeResult.textContent = 'Grading... ⏳';
    try {
      const resp = await fetch(`${api}/api/grade`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error(await resp.text());
      const result = await resp.json();
      gradeResult.innerHTML = `
        <b>Similarity:</b> ${escapeHtml(result.similarity)}<br>
        <b>Marks:</b> ${escapeHtml(String(result.marks))}/5<br>
        <b>Feedback:</b> ${escapeHtml(result.feedback)}
      `;
    } catch (err) {
      gradeResult.textContent = 'Error grading: ' + err.message;
    }
  });

  function escapeHtml(s){ return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
});
