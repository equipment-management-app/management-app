const GAS_URL = 'https://script.google.com/macros/s/AKfycbyS7lLhCwGsPgW9XXvTOcJZ4mfNTgsZUeSUV7th3are3loBlCdbtnmpQ4IjeWoBdz9Q/exec';
let confirmAction = null;
let fullEquipmentListData = [];
let filteredEquipmentListData = [];
let currentEqListPage = 1;
const eqListItemsPerPage = 10;

// --- モーダル、ローディング、fetchDataなどの基本関数 ---
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
            throw error;
        })
        .finally(() => {
            showLoading(false);
        });
}

// --- テーブル作成関数 ---
function createEquipmentTable(equipmentData) {
    if (!Array.isArray(equipmentData) || equipmentData.length === 0) {
        return '<div class="text-center text-gray-500 p-4">該当する機材がありません</div>';
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

function displayResult(elementId, data, successMessage, errorMessagePrefix = "Error") {
    const element = document.getElementById(elementId);
    if (data.success) {
        element.innerHTML = `<div class="text-green-600 p-2">${successMessage} ${data.message || ''}</div>`;
    } else {
        element.innerHTML = `<div class="text-red-600 p-2">${errorMessagePrefix}: ${data.error || 'Unknown error'}</div>`;
    }
}


function populateEquipmentDatalist(equipmentData) {
    const dataList = document.getElementById('equipmentNameList');
    dataList.innerHTML = '';
    equipmentData.forEach(eq => {
        const option = document.createElement('option');
        option.value = eq.name;
        dataList.appendChild(option);
    });
}

// --- フィルター、リスト取得、イベントリスナー ---
function applyFiltersAndRender() {
    const selectedTag = document.getElementById('tagFilter').value;
    const searchTerm = document.getElementById('eqSearchInput').value.toLowerCase();

    let tempData = [...fullEquipmentListData];

    if (selectedTag !== 'all') {
        tempData = tempData.filter(item => (item.tag || '未分類') === selectedTag);
    }

    if (searchTerm) {
        tempData = tempData.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    filteredEquipmentListData = tempData;
    currentEqListPage = 1;
    renderEquipmentListPage();
}

function getEquipmentList() {
    const resultAreaId = "equipmentListResult";
    document.getElementById(resultAreaId).innerHTML = `<div class="text-center text-blue-600 p-4">🔄 取得中...</div>`;
    const formData = new FormData();
    formData.append('type', 'getEquipmentList');

    fetchData(formData)
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                fullEquipmentListData = data.data.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
                populateEquipmentDatalist(fullEquipmentListData);
                populateTagFilter();
                applyFiltersAndRender();
            } else {
                displayResult(resultAreaId, { error: data.error }, "", "機材リスト取得失敗");
            }
        })
        .catch(error => displayResult(resultAreaId, { error: error.message }, "", `機材リスト取得失敗`));
}

document.addEventListener('DOMContentLoaded', () => {
    getEquipmentList();

    document.getElementById('eqSearchInput').addEventListener('input', applyFiltersAndRender);
    document.getElementById('tagFilter').addEventListener('change', applyFiltersAndRender);

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


// --- ▼▼▼ ここからが不足していた関数です ▼▼▼ ---

/**
 * ページネーションを含めてリストの描画を更新する関数
 */
function renderEquipmentListPage() {
    const resultArea = document.getElementById('equipmentListResult');
    const startIndex = (currentEqListPage - 1) * eqListItemsPerPage;
    const endIndex = startIndex + eqListItemsPerPage;
    const paginatedData = filteredEquipmentListData.slice(startIndex, endIndex);

    resultArea.innerHTML = createEquipmentTable(paginatedData);
    updateEqListPaginationControls();
}

/**
 * ページネーションのコントロール（ボタンや情報）を更新する関数
 */
function updateEqListPaginationControls() {
    const controlsContainer = document.getElementById('eqListPaginationControls');
    const infoDiv = document.getElementById('eqListInfo');
    const prevButton = document.getElementById('prevEqPageButton');
    const nextButton = document.getElementById('nextEqPageButton');

    const totalItems = filteredEquipmentListData.length;
    if (totalItems <= eqListItemsPerPage) {
        controlsContainer.style.display = 'none';
        return;
    }

    controlsContainer.style.display = 'flex';
    const totalPages = Math.ceil(totalItems / eqListItemsPerPage);

    prevButton.disabled = currentEqListPage === 1;
    nextButton.disabled = currentEqListPage === totalPages;

    const startItem = (currentEqListPage - 1) * eqListItemsPerPage + 1;
    const endItem = Math.min(startItem + eqListItemsPerPage - 1, totalItems);

    infoDiv.textContent = `全 ${totalItems} 件中 ${startItem} - ${endItem} 件を表示`;
}

/**
 * 次のページを表示する関数
 */
function nextEqPage() {
    const totalPages = Math.ceil(filteredEquipmentListData.length / eqListItemsPerPage);
    if (currentEqListPage < totalPages) {
        currentEqListPage++;
        renderEquipmentListPage();
    }
}

/**
 * 前のページを表示する関数
 */
function prevEqPage() {
    if (currentEqListPage > 1) {
        currentEqListPage--;
        renderEquipmentListPage();
    }
}

/**
 * タグフィルターの選択肢を動的に生成する関数
 */
function populateTagFilter() {
    const select = document.getElementById('tagFilter');
    const tags = [...new Set(fullEquipmentListData.map(item => item.tag || '未分類'))].sort((a, b) => a.localeCompare(b, 'ja'));
    const currentValue = select.value;

    select.innerHTML = '<option value="all">すべてのタグ</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });

    // フィルター適用前の選択値を保持しようと試みる
    if (Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    } else {
        select.value = 'all';
    }
}

/**
 * 新しい機材を登録する関数
 */
function registerEquipment() {
    const name = document.getElementById('regEqName').value;
    const total = document.getElementById('regEqTotal').value;
    const unitPrice = document.getElementById('regEqUnitPrice').value;
    const tag = document.getElementById('regEqTag').value;
    const resultAreaId = "registerEquipmentResult";

    if (!name || !total || !unitPrice || !tag) {
        showModal('入力エラー', 'すべての項目を入力してください。', 'alert');
        return;
    }

    const formData = new FormData();
    formData.append('type', 'registerEquipment');
    formData.append('name', name);
    formData.append('total', total);
    formData.append('unitPrice', unitPrice);
    formData.append('tag', tag);

    showModal('登録確認', `機材「${name}」を登録しますか？`, 'confirm', () => {
        fetchData(formData)
            .then(data => {
                displayResult(resultAreaId, data, "登録成功:", "登録失敗");
                if (data.success) {
                    document.getElementById('registerEquipmentForm').reset();
                    getEquipmentList(); // リストを再読み込みして更新
                }
            })
            .catch(error => displayResult(resultAreaId, { error: error.message }, "", "登録失敗"));
    });
}

/**
 * 既存の機材情報を変更する関数
 */
function changeEquipmentInfo() {
    const name = document.getElementById('changeEqName').value;
    const newTotal = document.getElementById('changeEqQuantity').value;
    const newUnitPrice = document.getElementById('changeEqUnitPrice').value;
    const newTag = document.getElementById('changeEqTag').value;
    const resultAreaId = "changeEquipmentResult";

    if (!name || !newTotal || !newUnitPrice || !newTag) {
        showModal('入力エラー', 'すべての項目を入力してください。', 'alert');
        return;
    }

    const formData = new FormData();
    formData.append('type', 'changeEquipmentInfo');
    formData.append('name', name);
    formData.append('newTotal', newTotal);
    formData.append('newUnitPrice', newUnitPrice);
    formData.append('newTag', newTag);

    showModal('変更確認', `機材「${name}」の情報を変更しますか？`, 'confirm', () => {
        fetchData(formData)
            .then(data => {
                displayResult(resultAreaId, data, "変更成功:", "変更失敗");
                if (data.success) {
                    document.getElementById('changeEquipmentForm').reset();
                    getEquipmentList(); // リストを再読み込みして更新
                }
            })
            .catch(error => displayResult(resultAreaId, { error: error.message }, "", "変更失敗"));
    });
}