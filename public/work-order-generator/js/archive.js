/* =========================================
   ARCHIVE MODULE
========================================= */

let archiveRecords = [];
let archivePreviewUrl = null;
let archivePreviewContext = null;
let savedWorkKindFilter = "workOrder";

/* =========================================
   INITIALIZE
========================================= */

function initializeArchiveModule() {

    initializeArchiveEvents();

    createArchivePreviewModal();

    loadArchive();

}

/* =========================================
   EVENTS
========================================= */

function initializeArchiveEvents() {

    const searchInput =
        document.getElementById(
            "archiveSearch"
        );

    if(searchInput){

        searchInput.addEventListener(
            "input",
            debounce(
                loadArchive,
                300
            )
        );

    }

    const savedSearchInput =
        document.getElementById(
            "savedWorkSearch"
        );

    if(savedSearchInput){

        savedSearchInput.addEventListener(
            "input",
            debounce(
                renderSavedWork,
                300
            )
        );

    }

    document
        .querySelectorAll(
            ".saved-work-tab"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    savedWorkKindFilter =
                        button.dataset.kind ||
                        "workOrder";

                    document
                        .querySelectorAll(
                            ".saved-work-tab"
                        )
                        .forEach(tab => {
                            tab.classList.remove(
                                "active"
                            );
                        });

                    button.classList.add(
                        "active"
                    );

                    renderSavedWork();

                }
            );

        });

}

/* =========================================
   LOAD ARCHIVE
========================================= */

async function loadArchive() {

    try {

        const workOrders =
            await getAllRecords(
                "workOrders"
            );

        const verifications =
            await getAllRecords(
                "verifications"
            );

        archiveRecords = [

            ...workOrders.map(item => ({
                ...item,
                recordType: "Work Order"
            })),

            ...verifications.map(item => ({
                ...item,
                recordType: "Verification"
            }))

        ];

        renderArchive();

        renderSavedWork();

    }
    catch(error){

        console.error(error);

    }

}

/* =========================================
   RENDER ARCHIVE
========================================= */

function renderArchive() {

    const container =
        document.getElementById(
            "archiveResults"
        );

    if(!container)
        return;

    container.innerHTML = "";

    const searchTerm =
        (
            document.getElementById(
                "archiveSearch"
            ).value || ""
        )
        .toLowerCase();

    const filtered =
        archiveRecords.filter(
            record => {

            return JSON.stringify(
                record
            )
            .toLowerCase()
            .includes(
                searchTerm
            );

        });

    if(filtered.length === 0){

        container.innerHTML = `
            <div class="archive-item">
                No records found.
            </div>
        `;

        return;

    }

    filtered.sort(
        (a,b) =>
            new Date(
                b.createdDate || 0
            ) -
            new Date(
                a.createdDate || 0
            )
    );

    filtered.forEach(record => {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "archive-item";

        const priority =
            record.priority ||
            "Routine";

        item.innerHTML = `

            <h4>
                ${record.recordType}
            </h4>

            <div class="archive-meta">

                <strong>
                    Work Order:
                </strong>

                ${
                    record.workOrderNumber ||
                    "-"
                }

                <br>

                <strong>
                    Address:
                </strong>

                ${
                    record.address ||
                    "-"
                }

                <br>

                <strong>
                    Vendor:
                </strong>

                ${
                    record.vendor ||
                    "-"
                }

                <br>

                <strong>
                    Priority Level:
                </strong>

                <span
                    class="
                    status-badge
                    ${getPriorityClass(priority)}
                    ">

                    ${priority}

                </span>

            </div>

            <div class="archive-actions">

                <button
                    onclick="
                    openRecord(
                    '${record.recordType}',
                    ${record.id}
                    )
                    ">

                    Open

                </button>

                <button
                    onclick="
                    viewArchiveRecord(
                    '${record.recordType}',
                    ${record.id}
                    )
                    ">

                    View

                </button>

                <button
                    onclick="
                    editRecord(
                    '${record.recordType}',
                    ${record.id}
                    )
                    ">

                    Edit

                </button>

                <button
                    onclick="
                    regeneratePDF(
                    '${record.recordType}',
                    ${record.id}
                    )
                    ">

                    Generate PDF

                </button>

                <button
                    class='delete-btn'
                    onclick="
                    deleteArchiveRecord(
                    '${record.recordType}',
                    ${record.id}
                    )
                    ">

                    Delete

                </button>

            </div>

        `;

        container.appendChild(
            item
        );

    });

}

/* =========================================
   RENDER SAVED WORK TABLE
========================================= */

function getDocumentTypeLabelFromKind(kind){

    switch(kind){

        case "ownerApproval":
            return "Owner Approval Request";

        case "quoteRequest":
            return "Quote Request";

        case "verification":
            return "Work Order Verification";

        default:
            return "Work Order Authorization";

    }

}

function getSavedDocumentRows(){

    const rows = [];

    archiveRecords.forEach(record => {

        if(record.recordType === "Work Order"){

            ["workOrder", "quoteRequest"]
                .forEach(kind => {
                    rows.push({
                        record,
                        kind,
                        documentType:
                            getDocumentTypeLabelFromKind(kind)
                    });
                });

            return;

        }

        rows.push({
            record,
            kind: "verification",
            documentType:
                getDocumentTypeLabelFromKind("verification")
        });

    });

    return rows;

}

function formatSavedDate(
    value
){

    if(!value)
        return "-";

    const date =
        new Date(
            value
        );

    if(
        Number.isNaN(
            date.getTime()
        )
    ){
        return "-";
    }

    return date.toLocaleDateString();

}

function getFilteredSavedRecords(){

    const searchInput =
        document.getElementById(
            "savedWorkSearch"
        );

    const searchTerm =
        (
            searchInput
            ? searchInput.value
            : ""
        )
        .toLowerCase();

    return getSavedDocumentRows()
        .filter(item => {

            if(
                savedWorkKindFilter !== "all" &&
                item.kind !== savedWorkKindFilter
            ){
                return false;
            }

            const record =
                item.record;

            const searchable =
                [
                    item.documentType,
                    record.recordType,
                    record.workOrderNumber,
                    record.address,
                    record.vendor,
                    record.priority
                ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(
                searchTerm
            );

        })
        .sort(
            (a,b) =>
                new Date(
                    b.record.createdDate || 0
                ) -
                new Date(
                    a.record.createdDate || 0
                )
        );

}

function renderSavedWork(){

    const tbody =
        document.getElementById(
            "savedWorkBody"
        );

    if(!tbody)
        return;

    tbody.innerHTML = "";

    const records =
        getFilteredSavedRecords();

    if(!records.length){

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No saved work found.
                </td>
            </tr>
        `;

        return;

    }

    records.forEach(item => {

        const record =
            item.record;

        const row =
            document.createElement(
                "tr"
            );

        row.className =
            "saved-work-row";

        row.addEventListener(
            "click",
            () => {
                openSavedWorkDetails(
                    record.recordType,
                    record.id,
                    item.kind
                );
            }
        );

        const priority =
            record.priority ||
            (
                record.recordType === "Verification"
                ? "Verification"
                : "Routine"
            );

        row.innerHTML = `

            <td>
                ${item.documentType}
            </td>

            <td>
                ${record.workOrderNumber || "-"}
            </td>

            <td>
                ${record.address || "-"}
            </td>

            <td>
                ${record.vendor || "-"}
            </td>

            <td>
                <span
                    class="
                    status-badge
                    ${getPriorityClass(priority)}
                    ">

                    ${priority}

                </span>
            </td>

            <td>
                ${formatSavedDate(record.createdDate)}
            </td>

            <td>
                <div class="saved-work-actions">

                    <button
                        type="button"
                        data-action="details">

                        Open

                    </button>

                    <button
                        type="button"
                        data-action="preview">

                        View

                    </button>

                    <button
                        type="button"
                        data-action="pdf">

                        PDF

                    </button>

                    <button
                        type="button"
                        class="delete-btn"
                        data-action="delete">

                        Delete

                    </button>

                </div>
            </td>

        `;

        tbody.appendChild(
            row
        );

        row
            .querySelector(
                '[data-action="details"]'
            )
            .addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                    openSavedWorkDetails(
                        record.recordType,
                        record.id,
                        item.kind
                    );
                }
            );

        row
            .querySelector(
                '[data-action="preview"]'
            )
            .addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                    viewArchiveRecord(
                        record.recordType,
                        record.id,
                        item.kind
                    );
                }
            );

        row
            .querySelector(
                '[data-action="pdf"]'
            )
            .addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                    generateSavedDocumentPDF(
                        record.recordType,
                        record.id,
                        item.kind
                    );
                }
            );

        row
            .querySelector(
                '[data-action="delete"]'
            )
            .addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                    deleteArchiveRecord(
                        record.recordType,
                        record.id
                    );
                }
            );

    });

}

/* =========================================
   PRIORITY BADGES
========================================= */

function getPriorityClass(
    priority
){

    switch(
        priority.toLowerCase()
    ){

        case "routine":
    return "priority-routine";

        case "low":
    return "priority-low";

        case "medium":
    return "priority-medium";

        case "high":
    return "priority-high";

        case "emergency":
    return "priority-emergency";

        default:
    return "priority-routine";

    }

}

/* =========================================
   ARCHIVE PREVIEW MODAL
========================================= */

function createArchivePreviewModal(){

    if(
        document.getElementById(
            "archivePreviewModal"
        )
    ){
        return;
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "archivePreviewModal";

    modal.className =
        "document-preview-modal";

    modal.innerHTML = `

        <div class="document-preview-panel">

            <div class="document-preview-header">

                <strong id="archivePreviewTitle">
                    Document Preview
                </strong>

                <button
                    type="button"
                    id="closeArchivePreviewBtn">

                    Close

                </button>

            </div>

            <div
                id="archivePreviewOptions"
                class="document-preview-options">

            </div>

            <iframe
                id="archivePreviewFrame"
                title="Saved document preview">

            </iframe>

            <div class="document-preview-footer">

                <button
                    type="button"
                    id="archivePreviewGenerateBtn">

                    Generate This PDF

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeArchivePreviewBtn"
        )
        .addEventListener(
            "click",
            closeArchivePreview
        );

    document
        .getElementById(
            "archivePreviewGenerateBtn"
        )
        .addEventListener(
            "click",
            downloadArchivePreview
        );

    createSavedWorkDetailsModal();

}

function createSavedWorkDetailsModal(){

    if(
        document.getElementById(
            "savedWorkDetailsModal"
        )
    ){
        return;
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "savedWorkDetailsModal";

    modal.className =
        "document-preview-modal";

    modal.innerHTML = `

        <div class="document-preview-panel saved-details-panel">

            <div class="document-preview-header">

                <strong id="savedWorkDetailsTitle">
                    Saved Work Details
                </strong>

                <button
                    type="button"
                    id="closeSavedWorkDetailsBtn">

                    Close

                </button>

            </div>

            <div
                id="savedWorkDetailsBody"
                class="saved-details-body">

            </div>

            <div class="document-preview-footer">

                <button
                    type="button"
                    id="savedWorkPreviewPdfBtn">

                    View Document

                </button>

                <button
                    type="button"
                    id="savedWorkEditBtn">

                    Edit

                </button>

                <button
                    type="button"
                    class="delete-btn"
                    id="savedWorkDeleteBtn">

                    Delete

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeSavedWorkDetailsBtn"
        )
        .addEventListener(
            "click",
            closeSavedWorkDetails
        );

    createSavedWorkEditorModal();

}

function createSavedWorkEditorModal(){

    if(
        document.getElementById(
            "savedWorkEditorModal"
        )
    ){
        return;
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "savedWorkEditorModal";

    modal.className =
        "document-preview-modal";

    modal.innerHTML = `

        <div class="document-preview-panel saved-details-panel">

            <div class="document-preview-header">

                <strong id="savedWorkEditorTitle">
                    Edit Saved Work
                </strong>

                <button
                    type="button"
                    id="closeSavedWorkEditorBtn">

                    Close

                </button>

            </div>

            <div
                id="savedWorkEditorBody"
                class="saved-details-body">

            </div>

            <div class="document-preview-footer">

                <button
                    type="button"
                    id="saveSavedWorkEditBtn">

                    Save Changes

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeSavedWorkEditorBtn"
        )
        .addEventListener(
            "click",
            closeSavedWorkEditor
        );

}

function closeArchivePreview(){

    const modal =
        document.getElementById(
            "archivePreviewModal"
        );

    if(modal){
        modal.classList.remove(
            "active"
        );
    }

    if(archivePreviewUrl){
        URL.revokeObjectURL(
            archivePreviewUrl
        );

        archivePreviewUrl = null;
    }

}

function closeSavedWorkDetails(){

    const modal =
        document.getElementById(
            "savedWorkDetailsModal"
        );

    if(modal){
        modal.classList.remove(
            "active"
        );
    }

}

function closeSavedWorkEditor(){

    const modal =
        document.getElementById(
            "savedWorkEditorModal"
        );

    if(modal){
        modal.classList.remove(
            "active"
        );
    }

}

async function openSavedWorkEditor(
    type,
    id,
    kind
){

    try{

        const payload =
            await getArchivePayload(
                type,
                id
            );

        const record =
            type === "Work Order"
            ? payload.workOrder
            : payload.verification;

        document.getElementById(
            "savedWorkEditorTitle"
        ).textContent =
            `Edit ${getDocumentTypeLabelFromKind(kind)}`;

        document.getElementById(
            "savedWorkEditorBody"
        ).innerHTML =
            buildSavedWorkEditorHTML(
                type,
                record
            );

        initializeSavedWorkEditorPhotos(
            type,
            record
        );

        document.getElementById(
            "saveSavedWorkEditBtn"
        ).onclick =
            async () => {

                await saveSavedWorkEditor(
                    type,
                    record
                );

            };

        document
            .getElementById(
                "savedWorkEditorModal"
            )
            .classList.add(
                "active"
            );

    }
    catch(error){

        console.error(error);

        alert(
            "Unable to open editor."
        );

    }

}

function htmlSafe(value){

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}

function buildEditInput(label, field, value, type = "text"){

    return `
        <label>
            ${label}
            <input
                type="${type}"
                data-edit-field="${field}"
                value="${htmlSafe(value)}">
        </label>
    `;

}

function buildEditTextarea(label, field, value){

    return `
        <label class="saved-editor-wide">
            ${label}
            <textarea
                data-edit-field="${field}">${htmlSafe(value)}</textarea>
        </label>
    `;

}

function buildSavedWorkEditorHTML(
    type,
    record
){

    if(type === "Verification"){

        return `
            <div class="saved-editor-grid">
                ${buildEditInput("Work Order #", "workOrderNumber", record.workOrderNumber)}
                ${buildEditInput("Address", "address", record.address)}
                ${buildEditInput("Unit", "unit", record.unit)}
                ${buildEditInput("Vendor", "vendor", record.vendor)}
                ${buildEditTextarea("Work Completed", "completedWork", record.completedWork)}
                ${buildEditTextarea("Vendor Remarks", "vendorRemarks", record.vendorRemarks)}
                ${buildEditTextarea("Property Management Remarks", "pmRemarks", record.pmRemarks)}
            </div>
            <div class="saved-editor-photo-section">
                <div class="saved-editor-photo-header">
                    <strong>Photo Verification</strong>
                    <button
                        type="button"
                        id="savedEditorAddPhotoSetBtn">
                        Add Photo Set
                    </button>
                </div>
                <div id="savedEditorPhotoSets"></div>
            </div>
        `;

    }

    return `
        <div class="saved-editor-grid">
            ${buildEditInput("Work Order #", "workOrderNumber", record.workOrderNumber)}
            ${buildEditInput("Date", "workOrderDate", record.workOrderDate, "date")}
            ${buildEditInput("Address", "address", record.address)}
            ${buildEditInput("Unit", "unit", record.unit)}
            ${buildEditInput("Owner", "owner", record.owner)}
            ${buildEditInput("Manager", "manager", record.manager)}
            ${buildEditInput("Vendor", "vendor", record.vendor)}
            ${buildEditInput("Priority", "priority", record.priority)}
            ${buildEditTextarea("Issue Reported", "issue", record.issue)}
            ${buildEditTextarea("Scope of Work", "scope", record.scope)}
            ${buildEditTextarea("Owner Proposed Repair", "ownerProposedRepair", record.ownerProposedRepair)}
            ${buildEditTextarea("Remarks", "remarks", record.remarks)}
        </div>
        <div class="saved-editor-photo-section">
            <strong>Issue Photos</strong>
            <input
                type="file"
                id="savedEditorWorkOrderPhotos"
                multiple
                accept="image/*">
            <div
                id="savedEditorWorkOrderPhotoList"
                class="multi-photo-preview">
            </div>
        </div>
    `;

}

function initializeSavedWorkEditorPhotos(
    type,
    record
){

    if(type === "Verification"){

        const container =
            document.getElementById(
                "savedEditorPhotoSets"
            );

        const addButton =
            document.getElementById(
                "savedEditorAddPhotoSetBtn"
            );

        container.innerHTML = "";

        (
            record.photoPairs &&
            record.photoPairs.length
            ? record.photoPairs
            : [
                {
                    beforeImages: [],
                    afterImages: [],
                    issueObserved: "",
                    correctionPerformed: ""
                }
            ]
        ).forEach(pair => {
            addSavedEditorPhotoSet(
                pair
            );
        });

        addButton.addEventListener(
            "click",
            () => {
                addSavedEditorPhotoSet({
                    beforeImages: [],
                    afterImages: [],
                    issueObserved: "",
                    correctionPerformed: ""
                });
            }
        );

        return;

    }

    const list =
        document.getElementById(
            "savedEditorWorkOrderPhotoList"
        );

    const input =
        document.getElementById(
            "savedEditorWorkOrderPhotos"
        );

    renderEditorPhotoList(
        list,
        record.photos || [],
        "Issue"
    );

    input.addEventListener(
        "change",
        () => {
            appendFilesToEditorPhotoList(
                input.files,
                list,
                "Issue"
            );
        }
    );

}

function addSavedEditorPhotoSet(pair){

    const container =
        document.getElementById(
            "savedEditorPhotoSets"
        );

    const set =
        document.createElement(
            "div"
        );

    set.className =
        "saved-editor-photo-set";

    set.innerHTML = `
        <div class="saved-editor-photo-set-title">
            <strong>Photo Set</strong>
            <button
                type="button"
                class="delete-btn saved-editor-remove-set">
                Remove
            </button>
        </div>
        <div class="photo-grid">
            <div class="photo-box">
                <h4>Before Photos</h4>
                <input
                    type="file"
                    class="saved-editor-before-input"
                    multiple
                    accept="image/*">
                <div class="multi-photo-preview saved-editor-before-list"></div>
            </div>
            <div class="photo-box">
                <h4>After Photos</h4>
                <input
                    type="file"
                    class="saved-editor-after-input"
                    multiple
                    accept="image/*">
                <div class="multi-photo-preview saved-editor-after-list"></div>
            </div>
        </div>
        <label class="saved-editor-wide">
            Issue Observed
            <textarea class="saved-editor-issue">${htmlSafe(pair.issueObserved)}</textarea>
        </label>
        <label class="saved-editor-wide">
            Correction Performed
            <textarea class="saved-editor-correction">${htmlSafe(pair.correctionPerformed)}</textarea>
        </label>
    `;

    container.appendChild(
        set
    );

    const beforeList =
        set.querySelector(
            ".saved-editor-before-list"
        );

    const afterList =
        set.querySelector(
            ".saved-editor-after-list"
        );

    renderEditorPhotoList(
        beforeList,
        pair.beforeImages ||
        (
            pair.beforeImage
            ? [pair.beforeImage]
            : []
        ),
        "Before"
    );

    renderEditorPhotoList(
        afterList,
        pair.afterImages ||
        (
            pair.afterImage
            ? [pair.afterImage]
            : []
        ),
        "After"
    );

    set
        .querySelector(
            ".saved-editor-before-input"
        )
        .addEventListener(
            "change",
            event => {
                appendFilesToEditorPhotoList(
                    event.target.files,
                    beforeList,
                    "Before"
                );
            }
        );

    set
        .querySelector(
            ".saved-editor-after-input"
        )
        .addEventListener(
            "change",
            event => {
                appendFilesToEditorPhotoList(
                    event.target.files,
                    afterList,
                    "After"
                );
            }
        );

    set
        .querySelector(
            ".saved-editor-remove-set"
        )
        .addEventListener(
            "click",
            () => {
                set.remove();
            }
        );

}

function renderEditorPhotoList(
    list,
    photos,
    label
){

    const safePhotos =
        photos || [];

    list.dataset.photos =
        JSON.stringify(
            safePhotos
        );

    list.innerHTML = "";

    safePhotos.forEach((photo, index) => {

        const thumb =
            document.createElement(
                "figure"
            );

        thumb.className =
            "photo-thumb";

        thumb.innerHTML = `
            <button
                type="button"
                class="saved-editor-remove-photo">
                x
            </button>
            <img
                src="${photo}"
                alt="${label} photo ${index + 1}">
            <figcaption>
                ${label} Photo ${index + 1}
            </figcaption>
        `;

        thumb
            .querySelector(
                ".saved-editor-remove-photo"
            )
            .addEventListener(
                "click",
                () => {

                    const nextPhotos =
                        getEditorPhotoList(
                            list
                        );

                    nextPhotos.splice(
                        index,
                        1
                    );

                    renderEditorPhotoList(
                        list,
                        nextPhotos,
                        label
                    );

                }
            );

        list.appendChild(
            thumb
        );

    });

}

function appendFilesToEditorPhotoList(
    files,
    list,
    label
){

    const fileList =
        Array.from(
            files || []
        );

    if(!fileList.length)
        return;

    const photos =
        getEditorPhotoList(
            list
        );

    let complete = 0;

    fileList.forEach(file => {

        const reader =
            new FileReader();

        reader.onload =
            event => {

            photos.push(
                event.target.result
            );

            complete++;

            if(
                complete ===
                fileList.length
            ){
                renderEditorPhotoList(
                    list,
                    photos,
                    label
                );
            }

        };

        reader.readAsDataURL(
            file
        );

    });

}

function getEditorPhotoList(list){

    try{

        return JSON.parse(
            list.dataset.photos || "[]"
        );

    }
    catch(error){

        console.error(error);

        return [];

    }

}

async function saveSavedWorkEditor(
    type,
    record
){

    document
        .querySelectorAll(
            "#savedWorkEditorBody [data-edit-field]"
        )
        .forEach(field => {

            record[field.dataset.editField] =
                field.value.trim();

        });

    if(type === "Verification"){

        record.photoPairs =
            Array.from(
                document.querySelectorAll(
                    "#savedEditorPhotoSets .saved-editor-photo-set"
                )
            ).map(set => {

                const beforeImages =
                    getEditorPhotoList(
                        set.querySelector(
                            ".saved-editor-before-list"
                        )
                    );

                const afterImages =
                    getEditorPhotoList(
                        set.querySelector(
                            ".saved-editor-after-list"
                        )
                    );

                return {
                    beforeImages,
                    beforeImage:
                        beforeImages[0] || "",
                    afterImages,
                    afterImage:
                        afterImages[0] || "",
                    issueObserved:
                        set.querySelector(
                            ".saved-editor-issue"
                        ).value.trim(),
                    correctionPerformed:
                        set.querySelector(
                            ".saved-editor-correction"
                        ).value.trim()
                };

            });

    }
    else{

        record.photos =
            getEditorPhotoList(
                document.getElementById(
                    "savedEditorWorkOrderPhotoList"
                )
            );

    }

    record.updatedDate =
        new Date()
        .toISOString();

    await updateRecord(
        type === "Work Order"
        ? "workOrders"
        : "verifications",
        record
    );

    closeSavedWorkEditor();

    await loadArchive();

    alert(
        "Saved work updated."
    );

}

async function openSavedWorkDetails(
    type,
    id,
    kind
){

    try{

        const payload =
            await getArchivePayload(
                type,
                id
            );

        const record =
            type === "Work Order"
            ? payload.workOrder
            : payload.verification;

        const title =
            document.getElementById(
                "savedWorkDetailsTitle"
            );

        const body =
            document.getElementById(
                "savedWorkDetailsBody"
            );

        const editButton =
            document.getElementById(
                "savedWorkEditBtn"
            );

        const previewButton =
            document.getElementById(
                "savedWorkPreviewPdfBtn"
            );

        const deleteButton =
            document.getElementById(
                "savedWorkDeleteBtn"
            );

        title.textContent =
            getDocumentTypeLabelFromKind(
                kind
            );

        body.innerHTML =
            buildSavedWorkDetailsHTML(
                record,
                kind
            );

        editButton.onclick =
            async () => {

                closeSavedWorkDetails();

                await openSavedWorkEditor(
                    type,
                    id,
                    kind
                );

            };

        previewButton.onclick =
            () => {

                closeSavedWorkDetails();

                viewArchiveRecord(
                    type,
                    id,
                    kind
                );

            };

        deleteButton.onclick =
            async () => {

                closeSavedWorkDetails();

                await deleteArchiveRecord(
                    type,
                    id
                );

            };

        document
            .getElementById(
                "savedWorkDetailsModal"
            )
            .classList.add(
                "active"
            );

    }
    catch(error){

        console.error(error);

        alert(
            "Unable to open saved work details."
        );

    }

}

function detailValue(value){

    return value || "-";

}

function buildDetailRow(label, value){

    return `
        <div class="saved-detail-row">
            <div class="saved-detail-label">
                ${label}
            </div>
            <div class="saved-detail-value">
                ${detailValue(value)}
            </div>
        </div>
    `;

}

function buildSavedWorkDetailsHTML(
    record,
    kind
){

    if(kind === "verification"){

        return `
            <div class="saved-detail-grid">
                ${buildDetailRow("Document Type", "Work Order Verification")}
                ${buildDetailRow("Work Order #", record.workOrderNumber)}
                ${buildDetailRow("Address", record.address)}
                ${buildDetailRow("Unit", record.unit)}
                ${buildDetailRow("Vendor", record.vendor)}
                ${buildDetailRow("Saved Date", formatSavedDate(record.createdDate))}
                ${buildDetailRow("Vendor Verified", record.vendorVerified ? "Yes" : "No")}
                ${buildDetailRow("Tenant Verified", record.tenantVerified ? "Yes" : "No")}
            </div>

            <div class="saved-detail-section">
                <strong>Work Completed</strong>
                <p>${detailValue(record.completedWork)}</p>
            </div>

            <div class="saved-detail-section">
                <strong>Vendor Remarks</strong>
                <p>${detailValue(record.vendorRemarks)}</p>
            </div>

            <div class="saved-detail-section">
                <strong>Property Management Remarks</strong>
                <p>${detailValue(record.pmRemarks)}</p>
            </div>
        `;

    }

    return `
        <div class="saved-detail-grid">
            ${buildDetailRow("Document Type", getDocumentTypeLabelFromKind(kind))}
            ${buildDetailRow("Work Order #", record.workOrderNumber)}
            ${buildDetailRow("Date", formatSavedDate(record.workOrderDate || record.createdDate))}
            ${buildDetailRow("Address", record.address)}
            ${buildDetailRow("Unit", record.unit)}
            ${buildDetailRow("Owner", record.owner)}
            ${buildDetailRow("Manager", record.manager)}
            ${buildDetailRow("Vendor", record.vendor)}
            ${buildDetailRow("Priority", record.priority)}
            ${buildDetailRow("Estimate Total", record.total ? "$" + money(record.total) : "-")}
        </div>

        <div class="saved-detail-section">
            <strong>Issue Reported</strong>
            <p>${detailValue(record.issue)}</p>
        </div>

        <div class="saved-detail-section">
            <strong>Scope / Proposed Repair</strong>
            <p>${detailValue(record.ownerProposedRepair || record.scope)}</p>
        </div>

        <div class="saved-detail-section">
            <strong>Remarks</strong>
            <p>${detailValue(record.remarks)}</p>
        </div>
    `;

}

async function generateSavedDocumentPDF(
    type,
    id,
    kind
){

    const payload =
        await getArchivePayload(
            type,
            id
        );

    const pdf =
        getDocumentPDF(
            kind,
            payload
        );

    pdf.save(
        getDocumentFileName(
            kind,
            payload
        )
    );

}

function getArchiveDocumentOptions(
    type
){

    if(
        type ===
        "Work Order"
    ){

        return [
            {
                kind: "workOrder",
                label: "Work Order"
            },
            {
                kind: "quoteRequest",
                label: "Quote Request"
            }
        ];

    }

    return [
        {
            kind: "verification",
            label: "Verification"
        }
    ];

}

async function getArchivePayload(
    type,
    id
){

    const company =
        await getCompanyProfile();

    if(
        type ===
        "Work Order"
    ){

        return {
            company,
            workOrder:
                await getRecord(
                    "workOrders",
                    id
                )
        };

    }

    return {
        company,
        verification:
            await getRecord(
                "verifications",
                id
            )
    };

}

async function viewArchiveRecord(
    type,
    id,
    kind
){

    try{

        const options =
            getArchiveDocumentOptions(
                type
            );

        const selectedKind =
            kind ||
            options[0].kind;

        const payload =
            await getArchivePayload(
                type,
                id
            );

        archivePreviewContext = {
            type,
            id,
            kind:
                selectedKind,
            payload
        };

        renderArchivePreviewOptions(
            options,
            selectedKind,
            type,
            id
        );

        await renderArchivePreview(
            selectedKind,
            payload
        );

        document
            .getElementById(
                "archivePreviewModal"
            )
            .classList.add(
                "active"
            );

    }
    catch(error){

        console.error(error);

        alert(
            "Unable to preview this document."
        );

    }

}

function renderArchivePreviewOptions(
    options,
    selectedKind,
    type,
    id
){

    const container =
        document.getElementById(
            "archivePreviewOptions"
        );

    if(!container)
        return;

    container.innerHTML = "";

    options.forEach(option => {

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.textContent =
            option.label;

        button.className =
            option.kind === selectedKind
            ? "active"
            : "";

        button.addEventListener(
            "click",
            () => {
                viewArchiveRecord(
                    type,
                    id,
                    option.kind
                );
            }
        );

        container.appendChild(
            button
        );

    });

}

async function renderArchivePreview(
    kind,
    payload
){

    const frame =
        document.getElementById(
            "archivePreviewFrame"
        );

    const title =
        document.getElementById(
            "archivePreviewTitle"
        );

    if(archivePreviewUrl){
        URL.revokeObjectURL(
            archivePreviewUrl
        );
    }

    const pdf =
        getDocumentPDF(
            kind,
            payload
        );

    archivePreviewUrl =
        pdf.output(
            "bloburl"
        );

    frame.src =
        archivePreviewUrl;

    title.textContent =
        getArchivePreviewTitle(
            kind
        );

}

function getArchivePreviewTitle(
    kind
){

    switch(kind){

        case "ownerApproval":
            return "Owner Approval Request";

        case "quoteRequest":
            return "Quote Request";

        case "verification":
            return "Work Verification";

        default:
            return "Work Order Authorization";

    }

}

async function downloadArchivePreview(){

    if(!archivePreviewContext)
        return;

    const pdf =
        getDocumentPDF(
            archivePreviewContext.kind,
            archivePreviewContext.payload
        );

    pdf.save(
        getDocumentFileName(
            archivePreviewContext.kind,
            archivePreviewContext.payload
        )
    );

}

/* =========================================
   OPEN RECORD
========================================= */

async function openRecord(
    type,
    id
){

    if(
        type ===
        "Work Order"
    ){

        if(!showPage(
            "workorder"
        )){
            return;
        }

        await loadWorkOrder(
            id
        );

    }
    else{

        if(!showPage(
            "verification"
        )){
            return;
        }

        await loadVerification(
            id
        );

    }

}

/* =========================================
   EDIT RECORD
========================================= */

async function editRecord(
    type,
    id
){

    await openRecord(
        type,
        id
    );

}

/* =========================================
   DELETE
========================================= */

async function deleteArchiveRecord(
    type,
    id
){

    const confirmed =
        confirm(
            "Delete this record?"
        );

    if(!confirmed)
        return;

    try{

        if(
            type ===
            "Work Order"
        ){

            await deleteRecord(
                "workOrders",
                id
            );

        }
        else{

            await deleteRecord(
                "verifications",
                id
            );

        }

        loadArchive();

    }
    catch(error){

        console.error(
            error
        );

        alert(
            "Delete failed."
        );

    }

}

/* =========================================
   PDF REGENERATION
========================================= */

async function regeneratePDF(
    type,
    id
){

    try{

        const kind =
            type === "Work Order"
            ? "workOrder"
            : "verification";

        const payload =
            await getArchivePayload(
                type,
                id
            );

        const pdf =
            getDocumentPDF(
                kind,
                payload
            );

        pdf.save(
            getDocumentFileName(
                kind,
                payload
            )
        );

    }
    catch(error){

        console.error(
            error
        );

    }

}

/* =========================================
   PROPERTY HISTORY
========================================= */

async function getPropertyHistoryArchive(
    address
){

    const workOrders =
        await getAllRecords(
            "workOrders"
        );

    return workOrders.filter(
        record =>

        (
            record.address || ""
        )
        .toLowerCase()
        ===
        address.toLowerCase()

    );

}

/* =========================================
   DEBOUNCE
========================================= */

function debounce(
    callback,
    delay
){

    let timeout;

    return function(){

        clearTimeout(
            timeout
        );

        timeout =
            setTimeout(
                callback,
                delay
            );

    };

}
