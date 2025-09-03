(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    form: $('#add-form'),
    name: $('#nameInput'),
    ects: $('#ectsInput'),
    grade: $('#gradeInput'),
    tbody: $('#coursesBody'),
    avgWeighted: $('#avgWeighted'),
    totalEcts: $('#totalEcts'),
    passedCount: $('#passedCount'),
    totalCourses: $('#totalCourses'),
    clearBtn: $('#clearBtn'),
    exportBtn: $('#exportBtn'),
    importFile: $('#importFile'),
    printBtn: $('#printBtn'),
    demoBtn: $('#demoBtn'),
    table: $('#coursesTable'),
  };

  const STORAGE_KEY = 'mystudies-data-v1';
  let courses = [];
  let sortState = { key: 'name', asc: true };

  // --- Utilities
  const toNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val !== 'string') return NaN;
    // δέχεται και κόμμα ως δεκαδικό
    const cleaned = val.replace(',', '.').trim();
    return cleaned === '' ? NaN : Number(cleaned);
  };

  const format = (num, digits = 2) => {
    if (!isFinite(num)) return '—';
    return num.toLocaleString('el-GR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      courses = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      courses = [];
    }
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // --- Core
  const addCourse = (name, ects, grade) => {
    const c = {
      id: uid(),
      name: String(name || '').trim(),
      ects: clamp(Number.isFinite(ects) ? ects : 0, 0, 60),
      grade: clamp(Number.isFinite(grade) ? grade : 0, 0, 10),
    };
    courses.push(c);
    persistAndRender();
  };

  const updateCourse = (id, field, value) => {
    const c = courses.find(x => x.id === id);
    if (!c) return;
    if (field === 'name') {
      c.name = String(value || '').trim();
    } else if (field === 'ects') {
      const v = clamp(toNumber(value), 0, 60);
      c.ects = Number.isFinite(v) ? v : c.ects;
    } else if (field === 'grade') {
      const v = clamp(toNumber(value), 0, 10);
      c.grade = Number.isFinite(v) ? v : c.grade;
    }
    persistAndRender();
  };

  const deleteCourse = (id) => {
    courses = courses.filter(c => c.id !== id);
    persistAndRender();
  };

  const clearAll = () => {
    if (!confirm('Θέλεις σίγουρα να διαγραφούν ΟΛΑ τα μαθήματα;')) return;
    courses = [];
    persistAndRender();
  };

  const stats = () => {
    const totalECTS = courses.reduce((s, c) => s + (c.ects || 0), 0);
    const weightedSum = courses.reduce((s, c) => s + (c.grade * (c.ects || 0)), 0);
    const avg = totalECTS > 0 ? (weightedSum / totalECTS) : NaN;
    const passed = courses.filter(c => (c.grade ?? 0) >= 5).length;
    return { totalECTS, avg, passed, total: courses.length };
  };

  const sortCourses = () => {
    const { key, asc } = sortState;
    const dir = asc ? 1 : -1;
    courses.sort((a, b) => {
      let A = a[key], B = b[key];
      if (key === 'name') {
        A = (A || '').toLocaleLowerCase('el-GR');
        B = (B || '').toLocaleLowerCase('el-GR');
        if (A < B) return -1 * dir;
        if (A > B) return  1 * dir;
        return 0;
      } else {
        // numeric (ects/grade)
        return ((A || 0) - (B || 0)) * dir;
      }
    });
  };

  const render = () => {
    sortCourses();

    // rows
    els.tbody.innerHTML = '';
    for (const c of courses) {
      const tr = document.createElement('tr');

      // name
      const tdName = document.createElement('td');
      const inpName = document.createElement('input');
      inpName.className = 'row-input';
      inpName.type = 'text';
      inpName.value = c.name;
      inpName.placeholder = 'Όνομα μαθήματος';
      inpName.dataset.id = c.id;
      inpName.dataset.field = 'name';
      tdName.appendChild(inpName);

      // ects
      const tdEcts = document.createElement('td');
      tdEcts.className = 'num';
      const inpEcts = document.createElement('input');
      inpEcts.className = 'row-input';
      inpEcts.type = 'number';
      inpEcts.min = '0'; inpEcts.max = '60'; inpEcts.step = '0.5';
      inpEcts.value = c.ects;
      inpEcts.dataset.id = c.id;
      inpEcts.dataset.field = 'ects';
      tdEcts.appendChild(inpEcts);

      // grade
      const tdGrade = document.createElement('td');
      tdGrade.className = 'num';
      const inpGrade = document.createElement('input');
      inpGrade.className = 'row-input';
      inpGrade.type = 'number';
      inpGrade.min = '0'; inpGrade.max = '10'; inpGrade.step = '0.1';
      inpGrade.value = c.grade;
      inpGrade.dataset.id = c.id;
      inpGrade.dataset.field = 'grade';
      tdGrade.appendChild(inpGrade);

      // status
      const tdStatus = document.createElement('td');
      tdStatus.className = 'center';
      const badge = document.createElement('span');
      const passed = (c.grade ?? 0) >= 5;
      badge.className = `badge ${passed ? 'pass' : 'fail'}`;
      badge.textContent = passed ? 'Πέρασε' : 'Απέτυχε';
      tdStatus.appendChild(badge);

      // actions
      const tdAct = document.createElement('td');
      tdAct.className = 'center';
      const delBtn = document.createElement('button');
      delBtn.className = 'btn danger';
      delBtn.textContent = 'Διαγραφή';
      delBtn.dataset.id = c.id;
      delBtn.dataset.action = 'delete';
      tdAct.appendChild(delBtn);

      tr.append(tdName, tdEcts, tdGrade, tdStatus, tdAct);
      els.tbody.appendChild(tr);
    }

    // stats
    const s = stats();
    els.avgWeighted.textContent = format(s.avg);
    els.totalEcts.textContent = format(s.totalECTS, 1);
    els.passedCount.textContent = s.passed;
    els.totalCourses.textContent = s.total;
  };

  const persistAndRender = () => { save(); render(); };

  // --- Events
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.name.value;
    const ects = toNumber(els.ects.value);
    const grade = toNumber(els.grade.value);

    if (!name.trim()) { alert('Γράψε όνομα μαθήματος.'); return; }
    if (!Number.isFinite(ects)) { alert('Δώσε έγκυρα ECTS.'); return; }
    if (!Number.isFinite(grade)) { alert('Δώσε έγκυρο βαθμό (0–10).'); return; }

    addCourse(name, ects, grade);

    els.name.value = '';
    els.ects.value = '';
    els.grade.value = '';
    els.name.focus();
  });

  // delegate input edits
  els.tbody.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const id = t.dataset.id;
    const field = t.dataset.field;
    if (!id || !field) return;
    updateCourse(id, field, t.value);
  });

  // actions (delete)
  els.tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'delete') {
      deleteCourse(btn.dataset.id);
    }
  });

  // sorting
  $$('#coursesTable thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (sortState.key === key) {
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = key;
        sortState.asc = true;
      }
      render();
    });
  });

  // clear all
  els.clearBtn.addEventListener('click', clearAll);

  // export
  els.exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(courses, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mystudies-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // import
  els.importFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Μη έγκυρη μορφή αρχείου.');

      const normalized = data.map(x => ({
        id: uid(),
        name: String(x.name || '').trim(),
        ects: clamp(toNumber(x.ects), 0, 60),
        grade: clamp(toNumber(x.grade), 0, 10),
      }));

      if (!confirm('Να αντικατασταθούν τα τωρινά μαθήματα με αυτά του αρχείου;')) return;
      courses = normalized;
      persistAndRender();
      e.target.value = '';
    } catch (err) {
      alert('Αποτυχία import: ' + (err?.message || 'Άγνωστο σφάλμα'));
    }
  });

  // print
  els.printBtn.addEventListener('click', () => window.print());

  // demo data
  els.demoBtn.addEventListener('click', () => {
    if (!confirm('Να φορτωθούν παραδείγματα μαθημάτων; (Θα προστεθούν στα υπάρχοντα)')) return;
    const demo = [
      { name: 'Γραμμική Άλγεβρα', ects: 6, grade: 7.5 },
      { name: 'Δομές Δεδομένων', ects: 6, grade: 8.0 },
      { name: 'Λειτουργικά Συστήματα', ects: 6, grade: 6.0 },
      { name: 'Ανάλυση ΙΙ', ects: 5, grade: 4.5 },
      { name: 'Βάσεις Δεδομένων', ects: 6, grade: 9.3 },
    ];
    for (const d of demo) addCourse(d.name, d.ects, d.grade);
  });

  // init
  load();
  render();
})();
