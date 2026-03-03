document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('itemSearch');
    const dropdownList = document.getElementById('dropdownList');
    const hiddenInput = document.getElementById('selectedItemId');
    const monthSelect = document.getElementById('monthSelect');
    const daySelect = document.getElementById('daySelect');
    const form = document.getElementById('predictionForm');
    const resultDiv = document.getElementById('result');

    let items = [];

    // 1. Fetch CSV and Parse
    async function loadItems() {
        try {
            const response = await fetch('../items.csv');
            const data = await response.text();
            const rows = data.split('\n').slice(1); // Exclude header
            items = rows.map(row => {
                const cols = row.split(',');
                return { 
                    id: cols[0]?.trim(), 
                    name: cols[2]?.trim() 
                };
            }).filter(item => item.id && item.name);
        } catch (error) {
            console.error('Error loading CSV:', error);
        }
    }

    // 2. Dynamic Day Population based on Month
    monthSelect.addEventListener('change', () => {
        const month = parseInt(monthSelect.value);
        const year = new Date().getFullYear(); // Static context year
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        daySelect.innerHTML = '<option value="" disabled selected>--</option>';
        for (let i = 1; i <= daysInMonth; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            daySelect.appendChild(opt);
        }
    });

    // 3. Searchable Select Rendering
    function renderDropdown(filter = "") {
        dropdownList.innerHTML = '';
        const filtered = items.filter(i => 
            i.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length > 0) {
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = item.name;
                // Use mousedown to prevent blur from closing list before selection
                div.addEventListener('mousedown', (e) => {
                    searchInput.value = item.name;
                    hiddenInput.value = item.id;
                    dropdownList.style.display = 'none';
                });
                dropdownList.appendChild(div);
            });
            dropdownList.style.display = 'block';
        } else {
            dropdownList.style.display = 'none';
        }
    }

    searchInput.addEventListener('focus', () => renderDropdown(searchInput.value));
    searchInput.addEventListener('input', (e) => renderDropdown(e.target.value));
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            dropdownList.style.display = 'none';
        }
    });

    // 4. Form Submission (POST)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            item_id: parseInt(hiddenInput.value),
            month_index: parseInt(monthSelect.value)+1,
            day: parseInt(daySelect.value)
        };

        if (!payload.item_id) {
            alert("Please select a valid item from the list.");
            return;
        }

        // UI Feedback
        resultDiv.style.display = "block";
        resultDiv.innerHTML = `<p style="color: var(--primary)">Processing prediction...</p>`;

        try {
            const response = await fetch('/api/get-prediction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Server Error");

            const data = await response.json();
            resultDiv.innerHTML = `<strong>Prediction Result:</strong> ${data.prediction || 'Success'}`;
        } catch (err) {
            resultDiv.innerHTML = `<span style="color: #dc2626">Error: Unable to connect to model API.</span>`;
        }
    });

    loadItems();
});