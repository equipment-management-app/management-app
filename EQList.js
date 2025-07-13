const GAS_URL = 'https://script.google.com/macros/s/AKfycbzDN3bl22jj1gENDp6dkdm5Yg6Cqu9boj-GZCEA-k8KWEAbGF4eu673aB1agcRNo2-QlA/exec';
let confirmAction = null;
let fullEquipmentListData = [];
let filteredEquipmentListData = [];
let currentEqListPage = 1;
const eqListItemsPerPage = 10;

// カテゴリごとの色を定義 (21色)
const categoryColors = [
    "#E57373", "#F06292", "#BA68C8", "#9575CD", "#7986CB", "#64B5F6",
    "#4FC3F7", "#4DD0E1", "#4DB6AC", "#81C784", "#AED581", "#DCE775",
    "#FFF176", "#FFD54F", "#FFB74D", "#FF8A65", "#A1887F", "#B0BEC5",
    "#90A4AE", "#B39DDB", "#F48FB1",
    "#FFAB91", "#FFCC80", "#E6EE9C", "#C5E1A5", "#A5D6A7", "#80CBC4", "#80DEEA"
];

// ご指定のカテゴリ名を配列として定義
const CATEGORY_NAMES = [
    "ミキサー", "I/Oラック", "プロセッサー", "イーサネットケーブル", "パワーアンプ",
    "スピーカー", "スピーカースタンド", "スピーカーケーブル", "マイク", "マイクアクセサリー",
    "マイクスタンド", "マイクケーブル", "ダイレクトボックス", "プレイバック", "ワイヤレス",
    "マルチケーブル", "ケーブル", "電源", "アクセサリー", "リギング", "ツール",
    "カメラ", "スイッチャー", "PC", "ケーブル", "コンバーター", "モニター", "周辺機器"
];

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

/*
function showModal(title, message, type = 'alert', onConfirm = null) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;
    const okButton = document.getElementById('modalOkButton');
    const confirmButton = document.getElementById('modalConfirmButton');
    const cancelButton = document.getElementById('modalCancelButton');

    okButton.style.display = 'none';
    confirmButton.style.display = 'none';
    cancelButton.style.display = 'none';

    if (type === 'alert') {
        okButton.style.display = 'inline-block';
    } else if (type === 'confirm') {
        confirmButton.style.display = 'inline-block';
        cancelButton.style.display = 'inline-block';
        confirmAction = onConfirm;
        confirmButton.onclick = () => {
            if (confirmAction) confirmAction();
            closeModal();
        };
    }
    document.getElementById('customModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('customModal').style.display = 'none';
    confirmAction = null;
}

window.onclick = function (event) {
    if (event.target == document.getElementById('customModal')) {
        closeModal();
    }
}
*/

function fetchData(formData) {
    showLoading(true);
    return fetch(GAS_URL, {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            throw error;
        })
        .finally(() => {
            showLoading(false);
        });
}

function createEquipmentTable(equipmentData) {
    if (!Array.isArray(equipmentData) || equipmentData.length === 0) {
        return '<div class="text-center text-gray-500 p-4">機材データがありません</div>';
    }
    let tableHtml = `
        <div class="overflow-x-auto shadow-md rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">機材名</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">総数</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">使用中</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">利用可能</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">単価</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">総額</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">稼働率</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">`;

    equipmentData.forEach(equipment => {
        const equipmentId = equipment.id || 0;
        const total = equipment.total || 0;
        const inUse = equipment.inUse || 0;
        const available = equipment.stock !== undefined ? equipment.stock : (total - inUse);
        const unitPrice = equipment.unitPrice;

        const categoryIndex = Math.floor((equipmentId - 1) / 1000);
        const color = categoryIndex >= 0 && categoryIndex < categoryColors.length ? categoryColors[categoryIndex] : '#000000';

        let displayUnitPrice;
        let displayTotalValue;

        if (unitPrice === 'manual') {
            displayUnitPrice = 'マニュアル';
            displayTotalValue = 'マニュアル';
        } else {
            const numericUnitPrice = Number(unitPrice) || 0;
            const totalValue = total * numericUnitPrice;
            displayUnitPrice = `¥${numericUnitPrice.toLocaleString()}`;
            displayTotalValue = `¥${totalValue.toLocaleString()}`;
        }

        const utilizationRate = total > 0 ? ((inUse / total) * 100).toFixed(1) : '0.0';
        let rateColorClass = 'text-green-600';
        if (utilizationRate > 80) rateColorClass = 'text-red-600';
        else if (utilizationRate > 50) rateColorClass = 'text-yellow-600';

        tableHtml += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-bold" style="color: ${color};">${equipmentId}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">${equipment.name || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${total.toLocaleString()}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">${inUse.toLocaleString()}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">${available.toLocaleString()}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${displayUnitPrice}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">${displayTotalValue}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium ${rateColorClass}">${utilizationRate}%</td>
            </tr>`;
    });
    tableHtml += `</tbody></table></div>`;
    return tableHtml;
}

function displayResult(elementId, data, successMessage, errorMessagePrefix = "Error") {
    const resultArea = document.getElementById(elementId);
    resultArea.innerHTML = '';

    if (data && data.success) {
        let content = `<div class="p-3 mb-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">${successMessage}</div>`;
        if (elementId === 'equipmentListResult' && Array.isArray(data.data)) {
            content += createEquipmentTable(data.data);
        }
        resultArea.innerHTML = content;
    } else if (data && data.error) {
        resultArea.innerHTML = `<div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">${errorMessagePrefix}: ${data.error}
                ${data.data ? `<pre class="bg-gray-100 p-2 rounded text-xs font-mono mt-2 max-h-40 overflow-y-auto">${JSON.stringify(data.data, null, 2)}</pre>` : ''}
            </div>`;
    } else if (data) {
        resultArea.innerHTML = `<div class="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">完了しましたが、予期しないレスポンス形式です。
                <pre class="bg-gray-100 p-2 rounded text-xs font-mono mt-2 max-h-40 overflow-y-auto">${JSON.stringify(data, null, 2)}</pre>
            </div>`;
    }
    else {
        resultArea.innerHTML = `<div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">${errorMessagePrefix}: 通信に失敗しました。詳細はコンソールを確認してください。</div>`;
    }
}

function populateEquipmentDatalist(equipmentData) {
    const datalist = document.getElementById('equipmentNameList');
    datalist.innerHTML = '';

    if (Array.isArray(equipmentData)) {
        equipmentData.forEach(eq => {
            const option = document.createElement('option');
            option.value = eq.name;
            datalist.appendChild(option);
        });
    }
}

function getEquipmentList() {
    const resultAreaId = "equipmentListResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 取得中...</div>`;
    const formData = new FormData();
    formData.append('type', 'getEquipmentList');

    fetchData(formData)
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                data.data.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

                fullEquipmentListData = data.data;
                filteredEquipmentListData = [...fullEquipmentListData];
                populateEquipmentDatalist(fullEquipmentListData);
                populateTagFilter();
                currentEqListPage = 1;
                renderEquipmentListPage();
            } else {
                displayResult(resultAreaId, data, "機材リスト取得成功:", "機材リスト取得失敗");
            }
        })
        .catch(error => displayResult(resultAreaId, { error: error.message }, "", `機材リスト取得失敗`));
}

function registerEquipment() {
    const resultAreaId = "registerEquipmentResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 登録中...</div>`;
    const form = document.getElementById('registerEquipmentForm');

    const category = form.elements['regEqCategory'].value;
    const name = form.elements['regEqName'].value.trim();
    const total = form.elements['regEqTotal'].value;
    const tag = form.elements['regEqTag'].value;

    const isManual = form.elements['regEqManualPrice'].checked;
    const unitPrice = isManual ? 'manual' : form.elements['regEqUnitPrice'].value;

    if (!category || !name || !total || !unitPrice || !tag) {
        showModal("入力エラー", "カテゴリ、機材名、総数、単価、タグをすべて入力してください。");
        displayResult(resultAreaId, { error: "必須項目が不足しています。" }, "", "入力エラー");
        return;
    }

    const formData = new FormData();
    formData.append('type', 'registerEquipment');
    formData.append('category', category);
    formData.append('name', name);
    formData.append('total', total);
    formData.append('unitPrice', unitPrice);
    formData.append('tag', tag);

    fetchData(formData)
        .then(data => {
            displayResult(resultAreaId, data, "機材登録成功:", "機材登録失敗");
            if (data.success) {
                form.reset();
                getEquipmentList();
                //showModal("成功", "機材を登録しました。");
            }
        })
        .catch(error => displayResult(resultAreaId, { error: error.message }, "", `機材登録失敗`));
}

function changeEquipmentInfo() {
    const resultAreaId = "changeEquipmentResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 変更中...</div>`;
    const form = document.getElementById('changeEquipmentForm');

    const newCategory = form.elements['changeEqCategory'].value;
    const name = form.elements['changeEqName'].value;
    const quantity = form.elements['changeEqQuantity'].value;
    const tag = form.elements['changeEqTag'].value;

    const isManual = form.elements['changeEqManualPrice'].checked;
    const unitPrice = isManual ? 'manual' : form.elements['changeEqUnitPrice'].value;

    if (!name || !newCategory || !quantity || !unitPrice || !tag) {
        showModal("入力エラー", "機材名、新しいカテゴリ、総数、単価、新しいタグをすべて入力してください。");
        displayResult(resultAreaId, { error: "必須項目が不足しています。" }, "", "入力エラー");
        return;
    }

    const formData = new FormData();
    formData.append('type', 'changeInfo');
    formData.append('name', name);
    formData.append('newCategory', newCategory);
    formData.append('quantity', quantity);
    formData.append('unitPrice', unitPrice);
    formData.append('tag', tag);

    fetchData(formData)
        .then(data => {
            displayResult(resultAreaId, data, "機材情報変更成功:", "機材情報変更失敗");
            if (data.success) {
                form.reset();
                getEquipmentList();
                showModal("成功", "機材情報を変更しました。");
            }
        })
        .catch(error => displayResult(resultAreaId, { error: error.message }, "", `機材情報変更失敗`));
}

function populateCategorySelects() {
    const regSelect = document.getElementById('regEqCategory');
    const changeSelect = document.getElementById('changeEqCategory');
    let optionsHtml = '<option value="">選択してください</option>';

    CATEGORY_NAMES.forEach((name, index) => {
        const categoryNumber = index + 1;

        optionsHtml += `<option value="${categoryNumber}">${name}</option>`;
    });

    if (regSelect) regSelect.innerHTML = optionsHtml;
    if (changeSelect) changeSelect.innerHTML = optionsHtml;
}

document.addEventListener('DOMContentLoaded', () => {
    populateCategorySelects();
    getEquipmentList();

    // 「機材登録」フォームの要素
    const regUnitPriceInput = document.getElementById('regEqUnitPrice');
    const regManualCheckbox = document.getElementById('regEqManualPrice');

    // 「機材情報変更」フォームの要素
    const changeUnitPriceInput = document.getElementById('changeEqUnitPrice');
    const changeManualCheckbox = document.getElementById('changeEqManualPrice');

    // 「機材登録」フォームのチェックボックス操作 
    regManualCheckbox.addEventListener('change', function () {
        regUnitPriceInput.disabled = this.checked;
        if (this.checked) {
            regUnitPriceInput.value = '';
            regUnitPriceInput.required = false;
        } else {
            regUnitPriceInput.required = true;
        }
    });

    // 「機材情報変更」フォームのチェックボックス操作
    changeManualCheckbox.addEventListener('change', function () {
        changeUnitPriceInput.disabled = this.checked;
        if (this.checked) {
            changeUnitPriceInput.value = '';
            changeUnitPriceInput.required = false;
        } else {
            changeUnitPriceInput.required = true;
        }
    });

    // --- 「機材情報変更」で機材を選択した際のイベントリスナー ---
    document.getElementById('changeEqName').addEventListener('input', function () {
        const selectedName = this.value;
        const quantityInput = document.getElementById('changeEqQuantity');
        const tagInput = document.getElementById('changeEqTag');
        const categoryInput = document.getElementById('changeEqCategory');

        const selectedEquipment = fullEquipmentListData.find(eq => eq.name === selectedName);

        if (selectedEquipment) {
            // --- 既存のロジック ---
            quantityInput.value = selectedEquipment.total;
            tagInput.value = selectedEquipment.tag || '';
            const categoryId = Math.floor((selectedEquipment.id - 1) / 1000) + 1;
            categoryInput.value = categoryId;

            // 単価とチェックボックスの状態を反映
            if (selectedEquipment.unitPrice === 'manual') {
                // 手動設定の場合
                changeManualCheckbox.checked = true;
                changeUnitPriceInput.disabled = true;
                changeUnitPriceInput.value = '';
                changeUnitPriceInput.required = false;
            } else {
                // 固定単価の場合
                changeManualCheckbox.checked = false;
                changeUnitPriceInput.disabled = false;
                changeUnitPriceInput.value = selectedEquipment.unitPrice;
                changeUnitPriceInput.required = true;
            }

        } else {
            quantityInput.value = '';
            unitPriceInput.value = '';
            tagInput.value = '';
            categoryInput.value = '';
            changeManualCheckbox.checked = false;
            changeUnitPriceInput.disabled = false;
            changeUnitPriceInput.required = true;
        }
    });
});

function renderEquipmentListPage() {
    const resultArea = document.getElementById('equipmentListResult');
    resultArea.innerHTML = '';

    if (!filteredEquipmentListData || filteredEquipmentListData.length === 0) {
        resultArea.innerHTML = '<div class="text-center text-gray-500 p-4">該当する機材データがありません</div>';
        updateEqListPaginationControls();
        return;
    }

    const startIndex = (currentEqListPage - 1) * eqListItemsPerPage;
    const endIndex = startIndex + eqListItemsPerPage;
    const paginatedData = filteredEquipmentListData.slice(startIndex, endIndex);

    resultArea.innerHTML = createEquipmentTable(paginatedData);

    updateEqListPaginationControls();
}

function updateEqListPaginationControls() {
    const controlsContainer = document.getElementById('eqListPaginationControls');
    const infoDiv = document.getElementById('eqListInfo');
    const prevButton = document.getElementById('prevEqPageButton');
    const nextButton = document.getElementById('nextEqPageButton');

    if (filteredEquipmentListData.length <= eqListItemsPerPage) {
        controlsContainer.style.display = 'none';
        return;
    }

    controlsContainer.style.display = 'flex';
    const totalPages = Math.ceil(filteredEquipmentListData.length / eqListItemsPerPage);

    prevButton.disabled = (currentEqListPage === 1);
    nextButton.disabled = (currentEqListPage === totalPages);

    const startItem = (currentEqListPage - 1) * eqListItemsPerPage + 1;
    const endItem = Math.min(startItem + eqListItemsPerPage - 1, filteredEquipmentListData.length);
    infoDiv.textContent = `全 ${filteredEquipmentListData.length} 件中 ${startItem} - ${endItem} 件を表示`;
}

function nextEqPage() {
    const totalPages = Math.ceil(filteredEquipmentListData.length / eqListItemsPerPage);
    if (currentEqListPage < totalPages) {
        currentEqListPage++;
        renderEquipmentListPage();
    }
}

function prevEqPage() {
    if (currentEqListPage > 1) {
        currentEqListPage--;
        renderEquipmentListPage();
    }
}

function populateTagFilter() {
    const select = document.getElementById('tagFilter');
    const allTags = new Set(fullEquipmentListData.map(item => item.tag || '未分類'));

    // 現在選択されている値を取得
    const selectedValue = select.value;

    select.innerHTML = '<option value="all">すべてのタグ</option>';
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });

    // 以前の選択状態を復元
    if (selectedValue) {
        select.value = selectedValue;
    }
}

function applyTagFilter() {
    const selectedTag = document.getElementById('tagFilter').value;

    if (selectedTag === 'all') {
        filteredEquipmentListData = [...fullEquipmentListData];
    } else {
        filteredEquipmentListData = fullEquipmentListData.filter(item => (item.tag || '未分類') === selectedTag);
    }

    currentEqListPage = 1;
    renderEquipmentListPage();
}