/* =========================================
   APP MODULE
========================================= */

/* =========================================
   UNSAVED NEW DOCUMENT GUARD
========================================= */

function getActivePageName(){

    const activePage =
        document.querySelector(
            ".page.active-page"
        );

    if(!activePage)
        return "";

    return activePage.id.replace(
        "-page",
        ""
    );

}

function hasWorkOrderDraft(){

    if(
        typeof currentWorkOrderId !==
        "undefined" &&
        currentWorkOrderId
    ){
        return false;
    }

    const textFields =
        document.querySelectorAll(
            "#workorder-page input:not([type='file']), #workorder-page textarea"
        );

    for(
        const field of textFields
    ){

        if(
            (field.value || "")
            .trim()
        ){
            return true;
        }

    }

    const hasPhotos =
        document.querySelector(
            "#woPhotoContainer img"
        );

    if(hasPhotos)
        return true;

    const estimateRows =
        document.querySelectorAll(
            "#estimateBody tr"
        );

    for(
        const row of estimateRows
    ){

        const description =
            row.querySelector(
                ".estimate-description"
            );

        const category =
            row.querySelector(
                ".estimate-category"
            );

        const amount =
            row.querySelector(
                ".estimate-amount"
            );

        if(
            (
                description &&
                description.value.trim()
            ) ||
            (
                category &&
                category.value.trim()
            ) ||
            (
                amount &&
                amount.value.trim()
            )
        ){
            return true;
        }

    }

    return false;

}

function hasVerificationDraft(){

    if(
        typeof currentVerificationId !==
        "undefined" &&
        currentVerificationId
    ){
        return false;
    }

    const fields =
        document.querySelectorAll(
            "#verification-page input:not([type='file']), #verification-page textarea"
        );

    for(
        const field of fields
    ){

        if(
            field.type === "checkbox"
        ){

            if(field.checked)
                return true;

            continue;

        }

        if(
            (field.value || "")
            .trim()
        ){
            return true;
        }

    }

    if(
        document.querySelector(
            "#photoPairsContainer .photo-pair"
        )
    ){
        return true;
    }

    return false;

}

function clearNewDocumentDraft(pageName){

    if(
        pageName === "workorder" &&
        typeof clearWorkOrderForm ===
        "function"
    ){

        clearWorkOrderForm();

    }

    if(
        pageName === "verification" &&
        typeof clearVerificationForm ===
        "function"
    ){

        clearVerificationForm();

    }

}

function hasNewDocumentDraft(pageName){

    if(pageName === "workorder")
        return hasWorkOrderDraft();

    if(pageName === "verification")
        return hasVerificationDraft();

    return false;

}

function confirmLeavingNewDocument(pageName){

    if(
        !hasNewDocumentDraft(
            pageName
        )
    ){
        return true;
    }

    const leave =
        confirm(
            "This new work has not been saved yet.\n\nClick Cancel to stay and save it.\nClick OK to leave and erase the unsaved work."
        );

    if(leave){

        clearNewDocumentDraft(
            pageName
        );

    }

    return leave;

}

function initializeUnsavedDocumentWarning(){

    window.addEventListener(
        "beforeunload",
        event => {

            const activePage =
                getActivePageName();

            if(
                hasNewDocumentDraft(
                    activePage
                )
            ){

                event.preventDefault();
                event.returnValue = "";

            }

        }
    );

    window.addEventListener(
        "pagehide",
        () => {

            const activePage =
                getActivePageName();

            if(
                hasNewDocumentDraft(
                    activePage
                )
            ){

                clearNewDocumentDraft(
                    activePage
                );

            }

        }
    );

}

/* =========================================
   NAVIGATION
========================================= */

function showPage(pageName) {

    const activePage =
        getActivePageName();

    if(
        activePage &&
        activePage !== pageName &&
        !confirmLeavingNewDocument(
            activePage
        )
    ){
        return false;
    }

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active-page"
            );

        });

    const targetPage =
        document.getElementById(
            `${pageName}-page`
        );

    if(targetPage){

        targetPage.classList.add(
            "active-page"
        );

    }

    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });

    const activeButton =
        document.querySelector(
            `[data-page="${pageName}"]`
        );

    if(activeButton){

        activeButton.classList.add(
            "active"
        );

    }

    if(
        pageName === "viewer" &&
        typeof refreshDocumentViewer === "function"
    ){

        refreshDocumentViewer();

    }

    return true;

}

/* =========================================
   SIDEBAR EVENTS
========================================= */

function initializeNavigation() {

    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    showPage(
                        page
                    );

                }
            );

        });

}

/* =========================================
   DASHBOARD CARDS
========================================= */

function initializeDashboard() {

    const cards =
        document.querySelectorAll(
            ".dashboard-card"
        );

    if(cards.length >= 4){

        cards[0].addEventListener(
            "click",
            () => showPage(
                "workorder"
            )
        );

        cards[1].addEventListener(
            "click",
            () => showPage(
                "verification"
            )
        );

        cards[2].addEventListener(
            "click",
            () => showPage(
                "saved"
            )
        );

        cards[3].addEventListener(
            "click",
            () => showPage(
                "settings"
            )
        );

    }

}

/* =========================================
   PDF BUTTONS
========================================= */

function initializePDFButtons() {

    const workOrderBtn =
        document.getElementById(
            "pdfWorkOrderBtn"
        );

    if(workOrderBtn){

        workOrderBtn.addEventListener(
            "click",
            async () => {

                await generateWorkOrderPDF();

            }
        );

    }

    const verificationBtn =
        document.getElementById(
            "pdfVerificationBtn"
        );

    if(verificationBtn){

        verificationBtn.addEventListener(
            "click",
            async () => {

                await generateVerificationPDF();

            }
        );

    }

    const ownerApprovalBtn =
        document.getElementById(
            "ownerApprovalPdfBtn"
        );

    if(ownerApprovalBtn){

        ownerApprovalBtn.addEventListener(
            "click",
            async () => {

                await generateOwnerApprovalPDF();

            }
        );

    }

    const quoteRequestPdfBtn =
        document.getElementById(
            "quoteRequestPdfBtn"
        );

    if(quoteRequestPdfBtn){

        quoteRequestPdfBtn.addEventListener(
            "click",
            async () => {

                await generateQuoteRequestPDF();
        
            }
        );

    }

}




/* =========================================
   BACKUP CONTROLS
========================================= */

function createBackupControls() {

    const archivePage =
        document.getElementById(
            "archive-page"
        );

    if(!archivePage)
        return;

    const container =
        document.createElement(
            "div"
        );

    container.className =
        "card";

    container.innerHTML = `

        <h3>
            Database Backup
        </h3>

        <div class="action-bar">

            <button
                id="exportBackupBtn">

                Export Backup

            </button>

            <button
                id="importBackupBtn">

                Import Backup

            </button>

            <input
                type="file"
                id="backupFileInput"
                accept=".json"
                style="display:none">

        </div>

    `;

    archivePage.prepend(
        container
    );

    document
        .getElementById(
            "exportBackupBtn"
        )
        .addEventListener(
            "click",
            exportDatabase
        );

    document
        .getElementById(
            "importBackupBtn"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "backupFileInput"
                    )
                    .click();

            }
        );

    document
        .getElementById(
            "backupFileInput"
        )
        .addEventListener(
            "change",
            async function(){

                if(
                    this.files.length
                ){

                    await importDatabase(
                        this.files[0]
                    );

                    loadArchive();

                }

            }
        );

}

/* =========================================
   STARTUP
========================================= */

async function initializeApplication() {

    try {

        await initDatabase();

        initializeUnsavedDocumentWarning();

        initializeNavigation();

        initializeDashboard();

        initializePDFButtons();

        if(
            typeof initializeDocumentViewer
            === "function"
        ){

            initializeDocumentViewer();

        }

        createBackupControls();

        if(
            typeof startSettingsModule
            === "function"
        ){

            await startSettingsModule();

        }

        if(
            typeof initializeWorkOrderModule
            === "function"
        ){

            initializeWorkOrderModule();

        }

        if(
            typeof initializeVerificationModule
            === "function"
        ){

            initializeVerificationModule();

        }

        if(
            typeof initializeArchiveModule
            === "function"
        ){

            initializeArchiveModule();

        }

        showPage(
            "dashboard"
        );

        console.log(
            "Property Management Generator Ready"
        );

    }
    catch(error){

        console.error(
            error
        );

        alert(
            "Application failed to initialize."
        );

    }

}

/* =========================================
   APP LOAD
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);
