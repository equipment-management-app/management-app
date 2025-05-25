// POSTを受け取ったら実行
function doPost(e) {
  const data = e.parameter;

  const type = data.type;

  let response = {};

  if (type === "getSiteDetails") {
    const uniqueId  = data.id;
    const siteId    = searchUniqueId(uniqueId);

    if (siteId === -1) {
      response  = {success: false, data: {}, error: "ID not found."}
    } else {
      response  = getSiteDetails(siteId);
    }
  } else if (type === "getSiteList") {
    response  = getSiteList();
  } else if (type === "registerSite") {
    response  =  registerSite(data);
  } else if (type === "getEquipmentList") {
    response  = getEquipmentList();
  } else if (type === "registerEquipment") {
    response  = registerEquipment(data);
  } else if (type === "changeInfo") {
    response  = changeInfo(data);
  } else {
    response  = {success: false, data: {}, error: "Invalid key."};
  }
  Logger.log(response);
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)
}

// 現場に使用されている機材の情報を返す
function getSiteDetails(siteId) {
  const padId     = ("00000" + siteId).slice(-5);
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheet     = ss.getSheetByName(padId);

  if (!sheet) {
    return {success: false, data : {}, error: "Failed to retrieve sheet"};
  }
  // 取得したい範囲を指定 (例: A6からE13まで)
  const lastRow   = sheet.getLastRow();

  const siteDetailsRange  = sheet.getRange(`A6:E${lastRow}`);

  // 指定した範囲の全ての値を取得（二次元配列として返されます）
  const siteDetailsArr    = siteDetailsRange.getValues();

  const dataObj = {
    data : []
  }

  /*
    row[0] => EquipmentId
    row[1] => EquipmentName
    row[2] => InUse
    row[3] => UnitPrice
    row[4] => SubTotal
  */

  siteDetailsArr.forEach((row,rowIndex) => {
    const equipmentObj = {
      id          : row[0],
      name        : row[1],
      inUse       : row[2],
      unitPrice   : row[3],
      totalPrice  : row[4]
    }
    dataObj.data.push(equipmentObj);
  });

  return {success: true, data: dataObj.data};

}


// 現場リスト
function getSiteList() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("SiteList");
    if (!sheet) {
      return {success: false, data: {}, error: "Failed to retrieve sheet."}
    }

    const lastRow       = sheet.getLastRow();
    const siteListRange = sheet.getRange(`A2:D${lastRow}`);
    const siteListArr   = siteListRange.getValues();


    const siteListObj = {
      data : []
    }
    /*
      row[0] => SiteId
      row[1] => SiteName
      row[2] => UniqueId
      row[3] => State
    */
    siteListArr.forEach((row) => {
      const siteObj = {
        id        : row[0],
        name      : row[1],
        uniqueId  : row[2],
        state     : row[3]
      };
      siteListObj.data.push(siteObj);
    });

    return {success: true, data: siteListObj.data}
}


// 現場の追加
function registerSite(param) {
  
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName("SiteList");

  if (!sheet) {
    return {success: false, data: {}, error: "Failed to retrieve sheet."}
  }


  const characters = '0123456789abcdefghijklmnopqrstuvwxyz';
  const idLength = 6;
  const maxAttempts = 1000; // ユニークID生成の最大試行回数

  const existingIds = readExistingIdsFromColumn(sheet, 3); // 存在するユニークIDをリストにする

  let newId = '';
  let isUnique = false;

  // ユニークなIDが生成されるまでループ、または最大試行回数に達するまで
  for (let attempt = 0; attempt < maxAttempts && !isUnique; attempt++) {
    newId = generateRandomIdString(characters, idLength); // ユニークIDを生成

    // Set.has() を使って高速に重複チェック
    if (!existingIds.has(newId)) {
      isUnique = true;
    }
  }

  if (isUnique) {
    const id            = sheet.getLastRow();
    const name          = param.name;
    const state         = '現場前';

    const equipmentArr  = [id, name, newId];

    sheet.appendRow(equipmentArr);

    const pullDownCell  = sheet.getRange(`D${id+1}`);
    pullDownCell.setValue(state);

    generateSiteDetailsSheet(param, id);
  } else {
    return {success: false, data: {}, error: 'Failed to generate unique ID.'}
  }

  return {success: true, data: {}}
}

// 新規現場シート作成
function generateSiteDetailsSheet(param, siteId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("EquipmentList");
  const newSheetName  = ("00000" + siteId).slice(-5);
  const newSheet      = ss.insertSheet(newSheetName);

  // 現場名を設定
  newSheet.getRange("A1").setValue(param.name);

  // 機材の返却情報を変更
  newSheet.getRange("A2:B2").setValues([["返却状況", "現場前"]]);

  // 作成日を追記
  const today = new Date();
  const date  = Utilities.formatDate(today, "JST", "YYYY/MM/DD");
  newSheet.getRange("A3:B3").setValues([["作成日", date]]);

  // カラム名を設定
  newSheet.getRange("A4:E4").setValues([["ID", "名前", "使用数", "単価", "合計"]]);

  const equipmentArr = JSON.parse(param.equipment);

  equipmentArr.forEach((arr) => {
    const name = arr.name;
    const rowIdx = checkExistEquipment(sheet, name);
    if (rowIdx === -1) return;

    const getPrice = sheet.getRange(`F${rowIdx}`).getValue();
    const totalPrice = Number(arr.inUse) * Number(getPrice);
    const insertInfoArr = [rowIdx - 1, name, arr.inUse, getPrice, totalPrice];

    newSheet.appendRow(insertInfoArr);
    Logger.log(insertInfoArr);
  });

  return;
}

// 機材リスト
function getEquipmentList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("EquipmentList");
    if (!sheet) {
      return {success: false, data: {}, error: "Failed to retrieve sheet."}
    }

    const lastRow             = sheet.getLastRow();
    const equipmentListRange  = sheet.getRange(`A2:F${lastRow}`);
    const equipmentListArr    = equipmentListRange.getValues();


    const equipmentListObj = {
      data : []
    }
    /*
      row[0] => EquipmentId
      row[1] => EquipmentName
      row[2] => Total
      row[3] => Stock
      row[4] => InUse
      row[5] => UnitPrice
    */
    equipmentListArr.forEach((row) => {
      const equipmentObj = {
        id        : row[0],
        name      : row[1],
        total     : row[2],
        stock     : row[3],
        inUse     : row[4],
        unitPrice : row[5]
      };
      equipmentListObj.data.push(equipmentObj);
    });

    return {success: true, data: equipmentListObj.data}
}

// 新しい機材の追加
function registerEquipment(param) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName("EquipmentList");

  if (!sheet) {
    return {success: false, data: {}, error: "Failed to retrieve sheet."}
  }

  const latRow  = sheet.getLastRow();

  const id        = latRow;
  const name      = param.name;
  const total     = param.total;
  const unitPrice = param.unitPrice;

  const equipmentArr = [id, name, total, total, 0, unitPrice];

  sheet.appendRow(equipmentArr);

  return {success: true, data: {}}
}

// ユニークIDを探す
function searchUniqueId(searchId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('SiteList');

  const lastRow = sheet.getLastRow();

  const idColumnValues = sheet.getRange(1, 3, lastRow, 1).getValues(); // C列の全データ

  let foundRow = -1; // 見つかった行のインデックス (1から始まるシートの行番号)

  // C列のデータをループして検索IDと一致するか確認
  for (let i = 0; i < idColumnValues.length; i++) {
    // スプレッドシートのセル値は二次元配列の形で返されるため、row[0]で値を取得
    const currentId = String(idColumnValues[i][0]).trim(); // 文字列として取得し、前後の空白を削除

    if (currentId === searchId) {
      foundRow = i + 1; // 配列のインデックスは0から始まるため、行番号に変換 (+1)
      break; // 一致するIDが見つかったらループを終了
    }
  }

  const siteIdRange = sheet.getRange(`A${foundRow}`);
  const siteIdValue = siteIdRange.getValue();

  return siteIdValue; // 現場IDを返す
}

function readExistingIdsFromColumn(sheet, columnIndex) {
  const existingIdsSet = new Set();
  const lastRow = sheet.getLastRow();

  if (lastRow > 0) {
    // 指定された列の全データを取得
    // getRange(開始行, 開始列, 行数, 列数)
    const values = sheet.getRange(1, columnIndex, lastRow, 1).getValues();
    // 各行の最初の要素（指定列の値）をSetに追加
    values.forEach(row => {
      if (row[0]) { // 空のセルを除外
        existingIdsSet.add(String(row[0])); // 文字列として追加
      }
    });
  }

  return existingIdsSet;
}


// ユニークIDの生成
function generateRandomIdString(characters, length) {
  let randomId = '';
  for (let i = 0; i < length; i++) {
    randomId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomId;
}


// 機材の情報を変更する
function changeInfo(param) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("EquipmentList");

  const equipmentRowIdx = checkExistEquipment(sheet, param.name);

  if (equipmentRowIdx === -1) {
    return {success: true, data: {}, error: `${name} not found.`};
  }

  // Total書き換え
  const equipmentTotal    = sheet.getRange(`C${equipmentRowIdx}`);
  const beforeTotal       = equipmentTotal.getValue();
  equipmentTotal.setValue(param.quantity);

  // 変更前からの増減
  const diffFromBefore    = Number(param.quantity) - Number(beforeTotal);

  const equipmentStock    = sheet.getRange(`D${equipmentRowIdx}`);
  const beforeStock       = equipmentStock.getValue();
  Logger.log(diffFromBefore);
  Logger.log(Number(beforeStock) + diffFromBefore);
  equipmentStock.setValue(Number(beforeStock) + diffFromBefore);

  const unitPriceCell     = sheet.getRange(`F${equipmentRowIdx}`);
  unitPriceCell.setValue(param.unitPrice);

  return {success: true, data: {}};
}

// 機材が存在するかチェック
function checkExistEquipment(sheet, name) {
  const lastRow = sheet.getLastRow();

  const idColumnValues = sheet.getRange(1, 2, lastRow, 1).getValues(); // B列の全データ

  let foundRow = -1; // 見つかった行のインデックス (1から始まるシートの行番号)

  // C列のデータをループして検索IDと一致するか確認
  for (let i = 0; i < idColumnValues.length; i++) {
    // スプレッドシートのセル値は二次元配列の形で返されるため、row[0]で値を取得
    const currentName = idColumnValues[i][0].trim(); // 文字列として取得し、前後の空白を削除
    if (currentName === name) {
      foundRow = i + 1; // 配列のインデックスは0から始まるため、行番号に変換 (+1)
      break; // 一致するIDが見つかったらループを終了
    }
  }

  return foundRow; // 行番号を返す
}