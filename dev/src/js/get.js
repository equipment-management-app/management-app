function getIdParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        throw new Error('ID parameter is missing in the URL');
    }
    return id;
}

/*
    formDataを使用するとGASとの連携が楽になるので使っています．
    GASにリクエスト送信する場合は，
    fetchData(formData)
    .then((data) => {
        console.log("Data received:", data);
        // ここでデータを処理する
    }
    .catch((error) => {
        console.error("Error fetching data:", error);
    });
    のように書いてください．
    返ってきたデータはdataに入ります．
    .then()の中以外では返ってきたデータは使えません．

*/


function getSiteDetails() {
    const id = getIdParam();
    const formData = new FormData();
    formData.append('id', id);
    formData.append('type', 'getSiteDetails');
    fetchData(formData)
    .then((data) => {
        console.log("Data received:", data);
        // ここでデータを処理する
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
    });
    
}

function getSiteList() {
    const formData = new FormData();
    formData.append('type', 'getSiteList');
    fetchData(formData)
    .then((data) => {
        console.log("Data received:", data);
        // ここでデータを処理する
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
    });
}


function registerSite() {
    const formData = new FormData();
    const equipmentArr = [
        { name: "V-160HD", inUse: 3 },
        { name: "1mHDMIケーブル", inUse: 2 }
    ];

    formData.append('type', 'registerSite');
    formData.append('name', '株式会社未来創造');
    formData.append('equipment', JSON.stringify(equipmentArr)); // ✅ stringifyして1つのキーで送る

    fetchData(formData)
        .then((data) => {
        console.log("Data received:", data);
        })
        .catch((error) => {
        console.error("Error fetching data:", error);
        });

}

function getEquipmentList() {
    const formData = new FormData();
    formData.append('type', 'getEquipmentList');
    fetchData(formData)
    .then((data) => {
        console.log("Data received:", data);
        // ここでデータを処理する
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
    });
}

function registerEquipment() {
    const formData = new FormData();
    formData.append('type', 'registerEquipment');
    formData.append('name', 'カメラ');
    formData.append('total', '10');
    formData.append('unitPrice', '10000');
    fetchData(formData)
    .then((data) => {
        console.log("Data received:", data);
        // ここでデータを処理する
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
    });
}

function fetchData(formData) {

    return fetch('https://script.google.com/macros/s/AKfycbwuAZl1MbWM7L61uzva-E-AWtLH0QANr80n7v_el274LpQ7Sjmcj5qkiNXBGgkmVN03/exec',
        {
            method  : 'POST',
            body    : formData
        }
    )
    .then((res) => res.json())
}