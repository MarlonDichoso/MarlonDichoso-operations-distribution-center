/* =========================================
   DATABASE CONFIG
========================================= */

const DB_NAME = "PropertyManagementGeneratorDB";
const DB_VERSION = 1;

let db = null;

/* =========================================
   INITIALIZE DATABASE
========================================= */

function initDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            DB_NAME,
            DB_VERSION
        );

        request.onerror = () => {
            console.error(
                "Database failed to open."
            );

            reject();
        };

        request.onsuccess = (event) => {

            db = event.target.result;

            console.log(
                "Database connected."
            );

            resolve(db);

            if (
                window.FieldDocumentSync
            ) {
                window.FieldDocumentSync
                    .start()
                    .then(() => {
                        if (
                            typeof loadArchive ===
                            "function"
                        ) {
                            loadArchive();
                        }
                    })
                    .catch(error => {
                        console.warn(
                            "Shared document sync will retry later.",
                            error
                        );
                    });
            }
        };

        request.onupgradeneeded = (event) => {

            db = event.target.result;

            /* =========================
               WORK ORDERS
            ========================= */

            if (
                !db.objectStoreNames.contains(
                    "workOrders"
                )
            ) {

                const store =
                    db.createObjectStore(
                        "workOrders",
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                store.createIndex(
                    "workOrderNumber",
                    "workOrderNumber",
                    { unique: false }
                );

                store.createIndex(
                    "address",
                    "address",
                    { unique: false }
                );

                store.createIndex(
                    "vendor",
                    "vendor",
                    { unique: false }
                );

                store.createIndex(
                    "status",
                    "status",
                    { unique: false }
                );
            }

            /* =========================
               VERIFICATIONS
            ========================= */

            if (
                !db.objectStoreNames.contains(
                    "verifications"
                )
            ) {

                const store =
                    db.createObjectStore(
                        "verifications",
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                store.createIndex(
                    "workOrderNumber",
                    "workOrderNumber",
                    { unique: false }
                );

                store.createIndex(
                    "address",
                    "address",
                    { unique: false }
                );
            }

            /* =========================
               SETTINGS
            ========================= */

            if (
                !db.objectStoreNames.contains(
                    "settings"
                )
            ) {

                db.createObjectStore(
                    "settings",
                    {
                        keyPath: "id"
                    }
                );
            }

        };

    });

}

/* =========================================
   GENERIC SAVE
========================================= */

function saveRecord(
    storeName,
    data
) {

    if (!data.syncId) {
        data.syncId = crypto.randomUUID();
    }

    return new Promise(
        (resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.add(data);

        request.onsuccess = () => {

            data.id = request.result;

            if (
                window.FieldDocumentSync
            ) {
                window.FieldDocumentSync.push(
                    storeName,
                    data
                );
            }

            resolve(request.result);

        };

        request.onerror = () => {

            reject(request.error);

        };

    });

}

/* =========================================
   UPDATE RECORD
========================================= */

function updateRecord(
    storeName,
    data
) {

    return new Promise(
        (resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const existingRequest =
            store.get(data.id);

        existingRequest.onsuccess = () => {

            const existing =
                existingRequest.result;

            if (!data.syncId) {
                data.syncId =
                    existing?.syncId ||
                    crypto.randomUUID();
            }

            const request =
                store.put(data);

            request.onsuccess = () => {

                if (
                    window.FieldDocumentSync
                ) {
                    window.FieldDocumentSync.push(
                        storeName,
                        data
                    );
                }

                resolve();

            };

            request.onerror = () => {

                reject(request.error);

            };

        };

        existingRequest.onerror = () => {

            reject(existingRequest.error);

        };

    });

}

/* =========================================
   GET RECORD
========================================= */

function getRecord(
    storeName,
    id
) {

    return new Promise(
        (resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readonly"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.get(id);

        request.onsuccess = () => {

            resolve(
                request.result
            );

        };

        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}

/* =========================================
   GET ALL RECORDS
========================================= */

function getAllRecords(
    storeName
) {

    return new Promise(
        (resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readonly"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.getAll();

        request.onsuccess = () => {

            resolve(
                request.result
            );

        };

        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}

/* =========================================
   DELETE RECORD
========================================= */

function deleteRecord(
    storeName,
    id
) {

    return new Promise(
        (resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const existingRequest =
            store.get(id);

        existingRequest.onsuccess = () => {

            const existing =
                existingRequest.result;

            const request =
                store.delete(id);

            request.onsuccess = () => {

                if (
                    window.FieldDocumentSync
                ) {
                    window.FieldDocumentSync.remove(
                        storeName,
                        existing
                    );
                }

                resolve();

            };

            request.onerror = () => {

                reject(
                    request.error
                );

            };

        };

        existingRequest.onerror = () => {

            reject(
                existingRequest.error
            );

        };

    });

}

/* =========================================
   SIMPLE SEARCH
========================================= */

async function searchRecords(
    storeName,
    term
) {

    const records =
        await getAllRecords(
            storeName
        );

    term =
        term.toLowerCase();

    return records.filter(
        record => {

        return JSON.stringify(
            record
        )
        .toLowerCase()
        .includes(term);

    });

}

/* =========================================
   EXPORT DATABASE
========================================= */

async function exportDatabase() {

    const backup = {

        exported:
            new Date()
            .toISOString(),

        workOrders:
            await getAllRecords(
                "workOrders"
            ),

        verifications:
            await getAllRecords(
                "verifications"
            ),

        settings:
            await getAllRecords(
                "settings"
            )

    };

    const blob =
        new Blob(
            [
                JSON.stringify(
                    backup,
                    null,
                    2
                )
            ],
            {
                type:
                "application/json"
            }
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        URL.createObjectURL(
            blob
        );

    link.download =
        "PropertyManagementBackup.json";

    link.click();

}

/* =========================================
   IMPORT DATABASE
========================================= */

async function importDatabase(
    file
) {

    const text =
        await file.text();

    const backup =
        JSON.parse(text);

    for (
        const record
        of backup.workOrders || []
    ) {

        await saveRecord(
            "workOrders",
            record
        );

    }

    for (
        const record
        of backup.verifications || []
    ) {

        await saveRecord(
            "verifications",
            record
        );

    }

    for (
        const record
        of backup.settings || []
    ) {

        await updateRecord(
            "settings",
            record
        );

    }

    alert(
        "Backup imported successfully."
    );

}

/* =========================================
   CLEAR DATABASE
========================================= */

function clearStore(
    storeName
) {

    return new Promise(
        (resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.clear();

        request.onsuccess = () => {

            resolve();

        };

        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}
