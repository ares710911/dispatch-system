// ==================== 系統設定與 URL 初始化 ====================
// 您可以在此處直接硬編碼您的 Google Apps Script Web App 網址
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyukmG_4b0w1xfvX0j22Jb9feMNNSbVgigaHvq6NCd1jmZs_empMZsNUYMB02BT1TzC/exec';
let SCRIPT_URL = localStorage.getItem('DISPATCH_SCRIPT_URL') || DEFAULT_SCRIPT_URL;

// 全域資料快取
let globalPersonnel = [];
let globalCategories = [];
let globalModelData = [];
let globalModelsMeta = [];
let globalStandardHours = [];

// DOM 載入後執行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化日期欄位 (預設今日)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('queryDate').value = today;

    // 綁定左上角 Logo 點擊事件，方便使用者隨時變更 Web App 網址
    const logoHeader = document.querySelector('.sidebar-header');
    if (logoHeader) {
        logoHeader.style.cursor = 'pointer';
        logoHeader.addEventListener('click', () => {
            configureScriptUrl();
        });
    }

    // 檢查 Web App 網址設定
    checkScriptUrl();

    // 初始化側邊欄導航切換
    initNavigation();

    // 綁定表單下拉連動事件
    initFormChangeListeners();

    // 綁定按鈕點擊事件
    initButtonListeners();

    // 開始載入後端基礎資料 (下拉選項)
    loadBaseData();
});

/**
 * 檢查與設定 API 網址
 */
function checkScriptUrl() {
    if (SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
        showToast('請先設定 Google Apps Script API 網址', 'error');
        setTimeout(() => {
            configureScriptUrl();
        }, 500);
    }
}

function configureScriptUrl() {
    const currentUrl = localStorage.getItem('DISPATCH_SCRIPT_URL') || '';
    const newUrl = prompt('請輸入 Google Apps Script 網頁應用程式 (Web App) 網址：', currentUrl);
    if (newUrl !== null) {
        const trimmed = newUrl.trim();
        if (trimmed) {
            localStorage.setItem('DISPATCH_SCRIPT_URL', trimmed);
            SCRIPT_URL = trimmed;
            showToast('API 網址更新成功，準備重新載入資料！', 'success');
            loadBaseData();
        } else {
            localStorage.removeItem('DISPATCH_SCRIPT_URL');
            SCRIPT_URL = DEFAULT_SCRIPT_URL;
            showToast('已重設為預設網址', 'success');
        }
    }
}

/**
 * 顯示 Toast 訊息通知
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

/**
 * 子母分頁導航切換
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const mobileTitle = document.getElementById('mobileTitle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuToggleBtn = document.getElementById('menuToggleBtn');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            // 切換 Active 樣式
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 切換右側 Section 顯示
            contentSections.forEach(sec => sec.classList.add('hidden'));
            const targetSec = document.getElementById(targetId);
            if (targetSec) targetSec.classList.remove('hidden');

            // 更新手機版 Title
            const text = item.querySelector('.text').textContent;
            mobileTitle.textContent = text;

            // 關閉行動版側邊欄
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('show');
        });
    });

    // 手機版側邊欄開關
    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('show');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    });
}

/**
 * 載入後端 API 基礎資料
 */
function loadBaseData() {
    if (SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') return;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    
    const personnelSelect = document.getElementById('personnel');
    const categorySelect = document.getElementById('category');
    personnelSelect.innerHTML = '<option value="" disabled selected>資料載入中...</option>';
    categorySelect.innerHTML = '<option value="" disabled selected>資料載入中...</option>';

    const apiInitUrl = `${SCRIPT_URL}?action=init`;
    console.log('Fetching base data from:', apiInitUrl);

    fetch(apiInitUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('網路回應不成功: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // 快取全域資料
            globalPersonnel = data.personnel || [];
            globalCategories = data.categories || [];
            globalModelData = data.modelData || [];
            globalModelsMeta = data.modelsMeta || [];
            globalStandardHours = data.standardHours || [];

            // 1. 填入人員
            personnelSelect.innerHTML = '<option value="" disabled selected>請選擇人員</option>';
            globalPersonnel.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                personnelSelect.appendChild(opt);
            });

            // 2. 填入類別
            categorySelect.innerHTML = '<option value="" disabled selected>請選擇類別</option>';
            globalCategories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categorySelect.appendChild(opt);
            });

            // 3. 填入機型類別 (取不重複值)
            const modelCategorySelect = document.getElementById('modelCategory');
            modelCategorySelect.innerHTML = '<option value="" disabled selected>請選擇機型類別</option>';
            
            const uniqueCategories = [...new Set(globalModelData.map(item => item.modelCategory))].filter(Boolean);
            uniqueCategories.sort().forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                modelCategorySelect.appendChild(opt);
            });
            modelCategorySelect.disabled = false;

            submitBtn.disabled = false;
            showToast('系統基礎下拉選單載入完成！', 'success');
        })
        .catch(error => {
            console.error('載入基礎資料失敗:', error);
            showToast('連線 API 失敗，請確認 API 網址是否正確並已部署為 Web App！', 'error');
            personnelSelect.innerHTML = '<option value="" disabled selected>載入失敗，點擊 LOGO 重新設定</option>';
            categorySelect.innerHTML = '<option value="" disabled selected>載入失敗，點擊 LOGO 重新設定</option>';
        });
}

/**
 * 處理下拉選單的連動邏輯
 */
function initFormChangeListeners() {
    const modelCategorySelect = document.getElementById('modelCategory');
    const modelSelect = document.getElementById('model');
    const processSelect = document.getElementById('process');
    const productionOrderSelect = document.getElementById('productionOrder');
    const productionQtySelect = document.getElementById('productionQty');
    const estQtyInput = document.getElementById('estQty');
    const categorySelect = document.getElementById('category');

    // 0. 類別變更 -> 決定生產製令是否可選與連動
    categorySelect.addEventListener('change', () => {
        updateProductionOrderVisibility();
    });

    // 1. 機型類別變更 -> 連動機型
    modelCategorySelect.addEventListener('change', () => {
        const selectedCat = modelCategorySelect.value;
        modelSelect.innerHTML = '<option value="" disabled selected>請選擇機型</option>';
        processSelect.innerHTML = '<option value="" disabled selected>請先選擇機型</option>';
        productionQtySelect.value = '';
        
        modelSelect.disabled = true;
        processSelect.disabled = true;
        
        // 觸發連動可見度更新
        updateProductionOrderVisibility();

        if (!selectedCat) return;

        // 從工序Data篩選出對應的機型 (去重)
        const filteredModels = [...new Set(
            globalModelData
                .filter(item => item.modelCategory === selectedCat)
                .map(item => item.model)
        )].filter(Boolean);

        filteredModels.sort().forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
        });

        modelSelect.disabled = false;
        recalculateEstHours();
    });

    // 2. 機型變更 -> 連動工序、生產製令
    modelSelect.addEventListener('change', () => {
        const selectedModel = modelSelect.value;
        processSelect.innerHTML = '<option value="" disabled selected>請選擇工序</option>';
        processSelect.disabled = true;
        productionQtySelect.value = '';

        if (!selectedModel) {
            updateProductionOrderVisibility();
            recalculateEstHours();
            return;
        }

        // A. 篩選工序 (來自工序Data, 對應機型)
        const filteredProcesses = [...new Set(
            globalModelData
                .filter(item => item.model === selectedModel)
                .map(item => item.process)
        )].filter(Boolean);

        filteredProcesses.sort().forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            processSelect.appendChild(opt);
        });
        processSelect.disabled = false;

        // B. 連動生產製令
        updateProductionOrderVisibility();

        recalculateEstHours();
    });

    // 2.5. 生產製令變更 -> 自動帶出對應的生產數量唯一值
    productionOrderSelect.addEventListener('change', () => {
        const selectedPO = productionOrderSelect.value;
        if (!selectedPO) {
            productionQtySelect.value = '';
            return;
        }
        const match = globalModelsMeta.find(item => item.productionOrder === selectedPO);
        if (match) {
            productionQtySelect.value = match.productionQty || '';
        } else {
            productionQtySelect.value = '';
        }
    });

    // 3. 工序變更 -> 重新計算工時
    processSelect.addEventListener('change', () => {
        recalculateEstHours();
    });

    // 4. 預計數量輸入 -> 重新計算工時
    estQtyInput.addEventListener('input', () => {
        recalculateEstHours();
    });

    // 5. 起始時間 / 結束時間變更 -> 計算投入工時
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    startTimeInput.addEventListener('input', recalculateDuration);
    endTimeInput.addEventListener('input', recalculateDuration);
}

/**
 * 預計工時自動計算
 * 預計工時 = 該「機型類別」與「工序」對應於「工序標準工時」分頁的標準工時 × 預計數量
 */
function recalculateEstHours() {
    const modelCategory = document.getElementById('modelCategory').value;
    const process = document.getElementById('process').value;
    const estQty = parseFloat(document.getElementById('estQty').value) || 0;
    const estHoursInput = document.getElementById('estHours');

    if (!modelCategory || !process || estQty <= 0) {
        estHoursInput.value = '';
        return;
    }

    // 在工時快取中尋找 matching row
    const match = globalStandardHours.find(item => 
        String(item.modelCategory).trim().toLowerCase() === String(modelCategory).trim().toLowerCase() &&
        String(item.process).trim().toLowerCase() === String(process).trim().toLowerCase()
    );

    if (match) {
        const stdHour = parseFloat(match.hours2025H2) || 0;
        const totalHours = stdHour * estQty;
        // 四捨五入到小數點後四位
        estHoursInput.value = Math.round(totalHours * 10000) / 10000;
    } else {
        estHoursInput.value = 0;
        console.warn(`未找到對應的標準工時設定：機型類別=${modelCategory}, 工序=${process}`);
    }
}

/**
 * 計算投入工時，扣除 10:00~10:10、12:00~13:00、15:30~15:40 三個休息時段
 */
function recalculateDuration() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const durationInput = document.getElementById('inputDuration');

    if (!startTime || !endTime) {
        durationInput.value = '';
        return;
    }

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return null;
        // 匹配 HH:MM 或 H:MM，相容半形與全形冒號，也可以包含日期尾碼
        const match = timeStr.trim().match(/(?:^|\s)([0-9]{1,2})[:：]([0-9]{2})/);
        if (match) {
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            return hours * 60 + minutes;
        }
        return null;
    };

    const startMins = timeToMinutes(startTime);
    let endMins = timeToMinutes(endTime);

    if (startMins === null || endMins === null) {
        durationInput.value = '';
        return;
    }

    // 跨日處理 (若結束時間小於起始時間，表示跨日，加一天 1440 分鐘)
    if (endMins < startMins) {
        endMins += 1440;
    }

    // 定義扣除時段 (以自午夜起算的分鐘數表示)
    const breaks = [
        { start: 10 * 60, end: 10 * 60 + 10 },       // 10:00 ~ 10:10 (10分鐘)
        { start: 12 * 60, end: 13 * 60 },            // 12:00 ~ 13:00 (60分鐘)
        { start: 15 * 60 + 30, end: 15 * 60 + 40 }   // 15:30 ~ 15:40 (10分鐘)
    ];

    let totalOverlap = 0;
    breaks.forEach(b => {
        // 第一天
        const overlap1 = Math.max(0, Math.min(endMins, b.end) - Math.max(startMins, b.start));
        totalOverlap += overlap1;

        // 第二天 (加 1440 分鐘)
        const bStart2 = b.start + 1440;
        const bEnd2 = b.end + 1440;
        const overlap2 = Math.max(0, Math.min(endMins, bEnd2) - Math.max(startMins, bStart2));
        totalOverlap += overlap2;
    });

    const netMinutes = (endMins - startMins) - totalOverlap;
    durationInput.value = Math.max(0, netMinutes) + ' 分鐘';
}

/**
 * 控制生產製令 dropdown 是否可見與是否為必選
 */
function updateProductionOrderVisibility() {
    const categorySelect = document.getElementById('category');
    const modelSelect = document.getElementById('model');
    const productionOrderSelect = document.getElementById('productionOrder');
    const productionQtySelect = document.getElementById('productionQty');

    const selectedCategory = categorySelect.value;
    const selectedModel = modelSelect.value;

    if (selectedCategory === '生產製令') {
        productionOrderSelect.required = true;
        
        if (selectedModel) {
            // 備份當前選定的製令值
            const currentSelectedPO = productionOrderSelect.value;
            productionOrderSelect.innerHTML = '<option value="" disabled selected>請選擇生產製令</option>';
            
            const filteredOrders = [...new Set(
                globalModelsMeta
                    .filter(item => item.model === selectedModel)
                    .map(item => item.productionOrder)
            )].filter(Boolean);

            filteredOrders.sort().forEach(po => {
                const opt = document.createElement('option');
                opt.value = po;
                opt.textContent = po;
                productionOrderSelect.appendChild(opt);
            });
            productionOrderSelect.disabled = false;
            
            // 如果原本選的製令還在可選範圍內，則還原選取值
            if (currentSelectedPO && filteredOrders.includes(currentSelectedPO)) {
                productionOrderSelect.value = currentSelectedPO;
            }
        } else {
            productionOrderSelect.innerHTML = '<option value="" disabled selected>請先選擇機型</option>';
            productionOrderSelect.disabled = true;
            productionQtySelect.value = '';
        }
    } else {
        // 如果類別非「生產製令」，則清空並禁用生產製令下拉選單，且不設為必填
        productionOrderSelect.required = false;
        productionOrderSelect.innerHTML = '<option value="" disabled selected>無須選取生產製令</option>';
        productionOrderSelect.disabled = true;
        productionQtySelect.value = '';
    }
}

/**
 * 初始化按鈕點擊與提交監聽
 */
function initButtonListeners() {
    const form = document.getElementById('dispatchForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitSpinner = document.getElementById('submitSpinner');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const queryBtn = document.getElementById('queryBtn');
    const printBtn = document.getElementById('printBtn');

    // 表單送出事件 (新增 / 修改)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
            showToast('請先設定 Web App API 網址才可以送出資料！', 'error');
            return;
        }

        // 1. 自訂欄位驗證
        const date = document.getElementById('date').value;
        const personnel = document.getElementById('personnel').value;
        const category = document.getElementById('category').value;
        const modelCategory = document.getElementById('modelCategory').value;
        const model = document.getElementById('model').value;
        const process = document.getElementById('process').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const estQty = parseFloat(document.getElementById('estQty').value) || 0;

        if (!date || !personnel || !category || !modelCategory || !model || !process || !startTime || !endTime) {
            showToast('請確實填寫所有基本資訊與時間！', 'error');
            return;
        }



        // 只有當類別為「生產製令」時，才要求檢查生產製令與數量
        if (category === '生產製令') {
            const productionOrder = document.getElementById('productionOrder').value;
            const productionQty = document.getElementById('productionQty').value;
            if (!productionOrder) {
                showToast('當類別為「生產製令」時，必須選取生產製令！', 'error');
                return;
            }
            if (!productionQty) {
                showToast('無法自動帶出該製令的生產數量，請檢查 Model 資料設定！', 'error');
                return;
            }
        }

        // 收集表單資料
        const formData = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            params.append(key, value);
        }

        // 鎖定表單
        submitBtn.disabled = true;
        submitSpinner.classList.remove('hidden');

        const isEdit = document.getElementById('rowIndex').value !== '';
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(res => res.json())
        .then(result => {
            if (result.status === 'success') {
                showToast(isEdit ? '資料更新成功！' : '派工登錄成功！', 'success');
                
                // 如果是修改狀態，重設回新增模式，但保留欄位值，並自動回到查詢頁面
                if (isEdit) {
                    document.getElementById('rowIndex').value = '';
                    document.getElementById('formTitle').textContent = '生產派工登錄';
                    document.getElementById('formSubTitle').textContent = '填寫每日生產人員之指派工序與排程數量';
                    document.getElementById('submitBtn').querySelector('.btn-text').textContent = '送出派工紀錄';
                    document.getElementById('cancelEditBtn').classList.add('hidden');

                    const navQuery = document.querySelector('[data-target="dispatchQuerySection"]');
                    if (navQuery) navQuery.click();
                    
                    // 將查詢日期設為剛更新的日期，並重新搜尋
                    const updatedDate = params.get('date');
                    if (updatedDate) {
                        document.getElementById('queryDate').value = updatedDate;
                        performQuery();
                    }
                } else {
                    // 新增模式送出成功後，畫面完全不重置，保留上一筆選擇資訊
                }
            } else {
                showToast('儲存失敗：' + (result.error || '未知錯誤'), 'error');
            }
        })
        .catch(err => {
            console.error('儲存資料時發生錯誤:', err);
            showToast('連線伺服器失敗，請檢查網路或 API 設定！', 'error');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitSpinner.classList.add('hidden');
        });
    });

    // 取消修改按鈕
    cancelEditBtn.addEventListener('click', () => {
        resetForm();
        // 返回查詢分頁
        const navQuery = document.querySelector('[data-target="dispatchQuerySection"]');
        if (navQuery) navQuery.click();
    });

    // 查詢按鈕點擊
    queryBtn.addEventListener('click', () => {
        performQuery();
    });

    // 列印按鈕點擊
    printBtn.addEventListener('click', () => {
        window.print();
    });
}

/**
 * 執行查詢功能
 */
function performQuery() {
    if (SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
        showToast('請先點擊左上角 LOGO 設定 API 網址！', 'error');
        return;
    }

    const queryDate = document.getElementById('queryDate').value;
    if (!queryDate) {
        showToast('請選擇查詢日期', 'error');
        return;
    }

    const querySpinner = document.getElementById('querySpinner');
    const resultsBody = document.getElementById('resultsBody');
    
    querySpinner.classList.remove('hidden');
    resultsBody.innerHTML = `
        <tr>
            <td colspan="16" class="empty-state">
                <div class="spinner"></div>
                <div style="margin-top: 12px;">查詢中...</div>
            </td>
        </tr>
    `;

    const url = `${SCRIPT_URL}?action=query&date=${queryDate}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            const records = data.records || [];
            if (records.length === 0) {
                resultsBody.innerHTML = `
                    <tr>
                        <td colspan="16" class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <div>此日期無任何派工紀錄</div>
                        </td>
                    </tr>
                `;
                return;
            }

            resultsBody.innerHTML = '';
            records.forEach(r => {
                const formatTimeLocal = (str) => {
                    if (!str) return '';
                    // 匹配時間部分，如 1899-12-30T08:00:00 提取出 08:00
                    const match = String(str).match(/(?:^|\s|[T])([0-9]{1,2})[:：]([0-9]{2})/);
                    if (match) {
                        return `${match[1].padStart(2, '0')}:${match[2]}`;
                    }
                    return String(str).trim();
                };

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.date || ''}</td>
                    <td>${r.personnel || ''}</td>
                    <td>${r.category || ''}</td>
                    <td>${r.modelCategory || ''}</td>
                    <td>${r.model || ''}</td>
                    <td>${r.process || ''}</td>
                    <td>${r.productionOrder || ''}</td>
                    <td>${r.productionQty || ''}</td>
                    <td>${formatTimeLocal(r.startTime)}</td>
                    <td>${formatTimeLocal(r.endTime)}</td>
                    <td style="color: var(--danger); font-weight: bold;">${r.inputDuration || ''}</td>
                    <td>${r.estQty || ''}</td>
                    <td>${r.estHours || ''}</td>
                    <td>${r.actQty || ''}</td>
                    <td>${r.defectQty || ''}</td>
                    <td class="col-actions" style="text-align: right;">
                        <button class="btn btn-secondary btn-icon edit-row-btn" data-row='${JSON.stringify(r)}'>編輯</button>
                    </td>
                `;
                resultsBody.appendChild(tr);
            });

            // 綁定每一列的編輯按鈕點擊事件
            bindRowEditListeners();
            showToast(`查詢完成，共 ${records.length} 筆資料`, 'success');
        })
        .catch(err => {
            console.error('查詢失敗:', err);
            showToast('查詢失敗，請確認 API 網址與網路！', 'error');
            resultsBody.innerHTML = `
                <tr>
                    <td colspan="15" class="empty-state" style="color: var(--danger);">
                        <div class="empty-state-icon">⚠️</div>
                        <div>查詢出錯，請確認 API 網址正確設定並部署！</div>
                    </td>
                </tr>
            `;
        })
        .finally(() => {
            querySpinner.classList.add('hidden');
        });
}

/**
 * 綁定資料行內編輯
 */
function bindRowEditListeners() {
    const editBtns = document.querySelectorAll('.edit-row-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const rowData = JSON.parse(btn.getAttribute('data-row'));
            enterEditMode(rowData);
        });
    });
}

/**
 * 進入編輯模式，並將資料帶入表單中
 */
function enterEditMode(r) {
    // 1. 切換到表單 Section
    const navForm = document.querySelector('[data-target="dispatchFormSection"]');
    if (navForm) navForm.click();

    // 2. 更新表單 UI 為修改模式
    document.getElementById('formTitle').textContent = '修改生產派工';
    document.getElementById('formSubTitle').textContent = `正在修改第 ${r.rowIndex} 行之派工紀錄`;
    document.getElementById('submitBtn').querySelector('.btn-text').textContent = '更新派工紀錄';
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    // 3. 填入表單欄位值
    document.getElementById('rowIndex').value = r.rowIndex;
    document.getElementById('date').value = r.date || '';
    document.getElementById('personnel').value = r.personnel || '';
    document.getElementById('category').value = r.category || '';
    
    // 下拉選單連動填充處理
    const modelCategorySelect = document.getElementById('modelCategory');
    const modelSelect = document.getElementById('model');
    const processSelect = document.getElementById('process');
    const productionOrderSelect = document.getElementById('productionOrder');
    const productionQtySelect = document.getElementById('productionQty');

    // A. 選擇機型類別，並手動觸發連動
    modelCategorySelect.value = r.modelCategory || '';
    
    // B. 手動重建「機型」下拉選單
    modelSelect.innerHTML = '<option value="" disabled>請選擇機型</option>';
    const filteredModels = [...new Set(
        globalModelData
            .filter(item => item.modelCategory === r.modelCategory)
            .map(item => item.model)
    )].filter(Boolean);
    filteredModels.sort().forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
    });
    modelSelect.disabled = false;
    modelSelect.value = r.model || '';

    // C. 手動重建「工序」、「生產製令」、「生產數量」下拉選單
    processSelect.innerHTML = '<option value="" disabled>請選擇工序</option>';
    const filteredProcesses = [...new Set(
        globalModelData
            .filter(item => item.model === r.model)
            .map(item => item.process)
    )].filter(Boolean);
    filteredProcesses.sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        processSelect.appendChild(opt);
    });
    processSelect.disabled = false;
    processSelect.value = r.process || '';

    // D. 連動並加載生產製令
    updateProductionOrderVisibility();
    productionOrderSelect.value = r.productionOrder || '';
    productionQtySelect.value = r.productionQty || '';

    // D. 填充剩餘的手動輸入欄位
    document.getElementById('startTime').value = r.startTime || '';
    document.getElementById('endTime').value = r.endTime || '';
    document.getElementById('inputDuration').value = r.inputDuration || '';
    document.getElementById('estQty').value = r.estQty || '';
    document.getElementById('estHours').value = r.estHours || '';
    document.getElementById('actQty').value = r.actQty || '';
    document.getElementById('defectQty').value = r.defectQty || '';

    showToast('已載入該列資料，可進行修改', 'success');
}

/**
 * 重設/重置表單到預設狀態
 */
function resetForm() {
    const form = document.getElementById('dispatchForm');
    form.reset();

    // 恢復日期為今天
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    // 清除隱藏的 rowIndex 及投入工時
    document.getElementById('rowIndex').value = '';
    document.getElementById('inputDuration').value = '';

    // 下置下拉選單為唯讀/停用，直到上游被選取
    document.getElementById('model').innerHTML = '<option value="" disabled selected>請先選擇機型類別</option>';
    document.getElementById('model').disabled = true;
    document.getElementById('process').innerHTML = '<option value="" disabled selected>請先選擇機型</option>';
    document.getElementById('process').disabled = true;
    // 更新生產製令的連動與必填狀態
    updateProductionOrderVisibility();

    // 恢復 UI 到新增狀態
    document.getElementById('formTitle').textContent = '生產派工登錄';
    document.getElementById('formSubTitle').textContent = '填寫每日生產人員之指派工序與排程數量';
    document.getElementById('submitBtn').querySelector('.btn-text').textContent = '送出派工紀錄';
    document.getElementById('cancelEditBtn').classList.add('hidden');
}
