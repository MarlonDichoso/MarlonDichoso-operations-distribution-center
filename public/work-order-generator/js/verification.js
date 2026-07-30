/* =========================================
   VERIFICATION MODULE
========================================= */

let currentVerificationId = null;
let photoPairCounter = 0;

/* =========================================
   INITIALIZE MODULE
========================================= */

function initializeVerificationModule() {

    initializeVerificationEvents();

}

/* =========================================
   EVENTS
========================================= */

function initializeVerificationEvents() {

    const addPhotoBtn =
        document.getElementById(
            "addPhotoPairBtn"
        );

    if(addPhotoBtn){

        addPhotoBtn.addEventListener(
            "click",
            addPhotoPair
        );

    }

    const saveBtn =
        document.getElementById(
            "saveVerificationBtn"
        );

    if(saveBtn){

        saveBtn.addEventListener(
            "click",
            saveVerification
        );

    }

}

/* =========================================
   PHOTO PAIRS
========================================= */

function addPhotoPair(
    beforeImage = "",
    afterImage = "",
    issueObserved = "",
    correctionPerformed = ""
){

    photoPairCounter++;

    const container =
        document.getElementById(
            "photoPairsContainer"
        );

    const pair =
        document.createElement("div");

    pair.className = "photo-pair";

    const beforeImages =
        Array.isArray(beforeImage)
        ? beforeImage
        : (
            beforeImage
            ? [beforeImage]
            : []
        );

    const afterImages =
        Array.isArray(afterImage)
        ? afterImage
        : (
            afterImage
            ? [afterImage]
            : []
        );

    pair.innerHTML = `

        <div class="photo-pair-header">

            <span>
                Inspection Photo Set #${photoPairCounter}
            </span>

            <small>
                Before and after photos stay side by side in the report.
            </small>

        </div>

        <div class="photo-grid">

            <div class="photo-box">

                <h4>Before</h4>

                <input
                    type="file"
                    multiple
                    accept="image/*"
                    class="before-photo-input">

                <div class="multi-photo-preview before-preview-list">

                </div>

            </div>

            <div class="photo-box">

                <h4>After</h4>

                <input
                    type="file"
                    multiple
                    accept="image/*"
                    class="after-photo-input">

                <div class="multi-photo-preview after-preview-list">

                </div>

            </div>

        </div>

        <div style="margin-top:15px;">

            <label>
                Issue Observed
            </label>

            <textarea
                class="issue-observed">${issueObserved}</textarea>

        </div>

        <div style="margin-top:15px;">

            <label>
                Correction Performed
            </label>

            <textarea
                class="correction-performed">${correctionPerformed}</textarea>

        </div>

        <div style="margin-top:15px;">

            <button
                type="button"
                class="delete-photo-pair">

                Remove Photo Pair

            </button>

        </div>

    `;

    container.appendChild(pair);

    renderPhotoList(
        pair.querySelector(
            ".before-preview-list"
        ),
        beforeImages,
        "Before"
    );

    renderPhotoList(
        pair.querySelector(
            ".after-preview-list"
        ),
        afterImages,
        "After"
    );

    const beforeInput =
        pair.querySelector(
            ".before-photo-input"
        );

    const afterInput =
        pair.querySelector(
            ".after-photo-input"
        );

    beforeInput.addEventListener(
        "change",
        function(){

            previewPhotos(
                this,
                pair.querySelector(
                    ".before-preview-list"
                ),
                "Before"
            );

        }
    );

    afterInput.addEventListener(
        "change",
        function(){

            previewPhotos(
                this,
                pair.querySelector(
                    ".after-preview-list"
                ),
                "After"
            );

        }
    );

    pair.querySelector(
        ".delete-photo-pair"
    ).addEventListener(
        "click",
        () => {

            pair.remove();

        }
    );

}

function previewPhotos(
    input,
    listElement,
    label
){

    const files =
        Array.from(
            input.files || []
        );

    if(!files.length)
        return;

    const images = [];
    let completed = 0;

    files.forEach(file => {

        const reader =
            new FileReader();

        reader.onload =
            function(event){

            images.push(
                event.target.result
            );

            completed++;

            if(
                completed ===
                files.length
            ){

                renderPhotoList(
                    listElement,
                    images,
                    label
                );

            }

        };

        reader.readAsDataURL(file);

    });

}

function renderPhotoList(
    listElement,
    images,
    label
){

    listElement.innerHTML = "";

    listElement.dataset.photos =
        JSON.stringify(
            images || []
        );

    (images || []).forEach((src, index) => {

        const item =
            document.createElement(
                "figure"
            );

        item.className =
            "photo-thumb";

        item.innerHTML = `

            <img
                src="${src}"
                alt="${label} photo ${index + 1}">

            <button
                type="button"
                class="remove-uploaded-photo"
                aria-label="Remove ${label} photo ${index + 1}">

                Remove

            </button>

            <figcaption>
                ${label} Photo ${index + 1}
            </figcaption>

        `;

        listElement.appendChild(
            item
        );

        item
            .querySelector(
                ".remove-uploaded-photo"
            )
            .addEventListener(
                "click",
                () => {

                    const updatedImages =
                        readPhotoList(
                            listElement
                        );

                    updatedImages.splice(
                        index,
                        1
                    );

                    renderPhotoList(
                        listElement,
                        updatedImages,
                        label
                    );

                }
            );

    });

}

function readPhotoList(
    listElement
){

    try{

        return JSON.parse(
            listElement.dataset.photos || "[]"
        );

    }
    catch(error){

        console.error(error);

        return [];

    }

}

/* =========================================
   COLLECT PHOTO PAIRS
========================================= */

function getPhotoPairs(){

    const pairs = [];

    document
        .querySelectorAll(
            ".photo-pair"
        )
        .forEach(pair => {

            pairs.push({

                beforeImages:
                    readPhotoList(
                        pair.querySelector(
                            ".before-preview-list"
                        )
                    ),

                beforeImage:
                    readPhotoList(
                        pair.querySelector(
                            ".before-preview-list"
                        )
                    )[0] || "",

                afterImages:
                    readPhotoList(
                        pair.querySelector(
                            ".after-preview-list"
                        )
                    ),

                afterImage:
                    readPhotoList(
                        pair.querySelector(
                            ".after-preview-list"
                        )
                    )[0] || "",

                issueObserved:
                    pair.querySelector(
                        ".issue-observed"
                    ).value,

                correctionPerformed:
                    pair.querySelector(
                        ".correction-performed"
                    ).value

            });

        });

    return pairs;

}

/* =========================================
   VALIDATION
========================================= */

function validateVerification(){

    const wo =
        document.getElementById(
            "verifyWO"
        ).value.trim();

    const address =
        document.getElementById(
            "verifyAddress"
        ).value.trim();

    if(!wo){

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

function getVerificationData(){

    return {

        id:
            currentVerificationId,

        workOrderNumber:
            document.getElementById(
                "verifyWO"
            ).value.trim(),

        address:
            document.getElementById(
                "verifyAddress"
            ).value.trim(),

        unit:
            document.getElementById(
                "verifyUnit"
            ).value.trim(),

        vendor:
            document.getElementById(
                "verifyVendor"
            ).value.trim(),

        completedWork:
            document.getElementById(
                "verifyCompleted"
            ).value.trim(),

        vendorRemarks:
            document.getElementById(
                "vendorRemarks"
            ).value.trim(),

        pmRemarks:
            document.getElementById(
                "pmRemarks"
            ).value.trim(),

        vendorVerified:
            document.getElementById(
                "vendorVerified"
            ).checked,

        tenantVerified:
            document.getElementById(
                "tenantVerified"
            ).checked,

        photoPairs:
            getPhotoPairs(),

        createdDate:
            new Date().toISOString()

    };

}

/* =========================================
   SAVE VERIFICATION
========================================= */

async function saveVerification(){

    if(
        !validateVerification()
    ){
        return;
    }

    try{

        const data =
            getVerificationData();

        if(
            currentVerificationId
        ){

            await updateRecord(
                "verifications",
                data
            );

            alert(
                "Verification Updated."
            );

        }
        else{

            delete data.id;

            const id =
                await saveRecord(
                    "verifications",
                    data
                );

            currentVerificationId =
                id;

            alert(
                "Verification Saved."
            );

        }

        if(
            typeof loadArchive
            === "function"
        ){

            loadArchive();

        }

    }
    catch(error){

        console.error(
            error
        );

        alert(
            "Failed to save Verification."
        );

    }

}

/* =========================================
   LOAD VERIFICATION
========================================= */

async function loadVerification(
    id
){

    try{

        const record =
            await getRecord(
                "verifications",
                id
            );

        if(!record)
            return;

        currentVerificationId =
            record.id;

        document.getElementById(
            "verifyWO"
        ).value =
            record.workOrderNumber || "";

        document.getElementById(
            "verifyAddress"
        ).value =
            record.address || "";

        document.getElementById(
            "verifyUnit"
        ).value =
            record.unit || "";

        document.getElementById(
            "verifyVendor"
        ).value =
            record.vendor || "";

        document.getElementById(
            "verifyCompleted"
        ).value =
            record.completedWork || "";

        document.getElementById(
            "vendorRemarks"
        ).value =
            record.vendorRemarks || "";

        document.getElementById(
            "pmRemarks"
        ).value =
            record.pmRemarks || "";

        document.getElementById(
            "vendorVerified"
        ).checked =
            record.vendorVerified || false;

        document.getElementById(
            "tenantVerified"
        ).checked =
            record.tenantVerified || false;

        const container =
            document.getElementById(
                "photoPairsContainer"
            );

        container.innerHTML = "";

        photoPairCounter = 0;

        (
            record.photoPairs || []
        ).forEach(pair => {

            addPhotoPair(
                pair.beforeImages ||
                pair.beforeImage,
                pair.afterImages ||
                pair.afterImage,
                pair.issueObserved,
                pair.correctionPerformed
            );

        });

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

function clearVerificationForm(){

    currentVerificationId =
        null;

    photoPairCounter = 0;

    document
        .querySelectorAll(
            "#verification-page input"
        )
        .forEach(input => {

            if(
                input.type ===
                "checkbox"
            ){

                input.checked =
                    false;

            }
            else{

                input.value = "";

            }

        });

    document
        .querySelectorAll(
            "#verification-page textarea"
        )
        .forEach(textarea => {

            textarea.value = "";

        });

    document.getElementById(
        "photoPairsContainer"
    ).innerHTML = "";

}

/* =========================================
   PDF PAYLOAD
========================================= */

async function getVerificationPDFData(){

    const company =
        await getCompanyProfile();

    return {

        company,

        verification:
            getVerificationData()

    };

}
