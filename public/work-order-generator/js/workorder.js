/* =========================================
   WORK ORDER MODULE
========================================= */

let currentWorkOrderId = null;

/* =========================================
   INITIALIZE MODULE
========================================= */

function initializeWorkOrderModule() {

    initializeEstimateTable();

    initializeWorkOrderEvents();

    initializeWorkOrderPhotos();

}

/* =========================================
   EVENTS
========================================= */

function initializeWorkOrderEvents() {

    const addBtn =
        document.getElementById(
            "addEstimateBtn"
        );

    if(addBtn){

        addBtn.addEventListener(
            "click",
            addEstimateRow
        );

    }

    const saveBtn =
        document.getElementById(
            "saveWorkOrderBtn"
        );

    if(saveBtn){

        saveBtn.addEventListener(
            "click",
            saveWorkOrder
        );

    }

}

/* =========================================
   ESTIMATE TABLE
========================================= */

function initializeEstimateTable() {

    if(
        document.getElementById(
            "estimateBody"
        )
        .children.length === 0
    ){

        addEstimateRow();

    }

}

function addEstimateRow(
    description = "",
    category = "",
    amount = ""
) {

    const tbody =
        document.getElementById(
            "estimateBody"
        );

    const row =
        document.createElement(
            "tr"
        );

    row.innerHTML = `

        <td>
            <input
                type="text"
                class="estimate-description"
                value="${description}">
        </td>

        <td>
            <input
                type="text"
                class="estimate-category"
                value="${category}">
        </td>

        <td>
            <input
                type="number"
                class="estimate-amount"
                min="0"
                step="0.01"
                value="${amount}">
        </td>

        <td>

            <button
                type="button"
                class="delete-estimate-btn">

                Remove

            </button>

        </td>

    `;

    tbody.appendChild(row);

    const amountInput =
        row.querySelector(
            ".estimate-amount"
        );

    amountInput.addEventListener(
        "input",
        calculateEstimateTotal
    );

    row.querySelector(
        ".delete-estimate-btn"
    ).addEventListener(
        "click",
        () => {

            row.remove();

            calculateEstimateTotal();

        }
    );

    calculateEstimateTotal();

}

function calculateEstimateTotal() {

    let total = 0;

    document
        .querySelectorAll(
            ".estimate-amount"
        )
        .forEach(input => {

            total +=
                Number(
                    input.value
                ) || 0;

        });

    document.getElementById(
        "estimateTotal"
    ).textContent =
        total.toFixed(2);

}

/* =========================================
   COLLECT ESTIMATE ITEMS
========================================= */

function getEstimateItems() {

    const items = [];

    document
        .querySelectorAll(
            "#estimateBody tr"
        )
        .forEach(row => {

            const description =
                row.querySelector(
                    ".estimate-description"
                ).value;

            const category =
                row.querySelector(
                    ".estimate-category"
                ).value;

            const amount =
                Number(
                    row.querySelector(
                        ".estimate-amount"
                    ).value
                ) || 0;

            items.push({

                description,
                category,
                amount

            });

        });

    return items;

}

/* =========================================
   VALIDATION
========================================= */

function validateWorkOrder() {

    const woNumber =
        document.getElementById(
            "woNumber"
        ).value.trim();

    const address =
        document.getElementById(
            "woAddress"
        ).value.trim();

    if(!woNumber){

        alert(
            "Work Order Number is required."
        );

        return false;
    }

    if(!address){

        alert(
            "Property Address is required."
        );

        return false;
    }

    return true;

}

/* =========================================
   FORM DATA
========================================= */

function getWorkOrderData() {

    return {

        id:
            currentWorkOrderId,

        workOrderNumber:
            document.getElementById(
                "woNumber"
            ).value.trim(),

        workOrderDate:
            document.getElementById(
                "woDate"
            ).value,

        address:
            document.getElementById(
                "woAddress"
            ).value.trim(),

        unit:
            document.getElementById(
                "woUnit"
            ).value.trim(),

        owner:
            document.getElementById(
                "woOwner"
            ).value.trim(),

        manager:
            document.getElementById(
                "woManager"
            ).value.trim(),

        vendor:
            document.getElementById(
                "woVendor"
            ).value.trim(),

        technician:
            document.getElementById(
                "woTechnician"
            ).value.trim(),

        phone:
            document.getElementById(
                "woPhone"
            ).value.trim(),

        email:
            document.getElementById(
                "woEmail"
            ).value.trim(),

        issue:
            document.getElementById(
                "woIssue"
            ).value.trim(),

        scope:
            document.getElementById(
                "woScope"
            ).value.trim(),

        priority:
            document.getElementById(
                "woPriority"
            ).value,
        remarks:
            document.getElementById(
                "woRemarks"
            ).value.trim(),
        
        ownerApprovalName:
            document.getElementById(
                "ownerApprovalName"
            ).value.trim(),

        ownerProposedRepair:
            document.getElementById(
                "ownerProposedRepair"
            ).value.trim(),

        estimateItems:
            getEstimateItems(),

        total:
            Number(
                document.getElementById(
                    "estimateTotal"
                ).textContent
            ),

        photos:
            Array.from(
                document.querySelectorAll(
                    "#woPhotoContainer img.preview-image"
                )
            ).map(
                img => img.src
            ),

        createdDate:
            new Date().toISOString()

    };

}


/* =========================================
   SAVE WORK ORDER
========================================= */

async function saveWorkOrder() {

    if(
        !validateWorkOrder()
    ){
        return;
    }

    try {

        const data =
            getWorkOrderData();

        if(
            currentWorkOrderId
        ){

            await updateRecord(
                "workOrders",
                data
            );

            alert(
                "Work Order Updated."
            );

        }
        else{

            delete data.id;

            const newId =
                await saveRecord(
                    "workOrders",
                    data
                );

            currentWorkOrderId =
                newId;

            alert(
                "Work Order Saved."
            );

        }

        if(
            typeof loadArchive ===
            "function"
        ){

            loadArchive();

        }

    }
    catch(error){

        console.error(
            error
        );

        alert(
            "Failed to save Work Order."
        );

    }

}

/* =========================================
   LOAD WORK ORDER
========================================= */

async function loadWorkOrder(id) {

    try {

        const record =
            await getRecord(
                "workOrders",
                id
            );

        if(!record)
            return;

        currentWorkOrderId =
            record.id;

        document.getElementById(
            "woNumber"
        ).value =
            record.workOrderNumber || "";

        document.getElementById(
            "woDate"
        ).value =
            record.workOrderDate || "";

        document.getElementById(
            "woAddress"
        ).value =
            record.address || "";

        document.getElementById(
            "woUnit"
        ).value =
            record.unit || "";

        document.getElementById(
            "woOwner"
        ).value =
            record.owner || "";

        document.getElementById(
            "woManager"
        ).value =
            record.manager || "";

        document.getElementById(
            "woVendor"
        ).value =
            record.vendor || "";

        document.getElementById(
            "woTechnician"
        ).value =
            record.technician || "";

        document.getElementById(
            "woPhone"
        ).value =
            record.phone || "";

        document.getElementById(
            "woEmail"
        ).value =
            record.email || "";

        document.getElementById(
            "woIssue"
        ).value =
            record.issue || "";

        document.getElementById(
            "woScope"
        ).value =
            record.scope || "";

        document.getElementById(
            "woPriority"
        ).value =
            record.priority || "Routine";

        document.getElementById(
            "woRemarks"
        ).value =
            record.remarks || "";

        document.getElementById(
            "ownerApprovalName"
        ).value =
            record.ownerApprovalName || "";

        document.getElementById(
            "ownerProposedRepair"
        ).value =
            record.ownerProposedRepair || "";

        document.getElementById(
            "estimateBody"
        ).innerHTML = "";

        if(
            record.estimateItems &&
            record.estimateItems.length
        ){

            record.estimateItems.forEach(
                item => {

                    addEstimateRow(
                        item.description,
                        item.category,
                        item.amount
                    );

                }
            );

        }

        calculateEstimateTotal();

    }
    catch(error){

        console.error(
            error
        );

    }

}

/* =========================================
   CLEAR FORM
========================================= */

function clearWorkOrderForm() {

    currentWorkOrderId = null;

    document
        .querySelectorAll(
            "#workorder-page input"
        )
        .forEach(input => {

            input.value = "";

        });

    const photoContainer =
        document.getElementById(
            "woPhotoContainer"
        );

    if(photoContainer){

        photoContainer.innerHTML = "";

    }

    document
        .querySelectorAll(
            "#workorder-page textarea"
        )
        .forEach(textarea => {

            textarea.value = "";

        });

    document.getElementById(
        "woPriority"
    ).value = "Routine";

    document.getElementById(
        "estimateBody"
    ).innerHTML = "";

    addEstimateRow();

    calculateEstimateTotal();

}

/* =========================================
   PROPERTY HISTORY
========================================= */

async function getPropertyHistory(
    address
) {

    const records =
        await getAllRecords(
            "workOrders"
        );

    return records.filter(
        item =>

        (item.address || "")
        .toLowerCase()
        === address.toLowerCase()

    );

}

/* =========================================
   PDF PAYLOAD
========================================= */

async function getWorkOrderPDFData() {

    const company =
        await getCompanyProfile();

    return {

        company,

        workOrder:
            getWorkOrderData()

    };

}

/* =========================================
   PHOTO PREVIEW
========================================= */

function initializeWorkOrderPhotos(){

    const input =
        document.getElementById(
            "woPhotos"
        );

    if(!input)
        return;

    input.addEventListener(
        "change",
        function(){

            const container =
                document.getElementById(
                    "woPhotoContainer"
                );

            Array.from(
                this.files
            ).forEach(file => {

                const reader =
                    new FileReader();

                reader.onload =
                    function(event){

                    const item =
                        document.createElement(
                            "figure"
                        );

                    item.className =
                        "photo-thumb workorder-photo-thumb";

                    const img =
                        document.createElement(
                            "img"
                        );

                    img.src =
                        event.target.result;

                    img.className =
                        "preview-image";

                    const removeButton =
                        document.createElement(
                            "button"
                        );

                    removeButton.type =
                        "button";

                    removeButton.className =
                        "remove-uploaded-photo";

                    removeButton.textContent =
                        "Remove";

                    removeButton.setAttribute(
                        "aria-label",
                        "Remove uploaded issue photo"
                    );

                    removeButton.addEventListener(
                        "click",
                        () => {

                            item.remove();

                        }
                    );

                    item.appendChild(
                        img
                    );

                    item.appendChild(
                        removeButton
                    );

                    container.appendChild(
                        item
                    );

                };

                reader.readAsDataURL(
                    file
                );

            });

        }
    );

}
