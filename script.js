// 全局變量
let allParticipants = []; // 所有參與者
let remainingParticipants = []; // 剩餘可抽獎的參與者
let drawnWinners = []; // 已抽中的人
let isDrawing = false; // 是否正在抽獎
let currentFileName = ''; // 當前檔案名稱

// 獎項相關變量
let prizeList = []; // 獎項清單 [{name: '特獎', count: 1}, ...]
let currentPrizeIndex = 0; // 當前獎項索引
let currentPrizeDrawnCount = 0; // 當前獎項已抽出人數
let hasPrizeList = false; // 是否有匯入獎項清單
let currentPrizeFileName = ''; // 當前獎項檔案名稱
let prizeDrawOrder = 'forward'; // 抽獎順序：'forward' 或 'reverse'

// 設定抽獎順序
function setPrizeDrawOrder(order) {
    prizeDrawOrder = order;
}

// 切換匯入方式
function switchImportMethod(method) {
    document.getElementById('fileMethod').style.display = 'none';
    document.getElementById('pasteMethod').style.display = 'none';

    if (method === 'file') {
        document.getElementById('fileMethod').style.display = 'block';
    } else if (method === 'paste') {
        document.getElementById('pasteMethod').style.display = 'block';
    }
}

// 下載範例檔
function downloadSample() {
    const sampleData = [
        ['姓名'],
        ['張三'],
        ['李四'],
        ['王五'],
        ['趙六'],
        ['錢七']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    ws['!cols'] = [
        { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '參與者名單');
    XLSX.writeFile(wb, '抽獎名單範例.xlsx');
}

// === 獎項相關功能 ===

// 切換獎項區域啟用/停用
function togglePrizeSection() {
    const toggle = document.getElementById('prizeToggle');
    const prizeContent = document.getElementById('prizeContent');
    const label = document.getElementById('prizeToggleLabel');

    if (toggle.checked) {
        // 開啟：顯示
        prizeContent.style.display = 'block';
        label.textContent = '啟用';
    } else {
        // 關閉：隱藏並清除已匯入的獎項
        prizeContent.style.display = 'none';
        label.textContent = '不啟用';

        // 清除獎項清單
        if (hasPrizeList) {
            prizeList = [];
            currentPrizeIndex = 0;
            currentPrizeDrawnCount = 0;
            hasPrizeList = false;
            currentPrizeFileName = '';
            document.getElementById('prizeImportSuccessWrapper').style.display = 'none';
            document.getElementById('prizeImportMethodsArea').style.display = 'block';
            document.getElementById('prizeFileInput').value = '';
            document.getElementById('prizePasteArea').value = '';
        }
    }

    // 更新確認按鈕顯示狀態
    updateConfirmButtonVisibility();
}

// 切換獎項匯入方式
function switchPrizeImportMethod(method) {
    document.getElementById('prizeFileMethod').style.display = 'none';
    document.getElementById('prizePasteMethod').style.display = 'none';

    if (method === 'file') {
        document.getElementById('prizeFileMethod').style.display = 'block';
    } else if (method === 'paste') {
        document.getElementById('prizePasteMethod').style.display = 'block';
    }
}

// 下載獎項範例檔
function downloadPrizeSample() {
    const sampleData = [
        ['獎項名稱', '獎項數量'],
        ['特獎', 1],
        ['頭獎', 2],
        ['貳獎', 5],
        ['參獎', 10]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    ws['!cols'] = [
        { wch: 15 },
        { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '獎項清單');
    XLSX.writeFile(wb, '獎項清單範例.xlsx');
}

// 從 Excel 匯入獎項（Input Change）
function importPrizeFromFile(event) {
    const file = event.target.files[0];
    if (file) {
        processPrizeFile(file, file.name);
    }
}

// 處理獎項檔案邏輯
function processPrizeFile(file, fileName = '獎項檔案') {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length === 0) {
                alert('Excel 檔案是空的！');
                return;
            }

            // 解析獎項資料
            const prizes = [];
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row[0] || !row[1]) continue;

                const name = row[0].toString().trim();
                const count = parseInt(row[1]);

                // 跳過表頭
                if (name === '獎項名稱' || name === '獎項' || name.toLowerCase() === 'name' ||
                    name.toLowerCase() === 'prize' || isNaN(count)) {
                    continue;
                }

                prizes.push({ name, count });
            }

            if (prizes.length === 0) {
                alert('未找到有效的獎項資料！');
                return;
            }

            prizeList = prizes;
            currentPrizeFileName = fileName;
            showPrizeImportSuccess();

            // 清空 file input
            document.getElementById('prizeFileInput').value = '';

        } catch (error) {
            alert('讀取獎項檔案失敗：' + error.message);
            console.error(error);
        }
    };

    reader.readAsArrayBuffer(file);
}

// 從手動貼上匯入獎項
function importPrizeFromPaste() {
    const pasteArea = document.getElementById('prizePasteArea');
    const text = pasteArea.value.trim();

    if (!text) {
        alert('請先貼上獎項清單！');
        return;
    }

    const lines = text.split('\n');
    const prizes = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // 支援多種分隔符：: 、 : （全形冒號）、tab、多個空格
        const parts = line.split(/[:\：\t]+|  +/);
        if (parts.length < 2) continue;

        const name = parts[0].trim();
        const count = parseInt(parts[1].trim());

        if (name && !isNaN(count) && count > 0) {
            prizes.push({ name, count });
        }
    }

    if (prizes.length === 0) {
        alert('未找到有效的獎項資料！請確認格式為：獎項名稱:數量');
        return;
    }

    prizeList = prizes;
    currentPrizeFileName = '手動貼上';
    showPrizeImportSuccess();
    pasteArea.value = '';
}

// 顯示獎項匯入成功
function showPrizeImportSuccess() {
    // 隱藏獎項匯入方式內容
    document.getElementById('prizeFileMethod').style.display = 'none';
    document.getElementById('prizePasteMethod').style.display = 'none';

    // 禁用獎項匯入方式 radio 切換
    const prizeRadios = document.querySelectorAll('input[name="prizeImportMethod"]');
    prizeRadios.forEach(radio => radio.disabled = true);

    // 計算獎項統計
    const prizeGroupCount = prizeList.length; // 獎項組數
    const prizeTotalCount = prizeList.reduce((sum, prize) => sum + prize.count, 0); // 獎項總數

    // 顯示成功訊息
    document.getElementById('prizeFileName').textContent = currentPrizeFileName;
    document.getElementById('prizeGroupCount').textContent = prizeGroupCount;
    document.getElementById('prizeTotalCount').textContent = prizeTotalCount;
    document.getElementById('prizeImportSuccessWrapper').style.display = 'block';

    hasPrizeList = true;

    // 更新確認按鈕顯示狀態
    updateConfirmButtonVisibility();
}

// 清除獎項清單
function clearPrizeList() {
    if (confirm('確定要刪除獎項清單嗎？')) {
        prizeList = [];
        currentPrizeIndex = 0;
        currentPrizeDrawnCount = 0;
        hasPrizeList = false;
        currentPrizeFileName = '';

        // 啟用獎項匯入方式 radio 切換
        const prizeRadios = document.querySelectorAll('input[name="prizeImportMethod"]');
        prizeRadios.forEach(radio => radio.disabled = false);

        // 隱藏成功訊息
        document.getElementById('prizeImportSuccessWrapper').style.display = 'none';
        document.getElementById('prizeFileInput').value = '';
        document.getElementById('prizePasteArea').value = '';

        // 重新顯示匯入方式區域 - 已不需要，因為我們不再隱藏它
        // document.getElementById('prizeImportMethodsArea').style.display = 'block';

        // 根據目前的 radio 顯示對應的內容
        const selectedMethod = document.querySelector('input[name="prizeImportMethod"]:checked').value;
        switchPrizeImportMethod(selectedMethod);

        // 更新確認按鈕顯示狀態
        updateConfirmButtonVisibility();
    }
}

// 從手動貼上匯入名單
function importFromPaste() {
    const pasteArea = document.getElementById('pasteArea');
    const text = pasteArea.value.trim();

    if (!text) {
        alert('請先貼上參與者名單！');
        return;
    }

    const names = text.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (names.length === 0) {
        alert('未找到有效的參與者名單！');
        return;
    }

    const uniqueNames = [...new Set(names)];
    showImportSuccess(uniqueNames, '手動貼上');
    pasteArea.value = '';
}

// 拖曳上傳相關邏輯 - 參與者名單
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });
}

// 拖曳上傳相關邏輯 - 獎項清單
const prizeDropZone = document.getElementById('prizeDropZone');
const prizeFileInput = document.getElementById('prizeFileInput');

if (prizeDropZone) {
    prizeDropZone.addEventListener('click', () => prizeFileInput.click());

    prizeDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        prizeDropZone.classList.add('dragover');
    });

    prizeDropZone.addEventListener('dragleave', () => {
        prizeDropZone.classList.remove('dragover');
    });

    prizeDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        prizeDropZone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            processPrizeFile(e.dataTransfer.files[0]);
        }
    });
}

// 從文件匯入名單 (Input Change)
function importFromFile(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// 處理檔案邏輯
function processFile(file) {
    // 檔案格式驗證
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
        showImportError('檔案格式錯誤', '請上傳 Excel 檔案（.xlsx 或 .xls 格式）');
        document.getElementById('fileInput').value = '';
        return;
    }

    // 檔案大小檢查（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
        showImportError('檔案過大', '檔案大小不能超過 10MB');
        document.getElementById('fileInput').value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                showImportError('Excel 檔案錯誤', 'Excel 檔案中沒有工作表');
                return;
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length === 0) {
                showImportError('檔案內容為空', 'Excel 檔案中沒有任何資料');
                return;
            }

            let names = jsonData
                .map(row => row[0])
                .filter(name => name && name.toString().trim().length > 0)
                .map(name => name.toString().trim());

            if (names.length > 0) {
                const firstItem = names[0];
                if (firstItem === '姓名' || firstItem === '名字' ||
                    firstItem.toLowerCase() === 'name' ||
                    firstItem.includes('姓名') || firstItem.includes('名字') ||
                    firstItem.toLowerCase().includes('name')) {
                    names.shift();
                }
            }

            if (names.length === 0) {
                showImportError('找不到有效資料', '請確認 Excel 第一欄（A欄）有填寫參與者姓名');
                return;
            }

            // 隱藏錯誤訊息
            hideImportError();

            const uniqueNames = [...new Set(names)];
            showImportSuccess(uniqueNames, file.name);

            // 清空 file input，以便下次可以重複選同個檔案
            document.getElementById('fileInput').value = '';

        } catch (error) {
            showImportError('讀取檔案失敗', error.message || '無法解析 Excel 檔案，請確認檔案格式正確');
            console.error(error);
        }
    };

    reader.onerror = function () {
        showImportError('讀取檔案失敗', '無法讀取檔案，請重試');
    };

    reader.readAsArrayBuffer(file);
}

// 顯示匯入錯誤訊息
function showImportError(title, message) {
    const errorDiv = document.getElementById('participantImportError');
    const errorTitle = document.getElementById('participantErrorTitle');
    const errorMessage = document.getElementById('participantErrorMessage');

    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorDiv.style.display = 'block';

    // 隱藏成功訊息
    document.getElementById('importSuccessWrapper').style.display = 'none';
}

// 隱藏匯入錯誤訊息
function hideImportError() {
    const errorDiv = document.getElementById('participantImportError');
    errorDiv.style.display = 'none';
}

// 顯示匯入成功
function showImportSuccess(names, fileName) {
    allParticipants = names;
    remainingParticipants = [...names];
    currentFileName = fileName;

    // 更新 UI - 隱藏匯入方式內容
    document.getElementById('fileMethod').style.display = 'none';
    document.getElementById('pasteMethod').style.display = 'none';

    // 禁用匯入方式 radio 切換
    const radios = document.querySelectorAll('input[name="importMethod"]');
    radios.forEach(radio => radio.disabled = true);

    // 顯示成功訊息
    document.getElementById('importSuccessWrapper').style.display = 'block';
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('totalCount').textContent = names.length;

    // 更新確認按鈕狀態
    updateConfirmButtonVisibility();
}

// 更新確認按鈕狀態
function updateConfirmButtonVisibility() {
    const prizeToggle = document.getElementById('prizeToggle');
    const hasParticipants = allParticipants.length > 0;

    // 檢查是否需要獎項清單
    const isPrizeRequired = prizeToggle.checked;
    const hasPrize = hasPrizeList;

    // 啟用條件：
    // 1. 必須已匯入參與者名單
    // 2. 如果獎項開關開啟，則必須也已匯入獎項清單
    const shouldEnable = hasParticipants && (!isPrizeRequired || hasPrize);

    // 控制按鈕的 disabled 狀態
    document.getElementById('confirmStartButton').disabled = !shouldEnable;
    document.getElementById('cancelImportButton').disabled = !hasParticipants;
}

// 取消匯入
function cancelImport() {
    if (!confirm('確定要刪除參與者名單嗎？')) {
        return;
    }

    allParticipants = [];
    remainingParticipants = [];
    drawnWinners = [];
    currentFileName = '';

    // 啟用匯入方式 radio 切換
    const radios = document.querySelectorAll('input[name="importMethod"]');
    radios.forEach(radio => radio.disabled = false);

    // 隱藏成功訊息
    document.getElementById('importSuccessWrapper').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('pasteArea').value = '';

    // 隱藏錯誤訊息
    hideImportError();

    // 根據目前的 radio 顯示對應的內容
    const selectedMethod = document.querySelector('input[name="importMethod"]:checked').value;
    switchImportMethod(selectedMethod);

    // 更新確認按鈕顯示狀態
    updateConfirmButtonVisibility();
}

// 確認開始抽獎
function confirmStartLottery() {
    document.getElementById('importSection').style.display = 'none';
    document.getElementById('resetWrapper').style.display = 'block';
    document.getElementById('lotterySection').style.display = 'block';

    // 更新剩餘人數
    document.getElementById('remainingCount').textContent = remainingParticipants.length;

    // 根據是否有獎項清單顯示不同 UI
    if (hasPrizeList && prizeList.length > 0) {
        // 有獎項清單：顯示當前獎項資訊
        // 根據抽獎順序設定初始索引
        if (prizeDrawOrder === 'reverse') {
            currentPrizeIndex = prizeList.length - 1;
        } else {
            currentPrizeIndex = 0;
        }
        currentPrizeDrawnCount = 0;
        updateCurrentPrizeDisplay();
        document.getElementById('currentPrizeInfo').style.display = 'block';
    } else {
        // 沒有獎項清單：隱藏獎項資訊區域
        document.getElementById('currentPrizeInfo').style.display = 'none';
    }
}

// 更新當前獎項顯示
function updateCurrentPrizeDisplay() {
    if (!hasPrizeList || currentPrizeIndex >= prizeList.length) return;

    const currentPrize = prizeList[currentPrizeIndex];
    document.getElementById('currentPrizeName').textContent = currentPrize.name;
    document.getElementById('currentPrizeCount').textContent = currentPrize.count;
    document.getElementById('currentPrizeDrawn').textContent = currentPrizeDrawnCount;

    // 計算並顯示下組獎項
    let nextPrizeIndex;
    if (prizeDrawOrder === 'reverse') {
        nextPrizeIndex = currentPrizeIndex - 1;
    } else {
        nextPrizeIndex = currentPrizeIndex + 1;
    }

    const nextPrizeElement = document.getElementById('nextPrizeInfo');
    const nextPrizeNameElement = document.getElementById('nextPrizeName');

    if (nextPrizeIndex >= 0 && nextPrizeIndex < prizeList.length) {
        nextPrizeNameElement.textContent = prizeList[nextPrizeIndex].name;
        nextPrizeElement.style.display = 'block';
    } else {
        nextPrizeNameElement.textContent = '無';
        nextPrizeElement.style.display = 'none';
    }
}

// 移動到下一個獎項
function moveToNextPrize() {
    // 根據抽獎順序移動索引
    if (prizeDrawOrder === 'reverse') {
        currentPrizeIndex--;
    } else {
        currentPrizeIndex++;
    }
    currentPrizeDrawnCount = 0;

    // 檢查是否已完成所有獎項
    const isCompleted = prizeDrawOrder === 'reverse'
        ? currentPrizeIndex < 0
        : currentPrizeIndex >= prizeList.length;

    if (isCompleted) {
        document.getElementById('prizeCompleteInfo').style.display = 'none';

        const rollingName = document.getElementById('rollingName');
        rollingName.textContent = '🎉 所有獎項已抽出 🎉';
        rollingName.classList.remove('rolling');
        rollingName.classList.add('result');

        const drawIcon = document.getElementById('drawIcon');
        if (drawIcon) drawIcon.style.display = 'none';

        alert('所有獎項已抽獎完成！');
        return;
    }

    // 更新顯示
    updateCurrentPrizeDisplay();
    document.getElementById('prizeCompleteInfo').style.display = 'none';

    const drawButton = document.getElementById('drawButton');
    drawButton.style.display = 'block';
    drawButton.disabled = false;  // 重新啟用按鈕

    document.getElementById('rollingName').textContent = '準備抽獎';
    document.getElementById('drawIcon').style.display = '';
}

// 抽一個人
function drawOne() {
    if (isDrawing) {
        return;
    }

    if (remainingParticipants.length === 0) {
        alert('已無剩餘參與者可抽獎！');
        return;
    }

    isDrawing = true;

    const drawButton = document.getElementById('drawButton');
    const rollingName = document.getElementById('rollingName');
    const drawIcon = document.getElementById('drawIcon');

    // 禁用按鈕
    drawButton.disabled = true;

    // 隱藏圖示
    if (drawIcon) {
        drawIcon.style.display = 'none';
        // 因為隱藏了圖示，為了保持版面穩定，或許需要補償高度？
        // 但用戶要求「不見」，通常意味著只要不顯示即可。
        // 如果版面跳動太大，可能需要 visibility: hidden
        // 但 display: none 可能比較符合「不見」的意思（不佔位）。
        // 考慮到 container 有 min-height，且是 flex center，應該還好。
    }

    // 添加滾動動畫 class
    rollingName.classList.add('rolling');

    let rollCount = 0;
    const maxRolls = 30;

    // 滾動動畫
    const rollInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * remainingParticipants.length);
        rollingName.textContent = remainingParticipants[randomIndex];
        rollCount++;

        if (rollCount >= maxRolls) {
            clearInterval(rollInterval);

            // 抽出中獎者
            const randomIndex = Math.floor(Math.random() * remainingParticipants.length);
            const winner = remainingParticipants[randomIndex];

            // 從剩餘參與者中移除
            remainingParticipants.splice(randomIndex, 1);

            // 獲取當前獎項名稱 (如果有)
            let currentPrizeNameForLog = '';
            if (hasPrizeList && currentPrizeIndex < prizeList.length) {
                currentPrizeNameForLog = prizeList[currentPrizeIndex].name;
            }

            // 加入已抽中名單 (儲存物件以供下載)
            drawnWinners.push({
                name: winner,
                prize: currentPrizeNameForLog
            });

            // 顯示結果
            setTimeout(() => {
                rollingName.textContent = winner;
                rollingName.classList.remove('rolling');
                rollingName.classList.add('result');

                // 延遲後加入名單
                setTimeout(() => {
                    // 獲取當前獎項名稱
                    let currentPrizeName = '';
                    if (hasPrizeList && currentPrizeIndex < prizeList.length) {
                        currentPrizeName = prizeList[currentPrizeIndex].name;
                    }

                    addWinnerToList(winner, currentPrizeName);
                    updateRemainingCount();

                    // 如果有獎項清單，增加已抽出人數
                    if (hasPrizeList && currentPrizeIndex < prizeList.length) {
                        currentPrizeDrawnCount++;

                        // 更新已抽出人數顯示
                        const drawnDisplay = document.getElementById('currentPrizeDrawn');
                        if (drawnDisplay) {
                            drawnDisplay.textContent = currentPrizeDrawnCount;
                        }

                        const currentPrize = prizeList[currentPrizeIndex];

                        // 檢查當前獎項是否已抽完
                        if (currentPrizeDrawnCount >= currentPrize.count) {
                            // 當前獎項已抽完
                            drawButton.style.display = 'none';
                            document.getElementById('prizeCompleteInfo').style.display = 'block';
                        } else {
                            // 還需要繼續抽當前獎項
                            drawButton.disabled = false;
                        }
                    } else {
                        // 沒有獎項清單或手動模式，恢復按鈕
                        drawButton.disabled = false;
                    }

                    rollingName.textContent = '準備抽獎';
                    rollingName.classList.remove('result');

                    // 恢復圖示
                    if (drawIcon) {
                        drawIcon.style.display = '';
                    }

                    isDrawing = false;
                }, 1500);
            }, 500);
        }
    }, 100);
}

// 將中獎者加入列表
function addWinnerToList(winner, prizeName = '') {
    const winnersGrid = document.getElementById('winnersGrid');

    // 移除「尚未開始抽獎」提示
    const noWinners = winnersGrid.querySelector('.no-winners');
    if (noWinners) {
        noWinners.remove();
    }

    // 建立中獎者卡片
    const winnerItem = document.createElement('div');
    winnerItem.className = 'winner-item';

    if (prizeName) {
        // 有獎項名稱，顯示獎項標籤 (樣式由 CSS 控制，與抽獎順序樣式一致)
        winnerItem.innerHTML = `
            <span class="prize-badge">${prizeName}</span>
            <span class="winner-name">${winner}</span>
        `;
    } else {
        winnerItem.innerHTML = `<span class="winner-name">${winner}</span>`;
    }

    // 插入到最前面
    winnersGrid.insertBefore(winnerItem, winnersGrid.firstChild);
}

// 更新剩餘人數
function updateRemainingCount() {
    document.getElementById('remainingCount').textContent = remainingParticipants.length;
}

// 重新一輪
function resetLottery() {
    if (confirm('確定要重新一輪？這將清除所有抽獎記錄並回到匯入頁面。')) {
        // 重置所有資料
        allParticipants = [];
        remainingParticipants = [];
        drawnWinners = [];
        currentFileName = '';
        isDrawing = false;

        // 重置獎項相關資料
        prizeList = [];
        currentPrizeIndex = 0;
        currentPrizeDrawnCount = 0;
        hasPrizeList = false;
        currentPrizeFileName = '';
        prizeDrawOrder = 'forward';

        // 重置參與者匯入區域
        const radios = document.querySelectorAll('input[name="importMethod"]');
        radios.forEach(radio => radio.disabled = false);
        document.getElementById('importSuccessWrapper').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('pasteArea').value = '';

        // 預設選取上傳 Excel 檔案並顯示
        document.querySelector('input[name="importMethod"][value="file"]').checked = true;
        switchImportMethod('file');

        // 隱藏錯誤訊息
        hideImportError();

        // 重置獎項匯入區域
        const prizeRadios = document.querySelectorAll('input[name="prizeImportMethod"]');
        prizeRadios.forEach(radio => radio.disabled = false);
        document.getElementById('prizeImportSuccessWrapper').style.display = 'none';
        document.getElementById('prizeFileInput').value = '';
        document.getElementById('prizePasteArea').value = '';

        // 預設選取上傳 Excel 檔案
        const prizeRadio = document.querySelector('input[name="prizeImportMethod"][value="file"]');
        if (prizeRadio) {
            prizeRadio.checked = true;
            switchPrizeImportMethod('file');
        }

        // 重置抽獎順序為正序
        const forwardRadio = document.querySelector('input[name="prizeDrawOrder"][value="forward"]');
        if (forwardRadio) {
            forwardRadio.checked = true;
        }

        // 重置獎項開關為啟用狀態（預設）
        const prizeToggle = document.getElementById('prizeToggle');
        if (prizeToggle) {
            prizeToggle.checked = true;
            togglePrizeSection(); // 使用函數來正確更新顯示狀態
        }

        // 切換頁面
        document.getElementById('resetWrapper').style.display = 'none';
        document.getElementById('lotterySection').style.display = 'none';
        document.getElementById('importSection').style.display = 'block';

        // 重置中獎者列表
        const winnersGrid = document.getElementById('winnersGrid');
        winnersGrid.innerHTML = '<p class="no-winners">尚未開始抽獎</p>';

        // 重置抽獎顯示區
        document.getElementById('rollingName').textContent = '準備抽獎';
        document.getElementById('rollingName').classList.remove('rolling');
        document.getElementById('rollingName').classList.remove('result');
        document.getElementById('drawButton').disabled = false;
        document.getElementById('drawButton').style.display = 'block';
        document.getElementById('prizeCompleteInfo').style.display = 'none';

        // 恢復圖示顯示
        const drawIcon = document.getElementById('drawIcon');
        if (drawIcon) {
            drawIcon.style.display = '';
        }

        // 更新確認按鈕狀態
        updateConfirmButtonVisibility();
    }
}
// 下載已抽中名單
function downloadWinnersList() {
    if (drawnWinners.length === 0) {
        alert('尚無已抽中名單可供下載！');
        return;
    }

    // 準備資料
    const data = [
        ['獎項名稱', '中獎者姓名']
    ];

    drawnWinners.forEach(item => {
        data.push([item.prize || '(無)', item.name]);
    });

    // 建立工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 設定欄寬
    ws['!cols'] = [
        { wch: 20 },
        { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '已抽中名單');
    XLSX.writeFile(wb, '已抽中名單.xlsx');
}

// 初始化
window.onload = function () {
    togglePrizeSection();
    updateConfirmButtonVisibility();
}
