const GAS_URL = 'https://script.google.com/macros/s/AKfycbzDN3bl22jj1gENDp6dkdm5Yg6Cqu9boj-GZCEA-k8KWEAbGF4eu673aB1agcRNo2-QlA/exec';

// --- グローバル変数 ---
const siteNameHeading = document.getElementById('site-name-heading');
const siteDetailsBody = document.getElementById('site-details-body');
const loadingDetails = document.getElementById('loading-details');
const siteDateEl = document.getElementById('site-date');
const returnDateDisplayEl = document.getElementById('return-date-display');

let currentStatus = '';
let currentSiteInfo = {};
let masterEquipmentList = []; // 機材マスターリストを保持する変数

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const siteName = params.get('name');

    if (uniqueId && siteName) {
        const siteNameDecoded = decodeURIComponent(siteName);
        siteNameHeading.textContent = siteNameDecoded;
        document.title = `${siteNameDecoded} - 現場詳細`;

        await loadMasterEquipmentList(); // 先にマスターリストを読み込む
        await loadDetails(uniqueId);
        // 1. 機材追加の入力欄に、文字入力イベントを追加
        document.getElementById('addEqName').addEventListener('input', showAddEqSuggestions);

        // 2. 検索候補の外側をクリックしたら、候補を閉じるイベントを追加
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.equipment-search-container')) {
                // PC版の検索候補を閉じる
                const pcSuggestions = document.getElementById('addEquipmentSuggestions');
                if (pcSuggestions) pcSuggestions.style.display = 'none';
            }
        });
    } else {
        document.body.innerHTML = '<h1>エラー: 情報が不足しています。</h1><a href="index.html">リストに戻る</a>';
    }
});

// --- データ取得関数 ---
async function loadMasterEquipmentList() {
    const formData = new FormData();
    formData.append('type', 'getEquipmentList');
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            masterEquipmentList = result.data;
            const datalist = document.getElementById('masterEquipmentDatalist');
            datalist.innerHTML = '';
            masterEquipmentList.forEach(eq => {
                const option = document.createElement('option');
                option.value = eq.name;
                datalist.appendChild(option);
            });
        } else {
            console.error("機材マスターの取得に失敗:", result.error);
        }
    } catch (error) {
        console.error("機材マスターの通信エラー:", error);
    }
}

async function loadDetails(uniqueId) {
    try {
        const formData = new FormData();
        formData.append('type', 'getSiteDetails');
        formData.append('id', uniqueId);

        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        currentSiteInfo = result.data.info;
        const siteInfo = result.data.info;
        currentEquipmentList = result.data.equipment;

        const photoPlaceholder = document.getElementById('photo-placeholder');
        const sitePhoto = document.getElementById('site-photo');

        if (siteInfo.photoUrl) {
            sitePhoto.src = siteInfo.photoUrl;
            sitePhoto.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        } else {
            sitePhoto.style.display = 'none';
            photoPlaceholder.style.display = 'block';
        }

        currentStatus = siteInfo.status;
        document.getElementById('status-select').value = currentStatus;
        setStatusStyle(currentStatus);

        const calendarIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" /></svg>';
        siteDateEl.innerHTML = `${calendarIcon} 現場期間: <strong>${formatDateJP(siteInfo.startDate)}</strong> 〜 <strong>${formatDateJP(siteInfo.endDate)}</strong>`;

        if (siteInfo.returnDate) {
            const returnIcon = `<svg xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15 10a.75.75 0 01-.75.75H7.56l1.22 1.22a.75.75 0 11-1.06 1.06l-2.5-2.5a.75.75 0 010-1.06l2.5-2.5a.75.75 0 111.06 1.06L7.56 9.25h6.69A.75.75 0 0115 10z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M3 10a7 7 0 1114 0 7 7 0 01-14 0zm7-8a8 8 0 100 16 8 8 0 000-16z" clip-rule="evenodd" /></svg>`;
            returnDateDisplayEl.innerHTML = `${returnIcon} 機材返却日: <strong>${formatDateJP(siteInfo.returnDate)}</strong>`;
            returnDateDisplayEl.style.display = 'inline-block';
        }



        renderEquipmentTable(currentEquipmentList);
        document.getElementById('sort-arrow').textContent = ' ▲▼';
        initializeDragAndDrop(); // ドラッグ＆ドロップを有効化
    } catch (error) {
        console.error('Error:', error);
        siteDetailsBody.innerHTML = `<tr><td colspan="6">詳細の読み込みに失敗しました。</td></tr>`;
    } finally {
        loadingDetails.style.display = 'none';
        if (currentStatus !== '現場前') {
            const lockNotice = document.createElement('div');
            lockNotice.className = 'lock-notice';
            lockNotice.textContent = `この現場は「${currentStatus}」のため、機材の追加・削除はできません。`;
            const table = document.getElementById('site-details-table');
            if (table) table.parentNode.insertBefore(lockNotice, table);

            // 機材の追加・削除・使用数変更のボタンのみを非表示にする
            document.getElementById('equipment-edit-controls').style.display = 'none';
        }
    }
}

// --- UI制御 / 表示更新 ---
function setStatusStyle(status) {
    const selectElement = document.getElementById('status-select');
    selectElement.className = 'status-select'; // Reset classes
    switch (status) {
        case '現場前': selectElement.classList.add('status-before'); break;
        case '現場中': selectElement.classList.add('status-in-progress'); break;
        case '完了': selectElement.classList.add('status-completed'); break;
        case 'キャンセル': selectElement.classList.add('status-canceled'); break;
        default: selectElement.classList.add('status-default'); break;
    }
}
function formatDateJP(dateString) {
    if (!dateString || dateString === "（未設定）") return '（未設定）';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Invalid date, return original
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch (e) {
        return dateString;
    }
}
function recalculateTotal(inputElement, quantity, index) {
    const manualPrice = parseFloat(inputElement.value) || 0;
    const newTotal = manualPrice * quantity;
    const targetTotalCell = document.getElementById(`total-price-${index}`);
    if (targetTotalCell) {
        targetTotalCell.textContent = newTotal.toLocaleString();
    }
    updateGrandTotal();
}
function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('#site-details-body tr').forEach(row => {
        if (row.cells.length > 4) {
            const cell = row.cells[4]; // 5番目のセル
            const value = parseFloat(cell.textContent.replace(/,/g, '')) || 0;
            grandTotal += value;
        }
    });
    const grandTotalEl = document.getElementById('grand-total-value');
    if (grandTotalEl) {
        grandTotalEl.textContent = grandTotal.toLocaleString();
    }
}
function updateReturnAllCheckboxState() {
    const allCheckboxes = document.querySelectorAll('.equipment-return-checkbox');
    const checkedCount = document.querySelectorAll('.equipment-return-checkbox:checked').length;
    const returnAllCheckbox = document.getElementById('return-all-checkbox');

    if (allCheckboxes.length > 0 && checkedCount === allCheckboxes.length) {
        returnAllCheckbox.checked = true;
        returnAllCheckbox.indeterminate = false;
    } else if (checkedCount > 0) {
        returnAllCheckbox.checked = false;
        returnAllCheckbox.indeterminate = true;
    } else {
        returnAllCheckbox.checked = false;
        returnAllCheckbox.indeterminate = false;
    }
}

// --- データ送信（GAS呼び出し） ---
async function updateStatus(selectElement) {
    const newStatus = selectElement.value;
    if (newStatus === currentStatus) return;
    if (!confirm(`ステータスを「${newStatus}」に変更しますか？`)) {
        selectElement.value = currentStatus;
        return;
    }
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const formData = new FormData();
    formData.append('type', 'updateStatus');
    formData.append('id', uniqueId);
    formData.append('status', newStatus);

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            currentStatus = newStatus;
            setStatusStyle(currentStatus);
            alert('ステータスを更新しました。');
        } else {
            throw new Error(result.error || '不明なエラー');
        }
    } catch (error) {
        alert(`更新に失敗しました: ${error.message}`);
        selectElement.value = currentStatus;
    }
}
async function updateEquipmentReturnStatus(checkbox) {
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const isReturned = checkbox.checked;

    const formData = new FormData();
    formData.append('type', 'updateEquipmentReturnStatus');
    formData.append('id', uniqueId);
    formData.append('equipmentId', checkbox.dataset.equipmentId);
    formData.append('quantity', checkbox.dataset.quantity);
    formData.append('isReturned', isReturned);

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            updateReturnAllCheckboxState();
        } else {
            throw new Error(result.error || '不明なエラー');
        }
    } catch (error) {
        alert(`更新に失敗しました: ${error.message}`);
        checkbox.checked = !isReturned;
    }
}
async function handleReturnAll(allCheckbox) {
    const isReturned = allCheckbox.checked;
    const individualCheckboxes = document.querySelectorAll('.equipment-return-checkbox');
    const actionText = isReturned ? "すべての機材を返却済に" : "すべての機材を未返却（使用中）に";
    if (!confirm(`${actionText}しますか？\nマスターリストの在庫数が一括で変動します。`)) {
        allCheckbox.checked = !isReturned;
        return;
    }
    individualCheckboxes.forEach(cb => { cb.checked = isReturned; });

    const equipmentToUpdate = Array.from(individualCheckboxes).map(cb => ({
        id: cb.dataset.equipmentId,
        quantity: cb.dataset.quantity
    }));

    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const formData = new FormData();
    formData.append('type', 'bulkUpdateReturnStatus');
    formData.append('id', uniqueId);
    formData.append('isReturned', isReturned);
    formData.append('equipmentData', JSON.stringify(equipmentToUpdate));

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '不明なエラー');
        alert('在庫情報を一括更新しました。');
    } catch (error) {
        alert(`一括更新に失敗しました: ${error.message}\nページの再読み込みをお勧めします。`);
    }
}
async function handlePhotoUpload() {
    const fileInput = document.getElementById('photo-upload-input');
    const uploadResultDiv = document.getElementById('upload-result');
    const file = fileInput.files[0];
    if (!file) { alert("写真ファイルを選択してください。"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("ファイルサイズが大きすぎます。5MB以下の画像を選択してください。"); return; }
    uploadResultDiv.innerHTML = '<p style="color: blue;">写真をアップロードしています...</p>';
    const reader = new FileReader();
    reader.onload = async function (e) {
        const params = new URLSearchParams(window.location.search);
        const uniqueId = params.get('id');
        const formData = new FormData();
        formData.append('type', 'uploadPhoto');
        formData.append('id', uniqueId);
        formData.append('fileName', file.name);
        formData.append('mimeType', file.type);
        formData.append('base64Data', e.target.result);
        try {
            const response = await fetch(GAS_URL, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                uploadResultDiv.innerHTML = '<p style="color: green;">写真の登録に成功しました。</p>';
                const sitePhoto = document.getElementById('site-photo');
                sitePhoto.src = result.imageUrl;
                sitePhoto.style.display = 'block';
                document.getElementById('photo-placeholder').style.display = 'none';
            } else {
                throw new Error(result.error || '不明なエラー');
            }
        } catch (error) {
            uploadResultDiv.innerHTML = `<p style="color: red;">アップロードに失敗しました: ${error.message}</p>`;
        }
    };
    reader.readAsDataURL(file);
}

// --- 編集モード関連の関数 ---
function toggleEditMode(isEditing) {
    const tableBody = document.getElementById('site-details-body');
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.cells.length < 6) return;
        const quantityCell = row.cells[2];
        const returnCell = row.cells[5];
        if (isEditing) {
            const currentQuantity = quantityCell.textContent;
            quantityCell.innerHTML = `<input type="number" class="quantity-input" value="${currentQuantity}" min="1">`;
            returnCell.innerHTML = `<button type="button" class="btn-delete" onclick="this.closest('tr').remove()">削除</button>`;
        } else {
            window.location.reload();
        }
    });
    document.getElementById('enter-edit-mode-btn').style.display = isEditing ? 'none' : 'block';
    document.getElementById('editing-buttons').style.display = isEditing ? 'block' : 'none';
}
async function saveEquipmentChanges() {
    if (!confirm("機材リストの変更を保存しますか？")) return;
    const tableBody = document.getElementById('site-details-body');
    const rows = tableBody.querySelectorAll('tr');
    const updatedEquipmentList = [];
    rows.forEach(row => {
        updatedEquipmentList.push({
            id: row.cells[0].textContent,
            name: row.cells[1].textContent,
            inUse: row.querySelector('.quantity-input').value,
            unitPrice: row.cells[3].textContent
        });
    });
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const formData = new FormData();
    formData.append('type', 'updateSiteEquipment');
    formData.append('id', uniqueId);
    formData.append('equipmentData', JSON.stringify(updatedEquipmentList));
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            alert("機材リストを更新しました。");
            window.location.reload();
        } else {
            throw new Error(result.error || '不明なエラー');
        }
    } catch (error) {
        alert(`更新に失敗しました: ${error.message}`);
    }
}
function openEditModal() {
    document.getElementById('editSiteName').value = siteNameHeading.textContent;
    document.getElementById('editStartDate').value = currentSiteInfo.startDate;
    document.getElementById('editEndDate').value = currentSiteInfo.endDate;
    document.getElementById('editReturnDate').value = currentSiteInfo.returnDate;
    const tagSelect = document.getElementById('editTag');
    if (currentSiteInfo.tag) tagSelect.value = currentSiteInfo.tag;
    document.getElementById('editSiteModal').style.display = 'flex';
}
function closeEditModal() {
    document.getElementById('editSiteModal').style.display = 'none';
}
async function saveSiteInfo() {
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const newName = document.getElementById('editSiteName').value;
    const newTag = document.getElementById('editTag').value;
    const newStartDate = document.getElementById('editStartDate').value;
    const newEndDate = document.getElementById('editEndDate').value;
    const newReturnDate = document.getElementById('editReturnDate').value;
    if (!newName || !newTag || !newStartDate || !newEndDate) {
        alert("返却日以外の項目はすべて必須です。");
        return;
    }
    if (!confirm("現場情報をこの内容で保存しますか？")) return;
    const formData = new FormData();
    formData.append('type', 'updateSiteInfo');
    formData.append('id', uniqueId);
    formData.append('name', newName);
    formData.append('tag', newTag);
    formData.append('startDate', newStartDate);
    formData.append('endDate', newEndDate);
    formData.append('returnDate', newReturnDate);
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            alert("現場情報を更新しました。ページを再読み込みします。");
            window.location.reload();
        } else {
            throw new Error(result.error || '不明なエラーが発生しました。');
        }
    } catch (error) {
        alert(`更新に失敗しました: ${error.message}`);
    } finally {
        closeEditModal();
    }
}
function openAddEquipmentModal() {
    document.getElementById('addEqName').value = '';
    document.getElementById('addEqQuantity').value = 1;
    document.getElementById('addEquipmentModal').style.display = 'flex';
}
function closeAddEquipmentModal() {
    document.getElementById('addEquipmentModal').style.display = 'none';
}
function addEquipmentToTable() {
    const nameInput = document.getElementById('addEqName');
    const quantityInput = document.getElementById('addEqQuantity');
    const selectedName = nameInput.value;
    const quantity = quantityInput.value;
    if (!selectedName || !quantity || quantity < 1) {
        alert("正しい機材名と使用数を入力してください。");
        return;
    }
    const equipmentDetails = masterEquipmentList.find(eq => eq.name === selectedName);
    if (!equipmentDetails) {
        alert("マスターリストに存在しない機材です。");
        return;
    }
    let isAlreadyAdded = false;
    document.querySelectorAll('#site-details-body tr').forEach(row => {
        if (row.cells[0].textContent == equipmentDetails.id) {
            isAlreadyAdded = true;
        }
    });
    if (isAlreadyAdded) {
        alert("この機材はすでに追加されています。使用数を変更してください。");
        return;
    }
    const tableBody = document.getElementById('site-details-body');
    const newRow = tableBody.insertRow();

    // Add a check for unitPrice to handle manual case properly
    let unitPriceDisplay = equipmentDetails.unitPrice;
    if (equipmentDetails.unitPrice === 'manual') {
        unitPriceDisplay = `<input type="number" class="manual-price-input" placeholder="単価入力" oninput="recalculateTotal(this.parentElement.nextElementSibling.querySelector('span'), ${quantity})">`;
    }

    newRow.innerHTML = `
        <td>${equipmentDetails.id}</td>
        <td>${equipmentDetails.name}</td>
        <td><input type="number" class="quantity-input" value="${quantity}" min="1"></td>
        <td>${unitPriceDisplay}</td>
        <td><span>-</span></td>
        <td><button type="button" class="btn-delete" onclick="this.closest('tr').remove()">削除</button></td>
    `;

    closeAddEquipmentModal();
}

function showAddEqSuggestions() {
    const nameInput = document.getElementById('addEqName');
    const suggestionsDiv = document.getElementById('addEquipmentSuggestions');
    const inputText = nameInput.value.toLowerCase();

    suggestionsDiv.innerHTML = '';
    if (inputText.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    const suggestions = masterEquipmentList.filter(eq => eq.name.toLowerCase().includes(inputText));

    if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.name;
            // 候補をクリックしたときの動作を設定
            item.onclick = () => selectAddEqSuggestion(suggestion.name);
            suggestionsDiv.appendChild(item);
        });
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.style.display = 'none';
    }
}

/**
 * [詳細ページ用] 検索候補がクリックされたときに、入力欄に名前をセットする関数
 */
function selectAddEqSuggestion(name) {
    document.getElementById('addEqName').value = name;
    document.getElementById('addEquipmentSuggestions').style.display = 'none';
    document.getElementById('addEqQuantity').focus(); // 使用数入力にフォーカスを移動
}

// グローバル変数に機材リストとソート方向を追加
let currentEquipmentList = [];
let sortAscending = false; // true: 昇順, false: 降順

/**
 * IDで機材リストをソートし、テーブルを再描画する関数
 */
function sortEquipmentById() {
    // ソート方向を切り替える
    sortAscending = !sortAscending;

    // currentEquipmentListをソート
    currentEquipmentList.sort((a, b) => {
        const idA = Number(a.id);
        const idB = Number(b.id);
        if (sortAscending) {
            return idA - idB; // 昇順
        } else {
            return idB - idA; // 降順
        }
    });

    // ソートされたリストでテーブルを再描画
    renderEquipmentTable(currentEquipmentList);

    // ヘッダーの矢印を更新
    document.getElementById('sort-arrow').textContent = sortAscending ? ' ▲' : ' ▼';
}

/**
 * 機材リストのテーブルを描画する関数
 * @param {Array} equipmentList - 表示する機材データの配列
 */
function renderEquipmentTable(equipmentList) {
    siteDetailsBody.innerHTML = ''; // テーブルの中身を一旦空にする

    if (equipmentList && equipmentList.length > 0) {
        equipmentList.forEach((eq, index) => {
            const row = siteDetailsBody.insertRow();
            // (既存の描画ロジックをここに移動)
            // ハンドルのSVGアイコン
            const handleIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 4H7V6H9V4Z" fill="currentColor" /><path d="M17 4H15V6H17V4Z" fill="currentColor" /><path d="M9 11H7V13H9V11Z" fill="currentColor" /><path d="M17 11H15V13H17V11Z" fill="currentColor" /><path d="M9 18H7V20H9V18Z" fill="currentColor" /><path d="M17 18H15V20H17V18Z" fill="currentColor" /></svg>`;

            let cells = `<td class="drag-handle">${handleIcon}</td>`; // ハンドル用のセルを追加

            cells += `<td>${eq.id || '-'}</td>
                      <td>${eq.name || '-'}</td>
                      <td>${eq.inUse || '-'}</td>`;

            let totalPrice = eq.totalPrice;
            if (typeof totalPrice === 'number') { totalPrice = totalPrice.toLocaleString(); }
            else if (totalPrice === '#NUM!') { totalPrice = ''; }

            if (eq.unitPrice === 'manual') {
                cells += `<td><input type="number" class="manual-price-input" placeholder="単価入力" oninput="recalculateTotal(this, ${eq.inUse}, ${index})"></td>
                          <td><span id="total-price-${index}">${totalPrice || '0'}</span></td>`;
            } else {
                cells += `<td>${eq.unitPrice || '-'}</td>
                          <td>${totalPrice || '-'}</td>`;
            }
            cells += `<td style="text-align: center;">
                            <input type="checkbox"
                                class="equipment-return-checkbox"
                                data-equipment-id="${eq.id}"
                                data-quantity="${eq.inUse}"
                                ${eq.isReturned ? 'checked' : ''}
                                onchange="updateEquipmentReturnStatus(this)">
                        </td>`;
            row.innerHTML = cells;
        });
        document.getElementById('bulk-return-section').style.display = 'block';
        updateReturnAllCheckboxState();
        updateGrandTotal();
    } else {
        siteDetailsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">使用されている機材はありません。</td></tr>';
    }
}
/**
 * SortableJSを初期化してドラッグ＆ドロップ機能を有効にする
 */
function initializeDragAndDrop() {
    // 既存のインスタンスがあれば破棄する
    if (window.sortableInstance) {
        window.sortableInstance.destroy();
    }

    // SortableJSをテーブルボディに適用
    window.sortableInstance = new Sortable(siteDetailsBody, {
        animation: 150, // アニメーションの時間
        handle: '.drag-handle', // ドラッグの起点となる要素
        ghostClass: 'sortable-ghost', // ドラッグ中のゴースト要素に適用するクラス

        // ドラッグ終了時の処理
        onEnd: function (evt) {
            // 内部データ配列(currentEquipmentList)の順序をDOMの順序に合わせる
            const movedItem = currentEquipmentList.splice(evt.oldIndex, 1)[0];
            currentEquipmentList.splice(evt.newIndex, 0, movedItem);
        }
    });
}
