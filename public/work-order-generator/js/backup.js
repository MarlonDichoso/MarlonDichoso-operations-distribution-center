(function (global) {
    "use strict";

    function safeName(value, fallback) {
        const clean = String(value || "")
            .trim()
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
            .replace(/\s+/g, "_")
            .slice(0, 90);
        return clean || fallback;
    }

    function dateStamp() {
        return new Date().toISOString().slice(0, 10);
    }

    function addDataUrlFile(folder, fileName, dataUrl) {
        const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return false;
        const extension = match[1].includes("png") ? "png" : "jpg";
        folder.file(`${fileName}.${extension}`, match[2], { base64: true });
        return true;
    }

    async function downloadUnifiedDocumentBackup() {
        if (!global.JSZip) {
            throw new Error("The backup library is not available.");
        }

        const [workOrders, verifications, settings] = await Promise.all([
            getAllRecords("workOrders"),
            getAllRecords("verifications"),
            getAllRecords("settings")
        ]);
        const company = await getCompanyProfile();
        const zip = new global.JSZip();
        const root = zip.folder(`Unified-Ops-Backup_${dateStamp()}`);
        const authorizations = root.folder("Work-Authorizations");
        const ownerApprovals = root.folder("Owner-Approvals");
        const quoteRequests = root.folder("Quote-Requests");
        const verificationFolder = root.folder("Work-Verifications");
        const photoFolder = root.folder("Photos");
        const dataFolder = root.folder("Data");
        const indexRows = [
            ["Document Type", "Work Order", "Property", "Vendor", "Saved Date", "File"]
        ];

        for (const record of workOrders) {
            const identifier = safeName(
                record.workOrderNumber || record.address,
                `Record_${record.id}`
            );
            const payload = { company, workOrder: record };
            const authorizationName = `Work_Authorization_${identifier}.pdf`;
            const approvalName = `Owner_Approval_${identifier}.pdf`;
            const quoteName = `Quote_Request_${identifier}.pdf`;
            authorizations.file(
                authorizationName,
                getDocumentPDF("workOrder", payload).output("blob")
            );
            ownerApprovals.file(
                approvalName,
                getDocumentPDF("ownerApproval", payload).output("blob")
            );
            quoteRequests.file(
                quoteName,
                getDocumentPDF("quoteRequest", payload).output("blob")
            );
            indexRows.push([
                "Work Authorization",
                record.workOrderNumber || "",
                record.address || "",
                record.vendor || "",
                record.createdDate || "",
                `Work-Authorizations/${authorizationName}`
            ]);
            indexRows.push([
                "Owner Approval",
                record.workOrderNumber || "",
                record.address || "",
                record.vendor || "",
                record.createdDate || "",
                `Owner-Approvals/${approvalName}`
            ]);
            indexRows.push([
                "Quote Request",
                record.workOrderNumber || "",
                record.address || "",
                record.vendor || "",
                record.createdDate || "",
                `Quote-Requests/${quoteName}`
            ]);

            (record.photos || []).forEach((photo, index) => {
                addDataUrlFile(
                    photoFolder,
                    `${identifier}_issue_photo_${index + 1}`,
                    photo
                );
            });
        }

        for (const record of verifications) {
            const identifier = safeName(
                record.workOrderNumber || record.address,
                `Verification_${record.id}`
            );
            const fileName = `Work_Verification_${identifier}.pdf`;
            verificationFolder.file(
                fileName,
                getDocumentPDF(
                    "verification",
                    { company, verification: record }
                ).output("blob")
            );
            indexRows.push([
                "Work Verification",
                record.workOrderNumber || "",
                record.address || "",
                record.vendor || "",
                record.createdDate || "",
                `Work-Verifications/${fileName}`
            ]);

            (record.photoPairs || []).forEach((pair, pairIndex) => {
                normalizePhotos(pair.beforeImages || pair.beforeImage).forEach(
                    (photo, index) => addDataUrlFile(
                        photoFolder,
                        `${identifier}_set_${pairIndex + 1}_before_${index + 1}`,
                        photo
                    )
                );
                normalizePhotos(pair.afterImages || pair.afterImage).forEach(
                    (photo, index) => addDataUrlFile(
                        photoFolder,
                        `${identifier}_set_${pairIndex + 1}_after_${index + 1}`,
                        photo
                    )
                );
            });
        }

        dataFolder.file(
            "field-documents.json",
            JSON.stringify(
                {
                    exportedAt: new Date().toISOString(),
                    workOrders,
                    verifications,
                    settings
                },
                null,
                2
            )
        );
        root.file(
            "backup-index.csv",
            indexRows
                .map((row) => row.map((cell) =>
                    `"${String(cell).replaceAll('"', '""')}"`
                ).join(","))
                .join("\r\n")
        );
        root.file(
            "README.txt",
            [
                "UNIFIED OPS DOCUMENT BACKUP",
                `Created: ${new Date().toLocaleString()}`,
                "",
                "Folders:",
                "- Work-Authorizations: owner oversight authorization reports",
                "- Owner-Approvals: saved owner approval reports",
                "- Quote-Requests: requests for vendor estimates",
                "- Work-Verifications: completed-work verification reports",
                "- Photos: original issue, before, and after photos",
                "- Data: complete field-document data in JSON format",
                "- backup-index.csv: searchable list of every generated PDF"
            ].join("\r\n")
        );

        const blob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Unified-Ops-Backup_${dateStamp()}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 2000);

        return {
            workOrders: workOrders.length,
            verifications: verifications.length,
            files: indexRows.length - 1
        };
    }

    global.downloadUnifiedDocumentBackup = downloadUnifiedDocumentBackup;
})(window);
