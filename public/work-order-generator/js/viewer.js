/* =========================================
   DOCUMENT VIEWER MODULE
========================================= */

let selectedViewerDocument = "workOrder";
let currentPreviewUrl = null;

const viewerDocumentTitles = {
    workOrder: "Work Order Authorization",
    ownerApproval: "Owner Approval Request",
    quoteRequest: "Quote Request",
    verification: "Work Verification"
};

function initializeDocumentViewer(){
    document
        .querySelectorAll(".viewer-preview-btn")
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    selectedViewerDocument =
                        button.dataset.document;

                    document
                        .querySelectorAll(".viewer-preview-btn")
                        .forEach(item => {
                            item.classList.remove("active");
                        });

                    button.classList.add("active");

                    await refreshDocumentViewer();
                }
            );
        });

    const refreshButton =
        document.getElementById(
            "refreshViewerBtn"
        );

    if(refreshButton){
        refreshButton.addEventListener(
            "click",
            refreshDocumentViewer
        );
    }

    const generateButton =
        document.getElementById(
            "viewerGenerateBtn"
        );

    if(generateButton){
        generateButton.addEventListener(
            "click",
            async () => {
                await saveDocumentPDF(
                    selectedViewerDocument
                );
            }
        );
    }
}

async function refreshDocumentViewer(){
    const frame =
        document.getElementById(
            "documentPreviewFrame"
        );

    const title =
        document.getElementById(
            "viewerTitle"
        );

    if(!frame)
        return;

    if(title){
        title.textContent =
            viewerDocumentTitles[selectedViewerDocument];
    }

    try{
        if(currentPreviewUrl){
            URL.revokeObjectURL(
                currentPreviewUrl
            );
        }

        currentPreviewUrl =
            await previewDocumentPDF(
                selectedViewerDocument
            );

        frame.src =
            currentPreviewUrl;
    }
    catch(error){
        console.error(error);

        frame.removeAttribute(
            "src"
        );

        alert(
            "Unable to preview this document. Please confirm the form is ready and try again."
        );
    }
}
