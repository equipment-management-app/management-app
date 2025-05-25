function getIdParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        throw new Error('ID parameter is missing in the URL');
    }
    return id;
}

function getSiteDetails() {
    const id = getIdParam();
    const formData = new FormData();
    formData.append('id', id);
    formData.append('type', 'getSiteDetails');
    fetchData(formData);
}

// success
function getSiteList() {
    const formData = new FormData();
    formData.append('type', 'getSiteList');
    fetchData(formData);
}


function registerSite() {
    const formData = new FormData();
    formData.append('type', 'registerSite');
    formData.append('name', '株式会社未来創造');
    fetchData(formData);

}

function getEquipmentList() {
    const formData = new FormData();
    formData.append('type', 'getEquipmentList');
    fetchData(formData);
}

// success
function registerEquipment() {
    const formData = new FormData();
    formData.append('type', 'registerEquipment');
    formData.append('name', 'カメラ');
    formData.append('total', '10'); // 仮のサイトID
    formData.append('unitPrice', '10000'); // 仮のサイトID
    fetchData(formData);
}
 
function fetchData(formData) {

    fetch('https://script.google.com/macros/s/AKfycbwuAZl1MbWM7L61uzva-E-AWtLH0QANr80n7v_el274LpQ7Sjmcj5qkiNXBGgkmVN03/exec',
        {
            method  : 'POST',
            body    : formData
        }
    )
    .then((res) => res.json())
    .then((data) => {
        console.log("Response from GAS:", data);
    })
    .catch((err) => {
        // エラーハンドリング
        console.error("Fetch error:", err);
    });  
}