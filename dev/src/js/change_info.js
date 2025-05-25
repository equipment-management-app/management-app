function changeInfo() {
    const name = document.getElementById('equipmentName').value;
    const quantity = document.getElementById('quantity').value;
    const unitPrice = document.getElementById('unitPrice').value;

    const formData = new FormData();
    formData.append('type', 'changeInfo');
    formData.append('name', name);
    formData.append('quantity', quantity);
    formData.append('unitPrice', unitPrice);

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