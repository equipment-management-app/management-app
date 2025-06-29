const GAS_URL = 'https://script.google.com/macros/s/AKfycbyilsTi-mBhb8kuhKjEjsXwuHjfqJP0oijklVsAW2RiLN5Tb4MAYKjKCSrgstqSn0df/exec';

// --- DOM要素の取得 ---
const siteListBody = document.getElementById('site-list-body');
const loadingSites = document.getElementById('loading-sites');
const registerSiteResultArea = document.getElementById('registerSiteResult');
const searchInput = document.getElementById('searchInput');
const equipmentNameInput = document.getElementById('equipmentName');
const equipmentSuggestionsDiv = document.getElementById('equipmentSuggestions');

// --- グローバル変数 ---
let siteEquipmentList = [];
let fullSiteListData = [];
let filteredSiteListData = [];
let masterEquipmentList = [];
let currentSiteListPage = 1;
const siteListItemsPerPage = 10;

// --- イベントリスナー ---
document.addEventListener('DOMContentLoaded', () => {
    loadSiteList();
    loadMasterEquipmentList();
});
searchInput.addEventListener('input', applyFilterAndRender);
equipmentNameInput.addEventListener('input', showEquipmentSuggestions);
document.addEventListener('click', (e) => {
    if (!e.target.closest('.equipment-search-container')) {
        equipmentSuggestionsDiv.style.display = 'none';
    }
});

// --- データ取得と表示のコアロジック ---
async function loadMasterEquipmentList() {
    try {
        const formData = new FormData();
        formData.append('type', 'getEquipmentList');
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            masterEquipmentList = result.data;
        }
    } catch (error) {
        console.error("機材マスターリストの取得に失敗:", error);
    }
}

function showEquipmentSuggestions() {
    const inputText = equipmentNameInput.value.toLowerCase();
    equipmentSuggestionsDiv.innerHTML = '';
    if (inputText.length === 0) {
        equipmentSuggestionsDiv.style.display = 'none';
        return;
    }
    const suggestions = masterEquipmentList.filter(eq => eq.name.toLowerCase().includes(inputText));
    if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.name;
            item.onclick = () => selectEquipmentSuggestion(suggestion.name);
            equipmentSuggestionsDiv.appendChild(item);
        });
        equipmentSuggestionsDiv.style.display = 'block';
    } else {
        equipmentSuggestionsDiv.style.display = 'none';
    }
}

function selectEquipmentSuggestion(name) {
    equipmentNameInput.value = name;
    equipmentSuggestionsDiv.style.display = 'none';
    document.getElementById('equipmentInUse').focus();
}

function addEquipmentToSite() {
    const nameInput = document.getElementById('equipmentName');
    const inUseInput = document.getElementById('equipmentInUse');
    const name = nameInput.value.trim();
    const inUse = parseInt(inUseInput.value, 10);

    if (!name || !inUse || inUse < 1) {
        alert("機材名と正しい使用数を入力してください。");
        return;
    }

    const existingIndex = siteEquipmentList.findIndex(item => item.name === name);

    if (existingIndex > -1) {
        siteEquipmentList[existingIndex].inUse += inUse;
    } else {
        siteEquipmentList.push({ name, inUse });
    }

    nameInput.value = '';
    inUseInput.value = '1';
    updateEquipmentDisplay();
    nameInput.focus();
}

async function loadSiteList() {
    siteListBody.innerHTML = '';
    loadingSites.style.display = 'block';
    document.getElementById('siteListPaginationControls').style.display = 'none';
    try {
        const formData = new FormData();
        formData.append('type', 'getSiteList');
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        fullSiteListData = result.data
            .filter(site => !isNaN(parseInt(site.id)))
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        applyFilterAndRender();
    } catch (error) {
        console.error('Error:', error);
        siteListBody.innerHTML = `<tr><td colspan="4">リストの読み込みに失敗しました。</td></tr>`;
    } finally {
        loadingSites.style.display = 'none';
    }
}

function applyFilterAndRender() {
    const searchTerm = searchInput.value.toLowerCase();
    const hideCompleted = document.getElementById('hide-completed-checkbox').checked;
    // ▼▼▼ 追加: タグフィルターの状態を取得 ▼▼▼
    const filterVideo = document.getElementById('filter-video').checked;
    const filterAudio = document.getElementById('filter-audio').checked;
    // ▲▲▲ 追加 ▲▲▲

    let tempData = fullSiteListData;

    if (hideCompleted) {
        tempData = tempData.filter(site => site.state !== '完了' && site.state !== 'キャンセル');
    }
    
    // ▼▼▼ 追加: タグによる絞り込みロジック ▼▼▼
    // どちらかのタグフィルターが有効な場合のみ実行
    if (filterVideo || filterAudio) {
        tempData = tempData.filter(site => {
            // 「映像」で絞り込み、かつ現場に映像タグがある
            const videoMatch = filterVideo && site.hasVideo;
            // 「音響」で絞り込み、かつ現場に音響タグがある
            const audioMatch = filterAudio && site.hasAudio;
            // どちらかの条件に一致すれば表示
            return videoMatch || audioMatch;
        });
    }
    // ▲▲▲ 追加 ▲▲▲

    filteredSiteListData = searchTerm
        ? tempData.filter(site => site.name.toLowerCase().includes(searchTerm))
        : tempData;

    currentSiteListPage = 1;
    renderSiteListPage();
}
function formatDateJP(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    } catch (e) {
        return dateString;
    }
}

function formatDateMMDD(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';

        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    } catch (e) {
        return dateString;
    }
}

function getStatusClass(status) {
    switch (status) {
        case '現場前':
            return 'status-text-before';
        case '現場中':
            return 'status-text-in-progress';
        case '完了':
            return 'status-text-completed';
        case 'キャンセル':
            return 'status-text-canceled';
        default:
            return 'status-text-default';
    }
}
function renderSiteListPage() {
    siteListBody.innerHTML = '';
    if (filteredSiteListData.length === 0) {
        siteListBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">該当する現場がありません。</td></tr>`;
        updateSiteListPaginationControls();
        return;
    }
    const startIndex = (currentSiteListPage - 1) * siteListItemsPerPage;
    const endIndex = startIndex + siteListItemsPerPage;
    const paginatedData = filteredSiteListData.slice(startIndex, endIndex);

    paginatedData.forEach(site => {
        const row = document.createElement('tr');
        const siteNameEncoded = encodeURIComponent(site.name);
        row.onclick = () => {
            window.location.href = `detail.html?id=${site.uniqueId}&name=${siteNameEncoded}`;
        };

        // ▼▼▼ 追加: タグ表示用のHTMLを生成 ▼▼▼
        let tagsHtml = '';
        if (site.hasVideo) {
            tagsHtml += '<span class="tag tag-video">映像</span>';
        }
        if (site.hasAudio) {
            tagsHtml += '<span class="tag tag-audio">音響</span>';
        }
        // ▲▲▲ 追加 ▲▲▲

        row.innerHTML = `
            <td>${site.name}</td>
            <td>${formatDateMMDD(site.startDate)} ~ ${formatDateMMDD(site.endDate)}</td>
            <td>${tagsHtml}</td>
            <td class="status-text ${getStatusClass(site.state)}">${site.state}</td>
        `;
        siteListBody.appendChild(row);
    });
    updateSiteListPaginationControls();
}
function updateSiteListPaginationControls() {
    const controlsContainer = document.getElementById('siteListPaginationControls');
    const infoDiv = document.getElementById('siteListInfo');
    const prevButton = document.getElementById('prevSitePageButton');
    const nextButton = document.getElementById('nextSitePageButton');
    if (filteredSiteListData.length <= siteListItemsPerPage) {
        controlsContainer.style.display = 'none';
        return;
    }
    controlsContainer.style.display = 'flex';
    const totalPages = Math.ceil(filteredSiteListData.length / siteListItemsPerPage);
    prevButton.disabled = (currentSiteListPage === 1);
    nextButton.disabled = (currentSiteListPage === totalPages);
    const startItem = (currentSiteListPage - 1) * siteListItemsPerPage + 1;
    const endItem = Math.min(startItem + siteListItemsPerPage - 1, filteredSiteListData.length);
    infoDiv.textContent = `全 ${filteredSiteListData.length} 件中 ${startItem} - ${endItem} 件を表示`;
}
function nextSitePage() {
    const totalPages = Math.ceil(filteredSiteListData.length / siteListItemsPerPage);
    if (currentSiteListPage < totalPages) {
        currentSiteListPage++;
        renderSiteListPage();
    }
}
function prevSitePage() {
    if (currentSiteListPage > 1) {
        currentSiteListPage--;
        renderSiteListPage();
    }
}
function updateEquipmentDisplay() {
    const itemsDiv = document.getElementById('equipmentItems');
    if (siteEquipmentList.length === 0) {
        itemsDiv.innerHTML = '<span style="color: #888;">機材が追加されるとここに表示されます</span>';
        return;
    }
    itemsDiv.innerHTML = siteEquipmentList.map((item, index) => `<div class="item"><span>${item.name} (使用数: ${item.inUse})</span><button class="remove-btn" onclick="removeEquipmentFromSite(${index})">×</button></div>`).join('');
}
function removeEquipmentFromSite(index) {
    siteEquipmentList.splice(index, 1);
    updateEquipmentDisplay();
}
function clearEquipmentList() {
    if (siteEquipmentList.length > 0 && confirm("追加した機材をすべてクリアしますか？")) {
        siteEquipmentList = [];
        updateEquipmentDisplay();
    }
}
async function registerSite() {
    const siteName = document.getElementById('siteName').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const returnDate = document.getElementById('returnDate').value;
    // ▼▼▼ 追加: 登録フォームのタグの状態を取得 ▼▼▼
    const hasVideo = document.getElementById('tag-video-reg').checked;
    const hasAudio = document.getElementById('tag-audio-reg').checked;
    // ▲▲▲ 追加 ▲▲▲

    if (!siteName || !startDate || !endDate) { alert("現場名、開始日、撤収日を入力してください。"); return; }
    if (siteEquipmentList.length === 0) { alert("機材を少なくとも1つ追加してください。"); return; }
    registerSiteResultArea.innerHTML = "登録処理中...";
    try {
        const formData = new FormData();
        formData.append('type', 'registerSite');
        formData.append('name', siteName);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('returnDate', returnDate);
        // ▼▼▼ 追加: タグ情報をフォームデータに追加 ▼▼▼
        formData.append('hasVideo', hasVideo);
        formData.append('hasAudio', hasAudio);
        // ▲▲▲ 追加 ▲▲▲
        formData.append('equipment', JSON.stringify(siteEquipmentList));
        const response = await fetch(GAS_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            registerSiteResultArea.innerHTML = `<p style="color: green;">現場「${siteName}」を登録しました。</p>`;
            document.getElementById('registerSiteForm').reset();
            siteEquipmentList = [];
            updateEquipmentDisplay();
            loadSiteList();
        } else {
            throw new Error(result.error || '不明なエラーが発生しました。');
        }
    } catch (error) {
        console.error("Error during site registration:", error);
        registerSiteResultArea.innerHTML = `<p style="color: red;">登録に失敗しました: ${error.message}</p>`;
    }
}
document.addEventListener('DOMContentLoaded', function () {
    const equipmentNameInput = document.getElementById('equipmentName');
    const equipmentInUseInput = document.getElementById('equipmentInUse');
    const handleEnterKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addEquipmentToSite();
        }
    };
    equipmentNameInput.addEventListener('keydown', handleEnterKey);
    equipmentInUseInput.addEventListener('keydown', handleEnterKey);
});