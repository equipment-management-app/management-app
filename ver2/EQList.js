const GAS_URL = 'https://script.google.com/macros/s/AKfycbyS7lLhCwGsPgW9XXvTOcJZ4mfNTgsZUeSUV7th3are3loBlCdbtnmpQ4IjeWoBdz9Q/exec';
let confirmAction = null;
let fullEquipmentListData = [];
let filteredEquipmentListData = [];
let currentEqListPage = 1;
const eqListItemsPerPage = 10;

// --- 省略 (モーダル、fetchDataなどの基本関数は変更なし) ---
const modal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalOkButton = document.getElementById('modalOkButton');
const modalConfirmButton = document.getElementById('modalConfirmButton');
const modalCancelButton = document.getElementById('modalCancelButton');
const loadingOverlay = document.getElementById('loadingOverlay');

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showModal(title, message, type = 'alert', onConfirm = null) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    modalOkButton.style.display = 'none';
    modalConfirmButton.style.display = 'none';
    modalCancelButton.style.display = 'none';

    if (type === 'alert') {
        modalOkButton.style.display = 'inline-block';
    } else if (type === 'confirm') {
        modalConfirmButton.style.display = 'inline-block';
        modalCancelButton.style.display = 'inline-block';
        confirmAction = onConfirm;
        modalConfirmButton.onclick = () => {
            if (confirmAction) confirmAction();
            closeModal();
        };
    }
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    confirmAction = null;
}

window.onclick = function (event) {
    if (event.target == modal) {
        closeModal();
    }
}

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
            throw error; // Re-throw to be caught by calling function
        })
        .finally(() => {
            showLoading(false);
        });
}



// --- Table Creation Functions ---
function createEquipmentTable(equipmentData) {
    if (!Array.isArray(equipmentData) || equipmentData.length === 0) {
        return '<div class="text-center text-gray-500 p-4">機材データがありません</div>';
    }
    let tableHtml = `
            <div class="overflow-x-auto shadow-md rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-200">
                        <tr>
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
        const total = equipment.total || 0;
        const inUse = equipment.inUse || 0;
        const available = total - inUse;
        const unitPrice = equipment.unitPrice;
        const tag = equipment.tag || '未分類';

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

// --- Display Result Function ---
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

// 関数名を変更し、datalistを生成するように修正
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


// 既存の getEquipmentList 関数を、以下の内容で置き換える

function getEquipmentList() {
    const resultAreaId = "equipmentListResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 取得中...</div>`;
    const formData = new FormData();
    formData.append('type', 'getEquipmentList');

    fetchData(formData)
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                fullEquipmentListData = data.data;
                filteredEquipmentListData = [...fullEquipmentListData];
                populateEquipmentDatalist(fullEquipmentListData);
                populateTagFilter();
                currentEqListPage = 1;
                renderEquipmentListPage();
            } else {
                // 失敗した場合の表示
                displayResult(resultAreaId, data, "機材リスト取得成功:", "機材リスト取得失敗");
            }
        })
        .catch(error => displayResult(resultAreaId, { error: error.message }, "", `機材リスト取得失敗`));
}

function registerEquipment() {
    const resultAreaId = "registerEquipmentResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 登録中...</div>`;
    const form = document.getElementById('registerEquipmentForm');
    const name = form.elements['regEqName'].value.trim();
    const total = form.elements['regEqTotal'].value;
    const unitPrice = form.elements['regEqUnitPrice'].value;
    const tag = form.elements['regEqTag'].value;

    if (!name || !total || !unitPrice || !tag) {
        showModal("入力エラー", "機材名、総数、単価、タグをすべて入力してください。");
        displayResult(resultAreaId, { error: "必須項目が不足しています。" }, "", "入力エラー");
        return;
    }

    const formData = new FormData();
    formData.append('type', 'registerEquipment');
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
                showModal("成功", "機材を登録しました。");
            }
        })
        .catch(error => displayResult(resultAreaId, { error: error.message }, "", `機材登録失敗`));
}

function changeEquipmentInfo() {
    const resultAreaId = "changeEquipmentResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 変更中...</div>`;
    const form = document.getElementById('changeEquipmentForm');
    const name = form.elements['changeEqName'].value;
    const quantity = form.elements['changeEqQuantity'].value;
    const unitPrice = form.elements['changeEqUnitPrice'].value;
    const tag = form.elements['changeEqTag'].value;

    if (!name || !quantity || !unitPrice || !tag) {
        showModal("入力エラー", "機材名、総数、単価、新しいタグをすべて入力してください。");
        displayResult(resultAreaId, { error: "必須項目が不足しています。" }, "", "入力エラー");
        return;
    }

    const formData = new FormData();
    formData.append('type', 'changeInfo');
    formData.append('name', name);
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

document.addEventListener('DOMContentLoaded', () => {
    getEquipmentList();

    document.getElementById('changeEqName').addEventListener('input', function () {
        const selectedName = this.value;
        const quantityInput = document.getElementById('changeEqQuantity');
        const unitPriceInput = document.getElementById('changeEqUnitPrice');
        const tagInput = document.getElementById('changeEqTag');

        const selectedEquipment = fullEquipmentListData.find(eq => eq.name === selectedName);

        if (selectedEquipment) {
            quantityInput.value = selectedEquipment.total;
            tagInput.value = selectedEquipment.tag || '';
            if (selectedEquipment.unitPrice === 'manual') {
                unitPriceInput.value = '';
            } else {
                unitPriceInput.value = selectedEquipment.unitPrice;
            }
        } else {
            quantityInput.value = '';
            unitPriceInput.value = '';
            tagInput.value = '';
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

/**
 * ページネーションコントロール（ボタンの有効/無効、情報テキスト）を更新する
 */
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
    const endItem = Math.min(startItem + eqListItemsPerPage - 1, fullEquipmentListData.length);
    infoDiv.textContent = `全 ${filteredEquipmentListData.length} 件中 ${startItem} - ${endItem} 件を表示`;
}

/**
 * 「次へ」ボタンの処理
 */
function nextEqPage() {
    const totalPages = Math.ceil(filteredEquipmentListData.length / eqListItemsPerPage);
    if (currentEqListPage < totalPages) {
        currentEqListPage++;
        renderEquipmentListPage();
    }
}

/**
 * 「前へ」ボタンの処理
 */
function prevEqPage() {
    if (currentEqListPage > 1) {
        currentEqListPage--;
        renderEquipmentListPage();
    }
}
/**
 * タグの選択肢を動的に生成し、絞り込み用プルダウンに設定する
 */
function populateTagFilter() {
    const select = document.getElementById('tagFilter');
    const tags = new Set(fullEquipmentListData.map(item => item.tag || '未分類'));

    select.innerHTML = '<option value="all">すべてのタグ</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });
}

/**
 * 選択されたタグで機材リストを絞り込み、再描画する
 */
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