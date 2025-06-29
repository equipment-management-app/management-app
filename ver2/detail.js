const GAS_URL = 'https://script.google.com/macros/s/AKfycbyilsTi-mBhb8kuhKjEjsXwuHjfqJP0oijklVsAW2RiLN5Tb4MAYKjKCSrgstqSn0df/exec';

// --- DOM要素の取得 ---
const siteNameHeading = document.getElementById('site-name-heading');
const siteDetailsBody = document.getElementById('site-details-body');
const loadingDetails = document.getElementById('loading-details');
const siteDateEl = document.getElementById('site-date');

let currentStatus = '';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const siteName = params.get('name');

    if (uniqueId && siteName) {
        const siteNameDecoded = decodeURIComponent(siteName);
        siteNameHeading.textContent = siteNameDecoded;
        document.title = `${siteNameDecoded} - 現場詳細`;
        loadDetails(uniqueId);
    } else {
        document.body.innerHTML = '<h1>エラー: 情報が不足しています。</h1><a href="index.html">リストに戻る</a>';
    }
});

function setStatusStyle(status) {
    const selectElement = document.getElementById('status-select');
    selectElement.classList.remove('status-before', 'status-completed', 'status-canceled', 'status-default');
    switch (status) {
        case '現場前': selectElement.classList.add('status-before'); break;
        case '現場中': selectElement.classList.add('status-in-progress'); break;
        case '完了': selectElement.classList.add('status-completed'); break;
        case 'キャンセル': selectElement.classList.add('status-canceled'); break;
        default: selectElement.classList.add('status-default'); break;
    }
}

function formatDateJP(dateString) {
    if (!dateString) return '（未設定）';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '（日付形式エラー）';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    } catch (e) {
        return dateString;
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

        const siteInfo = result.data.info;
        const equipmentList = result.data.equipment;

        const photoPlaceholder = document.getElementById('photo-placeholder');
        const sitePhoto = document.getElementById('site-photo');

        // 1. GASから渡されたphotoUrlをチェック
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

        siteDetailsBody.innerHTML = '';

        if (equipmentList && equipmentList.length > 0) {
            const dataRows = equipmentList.slice(1);

            dataRows.forEach((eq, index) => {
                const row = siteDetailsBody.insertRow();
                let cells = `
                            <td>${eq.id || '-'}</td>
                            <td>${eq.name || '-'}</td>
                            <td>${eq.inUse || '-'}</td>
                        `;
                if (eq.unitPrice === 'manual') {
                    cells += `
                                <td><input type="number" class="manual-price-input" placeholder="単価入力" oninput="recalculateTotal(this, ${eq.inUse}, ${index})"></td>
                                <td><span id="total-price-${index}">${eq.totalPrice === '#NUM!' ? '' : (eq.totalPrice || '0')}</span></td>
                            `;
                } else {
                    cells += `
                                <td>${eq.unitPrice || '-'}</td>
                                <td>${eq.totalPrice === '#NUM!' ? '' : (eq.totalPrice || '-')}</td>
                            `;
                }
                cells += `
                            <td style="text-align: center;">
                                <input type="checkbox" 
                                    class="equipment-return-checkbox" 
                                    data-equipment-id="${eq.id}"
                                    data-quantity="${eq.inUse}"
                                    ${eq.isReturned ? 'checked' : ''} 
                                    onchange="updateEquipmentReturnStatus(this, '${eq.id}', ${eq.inUse})">
                            </td>
                        `;
                row.innerHTML = cells;
            });

            document.getElementById('bulk-return-section').style.display = 'block';
            updateReturnAllCheckboxState();
            updateGrandTotal();

        } else {
            siteDetailsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">使用されている機材はありません。</td></tr>';
        }

    } catch (error) {
        console.error('Error:', error);
        siteDetailsBody.innerHTML = `<tr><td colspan="6">詳細の読み込みに失敗しました。</td></tr>`;
    } finally {
        loadingDetails.style.display = 'none';
    }
}
async function updateStatus(selectElement) {
    const newStatus = selectElement.value;
    const previousStatus = currentStatus;
    if (newStatus === previousStatus) return;
    if (!confirm(`ステータスを「${newStatus}」に変更しますか？`)) {
        selectElement.value = previousStatus;
        return;
    }
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    try {
        const formData = new FormData();
        formData.append('type', 'updateStatus');
        formData.append('id', uniqueId);
        formData.append('status', newStatus);
        setStatusStyle(newStatus);
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            currentStatus = newStatus;
            alert('ステータスを更新しました。');
        } else {
            throw new Error(result.error || '不明なエラー');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`更新に失敗しました: ${error.message}`);
        selectElement.value = previousStatus;
        setStatusStyle(previousStatus);
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
// detail.html の <script> の中
async function updateEquipmentReturnStatus(checkbox, equipmentId, quantity) {
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const isReturned = checkbox.checked;

    const actionText = isReturned ? "返却済み" : "未返却（使用中）";
    if (!confirm(`この機材を「${actionText}」としてマークしますか？\nマスターリストの在庫数が変動します。`)) {
        checkbox.checked = !isReturned; // 操作をキャンセル
        return;
    }

    const formData = new FormData();
    formData.append('type', 'updateEquipmentReturnStatus');
    formData.append('id', uniqueId); // 現場のユニークID
    formData.append('equipmentId', equipmentId); // 機材のID
    formData.append('quantity', quantity); // 使用数
    formData.append('isReturned', isReturned); // チェックボックスの状態

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            alert('在庫情報を更新しました。');
        } else {
            throw new Error(result.error || '不明なエラーが発生しました。');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`更新に失敗しました: ${error.message}`);
        checkbox.checked = !isReturned;
    }
}

/**
 * 「すべて返却」チェックボックスが操作されたときの処理
 */
async function handleReturnAll(allCheckbox) {
    const isReturned = allCheckbox.checked;
    const individualCheckboxes = document.querySelectorAll('.equipment-return-checkbox');

    // 確認ダイアログ
    const actionText = isReturned ? "すべての機材を返却済に" : "すべての機材を未返却（使用中）に";
    if (!confirm(`${actionText}しますか？\nマスターリストの在庫数が一括で変動します。`)) {
        allCheckbox.checked = !isReturned;
        return;
    }

    // 1. フロントエンドのチェックボックスをすべて同期させる
    individualCheckboxes.forEach(cb => {
        cb.checked = isReturned;
    });

    // 2. 更新対象の機材データを配列にまとめる
    const equipmentToUpdate = [];
    individualCheckboxes.forEach(cb => {
        equipmentToUpdate.push({
            id: cb.dataset.equipmentId,
            quantity: cb.dataset.quantity
        });
    });

    // 3. GASに一括更新リクエストを送信
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
        if (result.success) {
            alert('在庫情報を一括更新しました。');
        } else {
            throw new Error(result.error || '不明なエラー');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`一括更新に失敗しました: ${error.message}`);
        allCheckbox.checked = !isReturned;
        individualCheckboxes.forEach(cb => {
            alert('画面の状態と実際のデータが異なっている可能性があります。ページを再読み込みしてください。');
        });
    }
}

/**
 * 個別のチェックボックスの状態を監視し、「すべて返却」チェックボックスの状態を更新する
 */
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

// 既存の updateEquipmentReturnStatus 関数を少し修正
async function updateEquipmentReturnStatus(checkbox, equipmentId, quantity) {
    const params = new URLSearchParams(window.location.search);
    const uniqueId = params.get('id');
    const isReturned = checkbox.checked;

    const actionText = isReturned ? "返却済み" : "未返却（使用中）";

    const formData = new FormData();
    formData.append('type', 'updateEquipmentReturnStatus');
    formData.append('id', uniqueId);
    formData.append('equipmentId', equipmentId);
    formData.append('quantity', quantity);
    formData.append('isReturned', isReturned);

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            updateReturnAllCheckboxState();
        } else {
            throw new Error(result.error || '不明なエラーが発生しました。');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`更新に失敗しました: ${error.message}`);
        checkbox.checked = !isReturned;
    }
}
/**
 * 表示されているテーブルの内容から総計を計算して更新する
 */
function updateGrandTotal() {
    let grandTotal = 0;
    const totalCells = document.querySelectorAll('#site-details-body td:nth-child(5)');

    totalCells.forEach(cell => {
        const value = parseFloat(cell.textContent.replace(/,/g, '')) || 0;
        grandTotal += value;
    });

    // 計算結果を表示用のspanに反映
    const grandTotalEl = document.getElementById('grand-total-value');
    if (grandTotalEl) {
        grandTotalEl.textContent = grandTotal.toLocaleString();
    }
}

function handlePhotoUpload() {
    const fileInput = document.getElementById('photo-upload-input');
    const uploadResultDiv = document.getElementById('upload-result');
    const file = fileInput.files[0];

    if (!file) {
        alert("写真ファイルを選択してください。");
        return;
    }

    // 5MB以上のファイルは警告
    if (file.size > 5 * 1024 * 1024) {
        alert("ファイルサイズが大きすぎます。5MB以下の画像を選択してください。");
        return;
    }

    uploadResultDiv.innerHTML = '<p style="color: blue;">写真をアップロードしています...</p>';

    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64Data = e.target.result;
        const params = new URLSearchParams(window.location.search);
        const uniqueId = params.get('id');

        const formData = new FormData();
        formData.append('type', 'uploadPhoto');
        formData.append('id', uniqueId);
        formData.append('fileName', file.name);
        formData.append('mimeType', file.type);
        formData.append('base64Data', base64Data);

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
            console.error('Error:', error);
            uploadResultDiv.innerHTML = `<p style="color: red;">アップロードに失敗しました: ${error.message}</p>`;
        }
    };
    reader.readAsDataURL(file);
}