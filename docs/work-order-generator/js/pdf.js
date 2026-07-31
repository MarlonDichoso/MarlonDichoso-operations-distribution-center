/* =========================================
   PDF MODULE
========================================= */

const PDF_PRIMARY = [38, 53, 69];
const PDF_HEADER = [223, 231, 238];
const PDF_BORDER = [185, 195, 206];
const PDF_LIGHT = [238, 243, 246];
const PDF_TEXT = [29, 45, 63];
const PDF_MUTED = [102, 117, 134];

const PDF_PAGE = {
    width: 210,
    height: 297,
    margin: 8
};

function setPdfText(pdf, color = PDF_TEXT){
    pdf.setTextColor(color[0], color[1], color[2]);
}

function setPdfStroke(pdf, color = PDF_BORDER){
    pdf.setDrawColor(color[0], color[1], color[2]);
}

function setPdfFill(pdf, color){
    pdf.setFillColor(color[0], color[1], color[2]);
}

function money(value){
    const number = Number(value) || 0;
    return number.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function safeFilePart(value, fallback){
    return (value || fallback)
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "_") || fallback;
}

function formatDate(value){
    if(!value){
        return new Date().toLocaleDateString();
    }

    const date = new Date(value);

    if(Number.isNaN(date.getTime())){
        return value;
    }

    return date.toLocaleDateString();
}

function addPageIfNeeded(pdf, y, needed){
    if(y + needed <= PDF_PAGE.height - PDF_PAGE.margin){
        return y;
    }

    pdf.addPage();
    return PDF_PAGE.margin;
}

function drawCellText(pdf, text, x, y, width, height, options = {}){
    const padding = options.padding ?? 2;
    const fontSize = options.fontSize ?? 6.8;
    const maxLines = Math.max(
        1,
        Math.floor((height - (padding * 2)) / (fontSize * 0.36 + 1.3))
    );

    pdf.setFontSize(fontSize);
    pdf.setFont(undefined, options.bold ? "bold" : "normal");

    const lines = pdf
        .splitTextToSize(String(text || ""), width - (padding * 2))
        .slice(0, maxLines);

    const textY = y + padding + fontSize * 0.36;

    pdf.text(
        lines,
        options.align === "right" ? x + width - padding : x + padding,
        textY,
        {
            align: options.align || "left"
        }
    );

    pdf.setFont(undefined, "normal");
}

function drawHeaderBar(pdf, title, y, columns){
    setPdfFill(pdf, PDF_HEADER);
    setPdfStroke(pdf, PDF_HEADER);
    pdf.rect(PDF_PAGE.margin, y, PDF_PAGE.width - (PDF_PAGE.margin * 2), 6.2, "F");

    setPdfText(pdf);
    pdf.setFontSize(6.3);
    pdf.setFont(undefined, "bold");

    columns.forEach(column => {
        pdf.text(
            column.label.toUpperCase(),
            column.x + column.width / 2,
            y + 4.1,
            {
                align: "center"
            }
        );
    });

    if(title){
        pdf.text(title.toUpperCase(), PDF_PAGE.margin + 2, y + 4.1);
    }

    pdf.setFont(undefined, "normal");
    setPdfText(pdf);

    return y + 6.2;
}

function drawSectionBar(pdf, title, y){
    y = addPageIfNeeded(pdf, y, 10);

    setPdfFill(pdf, PDF_HEADER);
    setPdfStroke(pdf, PDF_HEADER);
    pdf.rect(
        PDF_PAGE.margin,
        y,
        PDF_PAGE.width - (PDF_PAGE.margin * 2),
        7,
        "F"
    );

    setPdfText(pdf);
    pdf.setFontSize(7);
    pdf.setFont(undefined, "bold");
    pdf.text(title.toUpperCase(), PDF_PAGE.margin + 2, y + 4.8);
    pdf.setFont(undefined, "normal");
    setPdfText(pdf);

    return y + 8.5;
}

function drawFieldRow(pdf, y, fields){
    const rowHeight = 6.6;
    const x = PDF_PAGE.margin;
    const totalWidth = PDF_PAGE.width - (PDF_PAGE.margin * 2);
    const labelWidth = 34;

    setPdfStroke(pdf);
    pdf.setLineWidth(0.2);

    let cursor = x;

    fields.forEach(field => {
        const width = field.width || totalWidth / fields.length;

        setPdfFill(pdf, PDF_HEADER);
        pdf.rect(cursor, y, labelWidth, rowHeight, "F");

        setPdfText(pdf);
        drawCellText(
            pdf,
            field.label.toUpperCase(),
            cursor,
            y,
            labelWidth,
            rowHeight,
            {
                fontSize: 5.5,
                bold: true
            }
        );

        setPdfText(pdf);
        pdf.rect(cursor + labelWidth, y, width - labelWidth, rowHeight);
        drawCellText(
            pdf,
            field.value,
            cursor + labelWidth,
            y,
            width - labelWidth,
            rowHeight,
            {
                fontSize: 6.3
            }
        );

        cursor += width;
    });

    return y + rowHeight;
}

function drawLabeledBox(pdf, label, value, y, height){
    const x = PDF_PAGE.margin;
    const width = PDF_PAGE.width - (PDF_PAGE.margin * 2);
    const labelWidth = 34;

    setPdfStroke(pdf);
    setPdfFill(pdf, PDF_HEADER);
    pdf.rect(x, y, labelWidth, height, "F");
    pdf.rect(x + labelWidth, y, width - labelWidth, height);

    setPdfText(pdf);
    drawCellText(
        pdf,
        label.toUpperCase(),
        x,
        y,
        labelWidth,
        height,
        {
            fontSize: 5.7,
            bold: true
        }
    );

    setPdfText(pdf);
    drawCellText(
        pdf,
        value,
        x + labelWidth,
        y,
        width - labelWidth,
        height,
        {
            fontSize: 6.4
        }
    );

    return y + height;
}

function drawLabeledBoxAuto(pdf, label, value, y, options = {}){
    const x = PDF_PAGE.margin;
    const width = PDF_PAGE.width - (PDF_PAGE.margin * 2);
    const labelWidth = options.labelWidth || 34;
    const valueWidth = width - labelWidth;
    const fontSize = options.fontSize || 6.4;
    const lineHeight = options.lineHeight || 4.2;
    const padding = options.padding || 2;
    const minHeight = options.minHeight || 18;
    const bottomLimit = PDF_PAGE.height - PDF_PAGE.margin;

    pdf.setFontSize(fontSize);
    pdf.setFont(undefined, "normal");

    const lines =
        pdf.splitTextToSize(
            String(value || ""),
            valueWidth - (padding * 2)
        );

    const safeLines =
        lines.length
        ? lines
        : [""];

    let index = 0;
    let firstPage = true;

    while(index < safeLines.length){
        y = addPageIfNeeded(
            pdf,
            y,
            minHeight
        );

        const remainingHeight =
            bottomLimit - y;

        const maxLines =
            Math.max(
                1,
                Math.floor(
                    (remainingHeight - (padding * 2)) /
                    lineHeight
                )
            );

        const pageLines =
            safeLines.slice(
                index,
                index + maxLines
            );

        const boxHeight =
            Math.max(
                minHeight,
                (pageLines.length * lineHeight) +
                (padding * 2)
            );

        setPdfStroke(pdf);
        setPdfFill(pdf, PDF_HEADER);
        pdf.rect(
            x,
            y,
            labelWidth,
            boxHeight,
            "F"
        );
        pdf.rect(
            x + labelWidth,
            y,
            valueWidth,
            boxHeight
        );

        setPdfText(pdf);
        drawCellText(
            pdf,
            firstPage
            ? label.toUpperCase()
            : `${label.toUpperCase()} CONT.`,
            x,
            y,
            labelWidth,
            boxHeight,
            {
                fontSize: 5.7,
                bold: true
            }
        );

        pdf.setFontSize(fontSize);
        pdf.setFont(undefined, "normal");
        pdf.text(
            pageLines,
            x + labelWidth + padding,
            y + padding + (fontSize * 0.36)
        );

        y += boxHeight;
        index += pageLines.length;
        firstPage = false;

        if(index < safeLines.length){
            y = PDF_PAGE.height;
        }

    }

    pdf.setFont(undefined, "normal");
    setPdfText(pdf);

    return y;
}

function drawDocumentHeader(pdf, company, title, subtitle){
    const margin = PDF_PAGE.margin;
    const companyName = company.companyName || "Property Management Company";
    const contactLines = [
        company.companyAddress || "",
        company.companyPhone || "",
        company.companyEmail || "",
        company.companyWebsite || ""
    ].filter(Boolean);

    setPdfText(pdf);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(13);
    pdf.text(title.toUpperCase(), margin, 14);

    pdf.setFontSize(6.5);
    pdf.text(companyName, margin, 24);

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(5.7);

    contactLines.forEach((line, index) => {
        pdf.text(line, margin, 29 + (index * 4));
    });

    setPdfText(pdf, [178, 178, 178]);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(14);
    pdf.text(companyName.slice(0, 18).toUpperCase(), 148, 25, { align: "center" });

    setPdfText(pdf);
    pdf.setFontSize(12);
    pdf.text(subtitle.toUpperCase(), 196, 43, { align: "right" });

    setPdfStroke(pdf);
    pdf.line(margin, 51, PDF_PAGE.width - margin, 51);
    pdf.setFont(undefined, "normal");

    return 53;
}

function drawPlainLines(pdf, lines, y){
    y = addPageIfNeeded(pdf, y, lines.length * 7 + 4);
    pdf.setFontSize(8.5);

    lines.forEach(line => {
        if(line.bold){
            pdf.setFont(undefined, "bold");
        }
        else{
            pdf.setFont(undefined, "normal");
        }

        pdf.text(String(line.text || ""), line.x || 14, y);
        y += line.gap || 7;
    });

    pdf.setFont(undefined, "normal");

    return y;
}

function drawWrappedParagraph(pdf, text, x, y, width, fontSize = 8.5){
    y = addPageIfNeeded(pdf, y, 12);
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(text || "", width);

    pdf.text(lines, x, y);

    return y + (lines.length * 4.8);
}

function splitEstimateItems(items){
    const labor = [];
    const material = [];

    (items || []).forEach(item => {
        const category = (item.category || "").toLowerCase();

        if(category.includes("material") || category.includes("part") || category.includes("supply")){
            material.push(item);
        }
        else{
            labor.push(item);
        }
    });

    return {
        labor,
        material
    };
}

function drawCostTable(pdf, title, items, y, rowCount = 5){
    const x = PDF_PAGE.margin;
    const columns = [
        { label: `${title} Description`, x, width: 100 },
        { label: title === "Labor" ? "Hours" : "Quantity", x: x + 100, width: 22 },
        { label: "Rate", x: x + 122, width: 31 },
        { label: "Amount", x: x + 153, width: 41 }
    ];

    y = addPageIfNeeded(pdf, y, 8 + (rowCount * 7) + 8);
    y = drawHeaderBar(pdf, "", y, columns);

    const visibleRows = Math.max(rowCount, items.length || 1);
    let total = 0;

    setPdfStroke(pdf);

    for(let index = 0; index < visibleRows; index++){
        const item = items[index] || {};
        const amount = Number(item.amount) || 0;
        const quantity = item.quantity || item.hours || "";
        const rate = item.rate || "";

        if(items[index]){
            total += amount;
        }

        const rowY = y + (index * 7);

        pdf.rect(x, rowY, 100, 7);
        pdf.rect(x + 100, rowY, 22, 7);
        pdf.rect(x + 122, rowY, 15, 7);
        pdf.rect(x + 137, rowY, 16, 7);
        pdf.rect(x + 153, rowY, 15, 7);
        pdf.rect(x + 168, rowY, 26, 7);

        drawCellText(pdf, item.description || "", x, rowY, 100, 7);
        drawCellText(pdf, quantity, x + 100, rowY, 22, 7, { align: "right" });
        drawCellText(pdf, "$", x + 122, rowY, 15, 7, { align: "center" });
        drawCellText(pdf, rate ? money(rate) : "", x + 137, rowY, 16, 7, { align: "right" });
        drawCellText(pdf, "$", x + 153, rowY, 15, 7, { align: "center" });
        drawCellText(pdf, items[index] ? money(amount) : "-", x + 168, rowY, 26, 7, { align: "right" });
    }

    y += visibleRows * 7;

    setPdfFill(pdf, PDF_HEADER);
    pdf.rect(x + 122, y, 46, 7, "F");
    pdf.rect(x + 168, y, 26, 7);

    setPdfText(pdf);
    drawCellText(
        pdf,
        `${title} Total`.toUpperCase(),
        x + 122,
        y,
        46,
        7,
        {
            align: "right",
            bold: true,
            fontSize: 5.8
        }
    );

    setPdfText(pdf);
    drawCellText(pdf, `$${money(total)}`, x + 168, y, 26, 7, { align: "right", bold: true });

    return {
        y: y + 9,
        total
    };
}

function drawTotals(pdf, y, totals){
    const x = 136;
    const labelWidth = 32;
    const valueWidth = 26;
    const rows = [
        ["Subtotal", totals.subtotal],
        ["Tax Rate %", totals.taxRate || 0],
        ["Total Tax", totals.tax || 0],
        ["Other", totals.other || 0],
        ["Total", totals.total]
    ];

    y = addPageIfNeeded(pdf, y, rows.length * 7);

    rows.forEach((row, index) => {
        const rowY = y + (index * 7);

        setPdfFill(pdf, PDF_HEADER);
        pdf.rect(x, rowY, labelWidth, 7, "F");
        pdf.rect(x + labelWidth, rowY, valueWidth, 7);

        setPdfText(pdf);
        drawCellText(
            pdf,
            row[0].toUpperCase(),
            x,
            rowY,
            labelWidth,
            7,
            {
                align: "right",
                bold: true,
                fontSize: 5.7
            }
        );

        setPdfText(pdf);
        drawCellText(
            pdf,
            index === 1 ? `${money(row[1])}%` : `$${money(row[1])}`,
            x + labelWidth,
            rowY,
            valueWidth,
            7,
            {
                align: "right",
                bold: index === rows.length - 1
            }
        );
    });

    return y + (rows.length * 7);
}

function drawApprovalArea(pdf, y, approvalLabels){
    const x = PDF_PAGE.margin;
    const leftWidth = 96;
    const rowHeight = 8;

    y = addPageIfNeeded(pdf, y, 42);

    approvalLabels.forEach((label, index) => {
        const rowY = y + (index * rowHeight);
        setPdfFill(pdf, index === 0 ? PDF_HEADER : [255, 255, 255]);
        pdf.rect(x, rowY, leftWidth, rowHeight, index === 0 ? "F" : "S");

        setPdfText(pdf);
        drawCellText(
            pdf,
            label.toUpperCase(),
            x,
            rowY,
            leftWidth,
            rowHeight,
            {
                fontSize: 5.7,
                bold: index === 0
            }
        );
    });

    return y + (approvalLabels.length * rowHeight);
}

function drawPhotoGrid(pdf, photos, title, y){
    const safePhotos =
        normalizePhotos(
            photos
        );

    if(!safePhotos.length){
        return y;
    }

    const imageWidth = 61;
    const imageHeight = 42;
    const gap = 5;
    const rowGap = 8;
    const columns = 3;
    let headerDrawn = false;

    safePhotos.forEach((photo, index) => {
        const column =
            index % columns;

        if(
            !headerDrawn ||
            column === 0
        ){

            y = addPageIfNeeded(
                pdf,
                y,
                imageHeight + 20
            );

            if(
                !headerDrawn ||
                y <= PDF_PAGE.margin + 1
            ){

                y = drawHeaderBar(
                    pdf,
                    "",
                    y,
                    [
                        {
                            label:
                                headerDrawn
                                ? `${title} Continued`
                                : title,
                            x: PDF_PAGE.margin,
                            width:
                                PDF_PAGE.width -
                                (PDF_PAGE.margin * 2)
                        }
                    ]
                );

                headerDrawn = true;

            }

        }

        const x =
            PDF_PAGE.margin +
            (column * (imageWidth + gap));

        setPdfStroke(pdf);
        pdf.rect(
            x,
            y,
            imageWidth,
            imageHeight
        );

        try{

            pdf.addImage(
                photo,
                "JPEG",
                x + 1,
                y + 1,
                imageWidth - 2,
                imageHeight - 7
            );

        }
        catch(error){
            console.error(error);
        }

        pdf.setFontSize(5.7);
        setPdfText(pdf, PDF_MUTED);
        pdf.text(
            `Photo ${index + 1}`,
            x + imageWidth / 2,
            y + imageHeight - 2,
            {
                align: "center"
            }
        );
        setPdfText(pdf);

        if(
            column === columns - 1 ||
            index === safePhotos.length - 1
        ){

            y += imageHeight + rowGap;

        }

    });

    return y;
}

function normalizePhotos(value){
    if(Array.isArray(value)){
        return value.filter(Boolean);
    }

    if(value){
        return [value];
    }

    return [];
}

function drawPhotoStrip(
    pdf,
    photos,
    title,
    x,
    y,
    width,
    startNumber = 1
){

    const safePhotos =
        normalizePhotos(
            photos
        );

    const labelHeight = 6;
    const imageGap = 3;
    const verticalGap = 3;
    const maxColumns = 3;
    const columns =
        Math.max(
            1,
            Math.min(
                maxColumns,
                safePhotos.length || 1
            )
        );

    const imageWidth =
        (width - (imageGap * (columns - 1))) /
        columns;

    const imageHeight = 36;
    const rows =
        Math.max(
            1,
            Math.ceil(
                safePhotos.length /
                columns
            )
        );

    const boxHeight =
        labelHeight +
        4 +
        (rows * imageHeight) +
        ((rows - 1) * verticalGap);

    setPdfStroke(pdf);
    pdf.rect(
        x,
        y,
        width,
        boxHeight
    );

    setPdfFill(pdf, PDF_LIGHT);
    pdf.rect(
        x,
        y,
        width,
        labelHeight,
        "F"
    );

    setPdfText(pdf);
    pdf.setFontSize(6.4);
    pdf.setFont(undefined, "bold");
    pdf.text(
        title.toUpperCase(),
        x + 2,
        y + 4.2
    );
    pdf.setFont(undefined, "normal");

    if(!safePhotos.length){
        setPdfText(pdf, PDF_MUTED);
        pdf.setFontSize(6);
        pdf.text(
            "No photos selected",
            x + 2,
            y + labelHeight + 10
        );
        setPdfText(pdf);

        return boxHeight;
    }

    safePhotos
        .forEach((photo, index) => {

            const row =
                Math.floor(
                    index / columns
                );

            const column =
                index % columns;

            const imageX =
                x +
                (column * (imageWidth + imageGap));

            const imageY =
                y +
                labelHeight +
                2 +
                (row * (imageHeight + verticalGap));

            pdf.rect(
                imageX,
                imageY,
                imageWidth,
                imageHeight
            );

            try{

                pdf.addImage(
                    photo,
                    "JPEG",
                    imageX + 1,
                    imageY + 1,
                    imageWidth - 2,
                    imageHeight - 7
                );

            }
            catch(error){

                console.error(error);

            }

            pdf.setFontSize(5.5);
            setPdfText(pdf, PDF_MUTED);
            pdf.text(
                `Photo ${startNumber + index}`,
                imageX + imageWidth / 2,
                imageY + imageHeight - 2,
                {
                    align: "center"
                }
            );
            setPdfText(pdf);

        });

    return boxHeight;

}

function buildWorkOrderPDF(company, wo){
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const estimate = splitEstimateItems(wo.estimateItems || []);
    const laborTotal = estimate.labor.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
    );
    const materialTotal = estimate.material.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
    );
    const estimatedTotal =
        Number(wo.total) ||
        laborTotal + materialTotal;
    const margin = 14;
    const contentWidth = 182;

    /* Owner oversight header */
    pdf.setFillColor(16, 31, 52);
    pdf.rect(0, 0, 210, 40, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(18);
    pdf.text("WORK AUTHORIZATION", margin, 15);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(190, 204, 222);
    pdf.text(
        (company.companyName || "Property Management Company").toUpperCase(),
        margin,
        24
    );
    pdf.setFontSize(7);
    pdf.text("OWNER OVERSIGHT REPORT", margin, 31);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(
        `Work Order ${wo.workOrderNumber || "Pending"}`,
        196,
        24,
        { align: "right" }
    );

    /* Decision status */
    pdf.setFillColor(238, 245, 255);
    pdf.setDrawColor(169, 196, 232);
    pdf.roundedRect(margin, 48, contentWidth, 18, 2, 2, "FD");
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(41, 86, 150);
    pdf.text("DECISION REQUIRED", margin + 6, 56);
    pdf.setFontSize(11);
    pdf.setTextColor(16, 31, 52);
    pdf.text("Review the proposed work and estimated cost for authorization.", margin + 6, 62);

    /* Key decision facts */
    const facts = [
        ["PROPERTY", [wo.address, wo.unit ? `Unit ${wo.unit}` : ""].filter(Boolean).join(" · ") || "-"],
        ["PRIORITY", wo.priority || "-"],
        ["REQUEST DATE", formatDate(wo.workOrderDate) || "-"],
        ["ESTIMATED TOTAL", `$${money(estimatedTotal)}`]
    ];
    facts.forEach((fact, index) => {
        const x = margin + (index * 45.5);
        pdf.setFillColor(index === 3 ? 238 : 248, index === 3 ? 246 : 250, index === 3 ? 241 : 252);
        pdf.setDrawColor(220, 227, 235);
        pdf.roundedRect(x, 72, 42.5, 24, 2, 2, "FD");
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(94, 108, 126);
        pdf.text(fact[0], x + 4, 79);
        pdf.setFontSize(index === 3 ? 12 : 8);
        pdf.setTextColor(index === 3 ? 32 : 16, index === 3 ? 122 : 31, index === 3 ? 82 : 52);
        pdf.text(
            pdf.splitTextToSize(String(fact[1]), 34).slice(0, 2),
            x + 4,
            87
        );
    });

    /* Owner-focused narrative */
    let y = 104;
    y = drawLabeledBoxAuto(pdf, "Issue Requiring Attention", wo.issue || "-", y, {
        minHeight: 25
    });
    y = drawLabeledBoxAuto(pdf, "Recommended Scope of Work", wo.scope || "-", y + 4, {
        minHeight: 29
    });

    y += 5;
    y = drawSectionBar(pdf, "Cost Oversight", y);
    y = drawFieldRow(pdf, y, [
        { label: "Labor", value: `$${money(laborTotal)}`, width: 64.5 },
        { label: "Materials", value: `$${money(materialTotal)}`, width: 64.5 },
        { label: "Total Requested", value: `$${money(estimatedTotal)}`, width: 65 }
    ]);

    y += 6;
    y = drawSectionBar(pdf, "Responsible Parties", y);
    y = drawFieldRow(pdf, y, [
        { label: "Owner", value: wo.owner || "-", width: 64.5 },
        { label: "Manager", value: wo.manager || "-", width: 64.5 },
        { label: "Vendor / Technician", value: wo.vendor || wo.technician || "-", width: 65 }
    ]);

    y += 7;
    pdf.setDrawColor(182, 195, 210);
    pdf.setFillColor(251, 252, 254);
    pdf.roundedRect(margin, y, contentWidth, 43, 2, 2, "FD");
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(16, 31, 52);
    pdf.text("OWNER AUTHORIZATION", margin + 6, y + 9);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8.5);
    pdf.rect(margin + 6, y + 14, 4, 4);
    pdf.text("APPROVE WORK", margin + 13, y + 18);
    pdf.rect(margin + 57, y + 14, 4, 4);
    pdf.text("DECLINE / RETURN FOR REVISION", margin + 64, y + 18);
    pdf.setDrawColor(135, 148, 164);
    pdf.line(margin + 6, y + 34, margin + 86, y + 34);
    pdf.line(margin + 104, y + 34, margin + 146, y + 34);
    pdf.line(margin + 154, y + 34, margin + 176, y + 34);
    pdf.setFontSize(6.5);
    pdf.setTextColor(94, 108, 126);
    pdf.text("Owner / Authorized Representative", margin + 6, y + 39);
    pdf.text("Signature", margin + 104, y + 39);
    pdf.text("Date", margin + 154, y + 39);

    if(wo.remarks){
        y = drawLabeledBoxAuto(pdf, "Management Remarks", wo.remarks, y + 49, {
            minHeight: 18
        });
    }

    /* Supporting detail is intentionally moved away from the decision page. */
    if((wo.estimateItems || []).length || (wo.photos || []).length){
        pdf.addPage();
        let detailY = drawDocumentHeader(
            pdf,
            company,
            "Supporting Detail",
            `Work Order ${wo.workOrderNumber || ""}`
        );
        detailY = drawSectionBar(pdf, "Detailed Estimate", detailY + 4);
        const laborTable = drawCostTable(
            pdf,
            "Labor",
            estimate.labor,
            detailY,
            Math.max(1, estimate.labor.length)
        );
        const materialTable = drawCostTable(
            pdf,
            "Material",
            estimate.material,
            laborTable.y,
            Math.max(1, estimate.material.length)
        );
        detailY = materialTable.y + 5;
        detailY = drawPhotoGrid(
            pdf,
            wo.photos || [],
            "Issue Photos",
            detailY
        );
    }

    return pdf;
}

function drawVerificationHeader(pdf, company, v, pageLabel){
    const companyName =
        company.companyName ||
        "Field Work App";
    const workOrder =
        v.workOrderNumber
        ? String(v.workOrderNumber)
        : "PENDING";
    const completed =
        v.vendorVerified ||
        v.tenantVerified;

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, 297, 36, "F");
    pdf.setDrawColor(210, 220, 232);
    pdf.line(0, 36, 297, 36);

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(7, 20, 39);
    pdf.text(
        companyName.toUpperCase().slice(0, 27),
        14,
        23
    );

    pdf.setDrawColor(190, 200, 212);
    pdf.line(137, 9, 137, 29);

    pdf.setFontSize(10);
    pdf.setTextColor(7, 20, 39);
    pdf.text("Work Verification", 156, 21);

    pdf.setDrawColor(168, 197, 235);
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(200, 9, 40, 18, 2, 2, "FD");
    pdf.setFontSize(13);
    pdf.setTextColor(20, 87, 217);
    pdf.text(workOrder, 220, 21, { align: "center" });

    pdf.setFillColor(
        completed ? 20 : 236,
        completed ? 134 : 107,
        completed ? 77 : 0
    );
    pdf.roundedRect(245, 10, 38, 16, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.text(
        completed ? "COMPLETED" : "PENDING",
        264,
        21,
        {
            align: "center"
        }
    );

    if(pageLabel){
        pdf.setFontSize(7);
        pdf.setTextColor(95, 111, 130);
        pdf.text(pageLabel, 283, 33, { align: "right" });
    }
}

function drawVerificationPhotoCard(pdf, photo, title, x, y, width, height, caption){
    const labelHeight = 12;
    const captionHeight = 13;

    pdf.setDrawColor(178, 204, 237);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 2, 2, "FD");

    pdf.setFillColor(20, 87, 217);
    pdf.roundedRect(x, y, 31, labelHeight, 2, 2, "F");
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title.toUpperCase(), x + 15.5, y + 8, { align: "center" });

    if(photo){
        try{
            pdf.addImage(
                photo,
                "JPEG",
                x + 1,
                y + labelHeight,
                width - 2,
                height - labelHeight - captionHeight
            );
        }
        catch(error){
            console.error(error);
            pdf.setFillColor(242, 246, 250);
            pdf.rect(x + 1, y + labelHeight, width - 2, height - labelHeight - captionHeight, "F");
            pdf.setTextColor(95, 111, 130);
            pdf.setFontSize(9);
            pdf.text("Photo could not be loaded", x + width / 2, y + height / 2, { align: "center" });
        }
    }
    else{
        pdf.setFillColor(242, 246, 250);
        pdf.rect(x + 1, y + labelHeight, width - 2, height - labelHeight - captionHeight, "F");
        pdf.setTextColor(95, 111, 130);
        pdf.setFontSize(10);
        pdf.text("No photo selected", x + width / 2, y + height / 2, { align: "center" });
    }

    pdf.setFillColor(239, 246, 255);
    pdf.rect(x + 1, y + height - captionHeight, width - 2, captionHeight - 1, "F");
    pdf.setTextColor(7, 20, 39);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.text(caption, x + 10, y + height - 5);
}

function drawVerificationInfoCard(pdf, x, y, width, title, text, color){
    pdf.setDrawColor(214, 225, 236);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, 25, 2, 2, "FD");

    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.circle(x + 9, y + 12.5, 3.8, "F");

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(title, x + 18, y + 11);

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(7, 20, 39);
    pdf.text(
        pdf.splitTextToSize(text || "-", width - 24).slice(0, 2),
        x + 18,
        y + 19
    );
}

function drawVerificationTextBox(pdf, x, y, width, title, text){
    pdf.setDrawColor(178, 204, 237);
    pdf.setFillColor(248, 251, 255);
    pdf.roundedRect(x, y, width, 31, 2, 2, "FD");
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(20, 87, 217);
    pdf.text(title.toUpperCase(), x + 4, y + 8);

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(7, 20, 39);
    pdf.text(
        pdf.splitTextToSize(text || "-", width - 8).slice(0, 4),
        x + 4,
        y + 16
    );
}

function drawVerificationChecks(pdf, x, y, width, v){
    const checks = [
        ["Vendor verified", !!v.vendorVerified],
        ["Tenant verified", !!v.tenantVerified],
        ["Work completed noted", !!(v.completedWork || "").trim()],
        ["Photo documentation", !!(v.photoPairs || []).length]
    ];

    pdf.setDrawColor(178, 204, 237);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, 43, 2, 2, "FD");
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(20, 87, 217);
    pdf.text("CHECKS", x + 4, y + 8);

    checks.forEach((check, index) => {
        const rowY = y + 16 + (index * 7);
        pdf.setFillColor(check[1] ? 20 : 236, check[1] ? 134 : 107, check[1] ? 77 : 0);
        pdf.circle(x + 6, rowY - 2, 2.5, "F");
        pdf.setTextColor(7, 20, 39);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(7.5);
        pdf.text(check[0], x + 12, rowY);
        if(index < checks.length - 1){
            pdf.setDrawColor(225, 232, 239);
            pdf.line(x + 12, rowY + 2.5, x + width - 4, rowY + 2.5);
        }
    });
}

function buildVerificationPDF(company, v){
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("l", "mm", "a4");
    const pairs =
        (v.photoPairs && v.photoPairs.length)
        ? v.photoPairs
        : [
            {
                beforeImages: [],
                afterImages: [],
                issueObserved: "",
                correctionPerformed: ""
            }
        ];

    let pageCount = 0;

    pairs.forEach((pair, pairIndex) => {
        const beforeImages =
            normalizePhotos(
                pair.beforeImages ||
                pair.beforeImage
            );

        const afterImages =
            normalizePhotos(
                pair.afterImages ||
                pair.afterImage
            );

        const totalPhotoCount =
            Math.max(
                beforeImages.length,
                afterImages.length,
                1
            );

        for(let photoIndex = 0; photoIndex < totalPhotoCount; photoIndex++){
            if(pageCount > 0){
                pdf.addPage();
            }

            pageCount++;

            pdf.setFillColor(242, 246, 250);
            pdf.rect(0, 0, 297, 210, "F");
            drawVerificationHeader(
                pdf,
                company,
                v,
                `Photo Set ${pairIndex + 1} / Photo ${photoIndex + 1}`
            );

            drawVerificationPhotoCard(
                pdf,
                beforeImages[photoIndex] || "",
                "Before",
                12,
                42,
                88,
                142,
                `Photo ${photoIndex + 1}`
            );

            drawVerificationPhotoCard(
                pdf,
                afterImages[photoIndex] || "",
                "After",
                104,
                42,
                88,
                142,
                `Photo ${photoIndex + 1}`
            );

            const address =
                [v.address, v.unit ? `Unit ${v.unit}` : ""]
                    .filter(Boolean)
                    .join(", ");

            drawVerificationTextBox(
                pdf,
                200,
                42,
                84,
                "Property",
                address || "No address entered"
            );

            drawVerificationInfoCard(
                pdf,
                200,
                78,
                84,
                "Reported",
                pair.issueObserved || v.vendorRemarks || "-",
                [236, 107, 0]
            );

            drawVerificationInfoCard(
                pdf,
                200,
                109,
                84,
                "Resolved",
                pair.correctionPerformed || v.completedWork || "-",
                [20, 134, 77]
            );

            drawVerificationChecks(
                pdf,
                200,
                140,
                84,
                v
            );

        }
    });

    return pdf;
}

function buildOwnerApprovalPDF(company, wo){
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    let y = drawDocumentHeader(
        pdf,
        company,
        "Owner Repair Approval Request",
        "Owner Approval"
    );

    pdf.setFontSize(8.5);
    y = drawPlainLines(
        pdf,
        [
            {
                text: `Hi ${wo.owner || "Property Owner"},`
            },
            {
                text: "We received a maintenance request at the property regarding the following issue:",
                gap: 9
            }
        ],
        y + 4
    );

    y = drawFieldRow(
        pdf,
        y,
        [
            {
                label: "Property Address",
                value: wo.address || "",
                width: 194
            }
        ]
    );

    y += 4;
    y = drawLabeledBox(pdf, "Issue", wo.issue || "", y, 24);
    y = drawLabeledBox(pdf, "Proposed Repair", wo.ownerProposedRepair || wo.scope || "", y, 24);
    y = drawFieldRow(
        pdf,
        y + 3,
        [
            {
                label: "Vendor",
                value: wo.vendor || "Pending Vendor Assignment",
                width: 97
            },
            {
                label: "Estimated Cost",
                value: `$${money(wo.total)}`,
                width: 97
            }
        ]
    );

    y += 8;
    y = drawWrappedParagraph(pdf, "(Estimate/photos attached)", 14, y, 170);
    y = drawPhotoGrid(pdf, wo.photos || [], "Issue Photos", y + 2);

    y = drawSectionBar(pdf, "Please Reply With One Of The Following", y);
    y = drawApprovalArea(
        pdf,
        y,
        [
            "Approved as quoted",
            "Approved up to $",
            "Please obtain additional bids",
            "Not approved"
        ]
    );

    y += 6;
    y = drawWrappedParagraph(
        pdf,
        "If this repair is required to maintain habitability under New York law, timely approval is recommended to avoid tenant liability issues.",
        14,
        y,
        178,
        7.5
    );

    return pdf;
}

function buildQuoteRequestPDF(company, wo){
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const blue = [37, 94, 171];
    const navy = [10, 32, 70];
    const muted = [92, 111, 137];
    const line = [191, 202, 216];
    const left = 14;
    const right = 196;

    function drawIcon(kind, x, y){
        pdf.setDrawColor(...blue);
        pdf.setTextColor(...blue);
        pdf.setLineWidth(.55);

        if(kind === "calendar"){
            pdf.roundedRect(x, y, 6, 6, .5, .5);
            pdf.line(x, y + 2, x + 6, y + 2);
            pdf.line(x + 1.5, y - .7, x + 1.5, y + 1);
            pdf.line(x + 4.5, y - .7, x + 4.5, y + 1);
        }
        else if(kind === "building"){
            pdf.rect(x + 1, y, 4.5, 7);
            pdf.line(x, y + 7, x + 7, y + 7);
            for(let row = 0; row < 3; row++){
                pdf.rect(x + 2, y + 1 + (row * 1.7), .7, .7);
                pdf.rect(x + 3.8, y + 1 + (row * 1.7), .7, .7);
            }
        }
        else if(kind === "pin"){
            pdf.circle(x + 3, y + 2.5, 2.4);
            pdf.circle(x + 3, y + 2.5, .7);
            pdf.line(x + 1.2, y + 4.2, x + 3, y + 7);
            pdf.line(x + 4.8, y + 4.2, x + 3, y + 7);
        }
        else if(kind === "clipboard"){
            pdf.roundedRect(x + .5, y, 5.5, 7, .4, .4);
            pdf.roundedRect(x + 2, y - .6, 2.5, 1.4, .3, .3);
            pdf.line(x + 1.5, y + 2.5, x + 5, y + 2.5);
            pdf.line(x + 1.5, y + 4, x + 5, y + 4);
        }
        else if(kind === "wrench"){
            pdf.circle(x + 1.4, y + 5.5, 1);
            pdf.line(x + 2.2, y + 4.8, x + 5.5, y + 1.5);
            pdf.line(x + 5.1, y + .7, x + 6.6, y);
            pdf.line(x + 5.5, y + 1.5, x + 6.8, y + 2.1);
        }
        else if(kind === "camera"){
            pdf.roundedRect(x, y + 1.2, 7, 5, .6, .6);
            pdf.rect(x + 1.2, y, 2.2, 1.3);
            pdf.circle(x + 3.5, y + 3.7, 1.3);
        }
        else{
            pdf.circle(x + 3.2, y + 3, 3);
            pdf.circle(x + 3.2, y + 2.1, .9);
            pdf.line(x + 1.4, y + 5, x + 5, y + 5);
        }
    }

    function drawInfoBlock(kind, label, value, x, y, width, options = {}){
        drawIcon(kind, x, y + 1);
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...blue);
        pdf.text(label.toUpperCase(), x + 13, y + 4);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(options.fontSize || 10);
        pdf.setTextColor(...navy);
        pdf.text(
            pdf.splitTextToSize(String(value || "-"), width - 13).slice(0, options.lines || 2),
            x + 13,
            y + 12
        );
    }

    /* Header */
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...navy);
    pdf.text(
        (company.companyName || "Property Management").toUpperCase(),
        left,
        15
    );
    pdf.setFontSize(27);
    pdf.text("REQUEST FOR QUOTE", left, 34);
    pdf.setFillColor(...blue);
    pdf.roundedRect(177, 22, 19, 13, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.text("RFQ", 186.5, 30.5, { align: "center" });
    pdf.setDrawColor(...blue);
    pdf.setLineWidth(.6);
    pdf.line(left, 44, right, 44);

    /* Date and vendor */
    drawInfoBlock(
        "calendar",
        "Date",
        formatDate(wo.workOrderDate || new Date()),
        left,
        54,
        64
    );
    drawInfoBlock(
        "building",
        "Vendor",
        wo.vendor || "Vendor to be selected",
        82,
        54,
        105
    );
    pdf.setDrawColor(...line);
    pdf.setLineWidth(.3);
    pdf.line(left, 75, right, 75);

    drawInfoBlock(
        "pin",
        "Property Address",
        [wo.address, wo.unit ? `Unit ${wo.unit}` : ""].filter(Boolean).join(", "),
        left,
        84,
        176
    );
    pdf.line(left, 106, right, 106);

    drawInfoBlock(
        "clipboard",
        "Issue Description",
        wo.issue || "-",
        left,
        115,
        176,
        { lines: 3 }
    );
    pdf.line(left, 139, right, 139);

    drawInfoBlock(
        "wrench",
        "Requested Scope",
        wo.scope || "-",
        left,
        148,
        176,
        { lines: 3 }
    );
    pdf.line(left, 174, right, 174);

    /* Site photos */
    drawIcon("camera", left, 183);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...blue);
    pdf.text("SITE PHOTOS", left + 13, 187);

    const photos = normalizePhotos(wo.photos || []);
    const photoY = 192;
    const photoWidth = 56;
    const photoHeight = 40;
    const photoGap = 7;
    for(let index = 0; index < 3; index++){
        const x = left + (index * (photoWidth + photoGap));
        pdf.setFillColor(245, 248, 252);
        pdf.setDrawColor(...line);
        pdf.rect(x, photoY, photoWidth, photoHeight, "FD");

        if(photos[index]){
            try{
                pdf.addImage(
                    photos[index],
                    "JPEG",
                    x,
                    photoY,
                    photoWidth,
                    photoHeight
                );
            }
            catch(error){
                console.error(error);
                pdf.setFont(undefined, "normal");
                pdf.setFontSize(7);
                pdf.setTextColor(...muted);
                pdf.text("Photo unavailable", x + (photoWidth / 2), photoY + 21, {
                    align: "center"
                });
            }
        }
        else{
            pdf.setFont(undefined, "normal");
            pdf.setFontSize(7);
            pdf.setTextColor(...muted);
            pdf.text("No photo", x + (photoWidth / 2), photoY + 21, {
                align: "center"
            });
        }

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...navy);
        pdf.text(`Photo ${index + 1}`, x + (photoWidth / 2), photoY + 45, {
            align: "center"
        });
    }

    pdf.setDrawColor(...line);
    pdf.line(left, 244, right, 244);
    drawInfoBlock(
        "person",
        "Requested By",
        wo.manager || company.companyRep || "-",
        left,
        251,
        176
    );
    pdf.line(left, 272, right, 272);

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...navy);
    pdf.text(
        pdf.splitTextToSize(
            "Please provide your estimate in your own format, including labor, materials, and expected completion timeline.",
            176
        ),
        left,
        282
    );

    if(photos.length > 3){
        pdf.addPage();
        let photoDetailY = drawDocumentHeader(
            pdf,
            company,
            "Additional Site Photos",
            `RFQ ${wo.workOrderNumber || ""}`
        );
        photoDetailY = drawPhotoGrid(
            pdf,
            photos.slice(3),
            "Additional Site Photos",
            photoDetailY + 5
        );
    }

    return pdf;
}

function getDocumentPDF(kind, payload){
    const company = payload.company;

    if(kind === "verification"){
        return buildVerificationPDF(company, payload.verification);
    }

    if(kind === "ownerApproval"){
        return buildOwnerApprovalPDF(company, payload.workOrder);
    }

    if(kind === "quoteRequest"){
        return buildQuoteRequestPDF(company, payload.workOrder);
    }

    return buildWorkOrderPDF(company, payload.workOrder);
}

function getDocumentFileName(kind, payload){
    const workOrder = payload.workOrder || {};
    const verification = payload.verification || {};
    const documentTitles = {
        verification: "Work Order Verification",
        ownerApproval: "Owner Approval",
        quoteRequest: "Quote Request",
        workOrder: "Work Order Authorization"
    };

    const title =
        documentTitles[kind] ||
        documentTitles.workOrder;

    const workOrderNumber =
        kind === "verification"
        ? verification.workOrderNumber
        : workOrder.workOrderNumber;

    const fallback =
        kind === "verification"
        ? verification.address
        : workOrder.address;

    const identifier =
        safeFilePart(
            workOrderNumber ||
            fallback,
            "No_Work_Order_Number"
        );

    return `${safeFilePart(title, "Document")}_${identifier}.pdf`;
}

async function getDocumentPayload(kind){
    if(kind === "verification"){
        return await getVerificationPDFData();
    }

    return await getWorkOrderPDFData();
}

async function saveDocumentPDF(kind){
    const payload = await getDocumentPayload(kind);
    const pdf = getDocumentPDF(kind, payload);
    pdf.save(getDocumentFileName(kind, payload));
}

async function previewDocumentPDF(kind){
    const payload = await getDocumentPayload(kind);
    const pdf = getDocumentPDF(kind, payload);
    return pdf.output("bloburl");
}

/* =========================================
   WORK ORDER PDF
========================================= */

async function generateWorkOrderPDF(){
    await saveDocumentPDF("workOrder");
}

/* =========================================
   VERIFICATION PDF
========================================= */

async function generateVerificationPDF(){
    await saveDocumentPDF("verification");
}

/* =========================================
   OWNER APPROVAL PDF
========================================= */

async function generateOwnerApprovalPDF(){
    await saveDocumentPDF("ownerApproval");
}

/* =========================================
   QUOTE REQUEST PDF
========================================= */

async function generateQuoteRequestPDF(){
    await saveDocumentPDF("quoteRequest");
}
